package handlers

import (
	"backend/config"
	"encoding/json"
	
	"log"
	"net/http"
)

// GetDailyOrderSummary Handler
func GetDailyOrderSummary(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	apartmentID := query.Get("apartment_id")
	date := query.Get("date")

	if apartmentID == "" || date == "" {
		http.Error(w, "Missing required parameters", http.StatusBadRequest)
		return
	}

	// Fetch users in the apartment ordered by priority_order ASC
	userRows, err := config.DB.Query(`
		SELECT user_id, name, room_number, priority_order 
		FROM users 
		WHERE apartment_id = $1 
		ORDER BY priority_order ASC
	`, apartmentID)
	if err != nil {
		log.Printf("Error fetching users: %v\n", err)
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer userRows.Close()

	var userOrders []map[string]interface{}

	// Iterate through users
	for userRows.Next() {
		var userID, name, roomNumber string
		var priorityOrder int
		err := userRows.Scan(&userID, &name, &roomNumber, &priorityOrder)
		if err != nil {
			http.Error(w, "Error scanning users", http.StatusInternalServerError)
			return
		}

		// Fetch the latest modified order_id for this user on the given date
		var orderID string
		err = config.DB.QueryRow(`
			SELECT order_id FROM order_modifications
			WHERE user_id = $1 AND start_date <= $2 AND end_date >= $2
			ORDER BY created_at DESC LIMIT 1;
		`, userID, date).Scan(&orderID)

		// Store the orders for this user
		userOrderItems := []map[string]interface{}{}

		if err == nil { // If a modified order exists, fetch products from modifications
			modRows, err := config.DB.Query(`
				SELECT product_id, modified_quantity 
				FROM order_modifications
				WHERE order_id = $1;
			`, orderID)

			if err != nil {
				http.Error(w, "Error fetching modified orders", http.StatusInternalServerError)
				return
			}
			defer modRows.Close()

			for modRows.Next() {
				var productID string
				var quantity float64
				err := modRows.Scan(&productID, &quantity)
				if err != nil {
					http.Error(w, "Error scanning modified orders", http.StatusInternalServerError)
					return
				}
				// Only add orders that are not paused
				if quantity > 0 {
					userOrderItems = append(userOrderItems, map[string]interface{}{
						"product_id": productID,
						"quantity":   quantity,
					})
				}
			}
		} else { // If no modifications, fetch default orders
			defaultRows, err := config.DB.Query(`
				SELECT product_id, quantity 
				FROM default_order_items
				WHERE user_id = $1
			`, userID)

			if err != nil {
				http.Error(w, "Error fetching default orders", http.StatusInternalServerError)
				return
			}
			defer defaultRows.Close()

			for defaultRows.Next() {
				var productID string
				var quantity float64
				err := defaultRows.Scan(&productID, &quantity)
				if err != nil {
					http.Error(w, "Error scanning default orders", http.StatusInternalServerError)
					return
				}
				userOrderItems = append(userOrderItems, map[string]interface{}{
					"product_id": productID,
					"quantity":   quantity,
				})
			}
		}

		// Add user and orders to response
		userOrders = append(userOrders, map[string]interface{}{
			"user_id":       userID,
			"name":          name,
			"room_number":   roomNumber,
			"priority_order": priorityOrder, // Including priority order in response
			"orders":        userOrderItems,
		})
	}

	// Construct response
	response := map[string]interface{}{
		"apartment_id": apartmentID,
		"date":         date,
		"user_orders":  userOrders,
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetDailyTotalSummary Handler

// GetDailyTotalSummary Handler
func GetDailyTotalSummary(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	apartmentID := query.Get("apartment_id")
	date := query.Get("date")

	if apartmentID == "" || date == "" {
		http.Error(w, "Missing required parameters", http.StatusBadRequest)
		return
	}

	// Fetch all users in the apartment
	userRows, err := config.DB.Query(`
		SELECT user_id FROM users WHERE apartment_id = $1
	`, apartmentID)
	if err != nil {
		log.Printf("Error fetching users: %v\n", err)
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer userRows.Close()

	userIDs := []string{}
	for userRows.Next() {
		var userID string
		err := userRows.Scan(&userID)
		if err != nil {
			http.Error(w, "Error scanning users", http.StatusInternalServerError)
			return
		}
		userIDs = append(userIDs, userID)
	}

	if len(userIDs) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"apartment_id": apartmentID,
			"date":         date,
			"totals":       []map[string]interface{}{},
		})
		return
	}

	// Fetch the latest modified order_id for each user on the given date
	modifiedTotals := make(map[string]float64)

	for _, userID := range userIDs {
		var orderID string
		err = config.DB.QueryRow(`
			SELECT order_id FROM order_modifications
			WHERE user_id = $1 AND start_date <= $2 AND end_date >= $2
			ORDER BY created_at DESC LIMIT 1;
		`, userID, date).Scan(&orderID)

		if err == nil { // If a modified order exists, fetch products from modifications
			modRows, err := config.DB.Query(`
				SELECT product_id, SUM(modified_quantity)
				FROM order_modifications
				WHERE order_id = $1
				GROUP BY product_id;
			`, orderID)

			if err != nil {
				http.Error(w, "Error fetching modified orders", http.StatusInternalServerError)
				return
			}
			defer modRows.Close()

			for modRows.Next() {
				var productID string
				var totalQuantity float64
				err := modRows.Scan(&productID, &totalQuantity)
				if err != nil {
					http.Error(w, "Error scanning modified orders", http.StatusInternalServerError)
					return
				}
				modifiedTotals[productID] += totalQuantity
			}
		}
	}

	// Fetch default orders for users who do not have modifications
	defaultTotals := make(map[string]float64)

	for _, userID := range userIDs {
		defaultRows, err := config.DB.Query(`
			SELECT product_id, SUM(quantity)
			FROM default_order_items
			WHERE user_id = $1
			AND product_id NOT IN (
				SELECT DISTINCT product_id FROM order_modifications WHERE user_id = $1 AND start_date <= $2 AND end_date >= $2
			)
			GROUP BY product_id;
		`, userID, date)

		if err != nil {
			http.Error(w, "Error fetching default orders", http.StatusInternalServerError)
			return
		}
		defer defaultRows.Close()

		for defaultRows.Next() {
			var productID string
			var totalQuantity float64
			err := defaultRows.Scan(&productID, &totalQuantity)
			if err != nil {
				http.Error(w, "Error scanning default orders", http.StatusInternalServerError)
				return
			}
			defaultTotals[productID] += totalQuantity
		}
	}

	// Merge modified and default totals
	finalTotals := []map[string]interface{}{}
	for productID, totalQuantity := range modifiedTotals {
		finalTotals = append(finalTotals, map[string]interface{}{
			"product_id": productID,
			"quantity":   totalQuantity,
		})
	}
	for productID, totalQuantity := range defaultTotals {
		if _, exists := modifiedTotals[productID]; !exists {
			finalTotals = append(finalTotals, map[string]interface{}{
				"product_id": productID,
				"quantity":   totalQuantity,
			})
		}
	}

	// Construct response
	response := map[string]interface{}{
		"apartment_id": apartmentID,
		"date":         date,
		"totals":       finalTotals,
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
