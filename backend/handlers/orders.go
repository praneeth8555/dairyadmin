package handlers

import (
	"backend/config"
	"backend/models"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// Fetch Orders for a Given Month
func GetOrders(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	customerID := query.Get("customer_id")
	month := query.Get("month")
	year := query.Get("year")

	if customerID == "" || month == "" || year == "" {
		http.Error(w, "Missing required parameters", http.StatusBadRequest)
		return
	}

	yearInt, monthInt := year, month
	layout := "2006-01-02"
	startDate, _ := time.Parse(layout, fmt.Sprintf("%s-%s-01", yearInt, monthInt))
	endDate := startDate.AddDate(0, 1, -1) // Last day of the month

	// Fetch default orders
	defaultOrdersQuery := `
		SELECT product_id, quantity
		FROM default_order_items
		WHERE user_id = $1
	`
	rows, err := config.DB.Query(defaultOrdersQuery, customerID)
	if err != nil {
		http.Error(w, "Failed to fetch default orders", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	defaultOrders := make(map[string]models.DefaultOrderItem)
	for rows.Next() {
		var item models.DefaultOrderItem
		err := rows.Scan(&item.ProductID, &item.Quantity)
		if err != nil {
			http.Error(w, "Error scanning default orders", http.StatusInternalServerError)
			return
		}
		defaultOrders[item.ProductID] = item
	}

	// Construct the response for each day of the month
	var response []map[string]interface{}

	for date := startDate; !date.After(endDate); date = date.AddDate(0, 0, 1) {
		dayOrders := []map[string]interface{}{}

		// Fetch the latest modified order_id for this date
		var orderID string
		err := config.DB.QueryRow(`
			SELECT order_id FROM order_modifications
			WHERE user_id = $1 AND start_date <= $2 AND end_date >= $2
			ORDER BY created_at DESC LIMIT 1;
		`, customerID, date.Format(layout)).Scan(&orderID)

		if err == nil { // If a modified order exists, fetch products from modifications
			modRows, err := config.DB.Query(`
				SELECT product_id, modified_quantity FROM order_modifications WHERE order_id = $1;
			`, orderID)

			if err != nil {
				http.Error(w, "Failed to fetch modified orders", http.StatusInternalServerError)
				return
			}
			defer modRows.Close()

			for modRows.Next() {
				var productID string
				var modifiedQuantity float64
				if err := modRows.Scan(&productID, &modifiedQuantity); err != nil {
					http.Error(w, "Error scanning modified orders", http.StatusInternalServerError)
					return
				}
				if modifiedQuantity > 0 {
					dayOrders = append(dayOrders, map[string]interface{}{
						"product_id": productID,
						"quantity":  modifiedQuantity,
					})
				}
			}
		} else { // If no modified order exists, use default orders
			for productID, defaultOrder := range defaultOrders {
				if defaultOrder.Quantity > 0 {
					dayOrders = append(dayOrders, map[string]interface{}{
						"product_id": productID,
						"quantity":  defaultOrder.Quantity,
					})
				}
			}
		}

		response = append(response, map[string]interface{}{
			"date":   date.Format("2006-01-02"),
			"orders": dayOrders,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func ModifyOrder(w http.ResponseWriter, r *http.Request) {
	var request struct {
		UserID    string `json:"user_id"`
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
		Orders    []struct {
			ProductID        string  `json:"product_id"`
			ModifiedQuantity float64 `json:"quantity"`
		} `json:"orders"`
	}

	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Generate a unique order_id for this batch
	var orderID string
	err = config.DB.QueryRow("SELECT gen_random_uuid()").Scan(&orderID)
	if err != nil {
		http.Error(w, "Failed to generate order ID", http.StatusInternalServerError)
		return
	}

	// Insert each modified product into order_modifications
	for _, order := range request.Orders {
		_, err := config.DB.Exec(`
			INSERT INTO order_modifications (modification_id, order_id, user_id, product_id, modified_quantity, start_date, end_date, created_at)
			VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
		`, orderID, request.UserID, order.ProductID, order.ModifiedQuantity, request.StartDate, request.EndDate)

		if err != nil {
			log.Printf("Error inserting modification: %v\n", err)
			http.Error(w, "Failed to modify order", http.StatusInternalServerError)
			return
		}
	}

	fmt.Fprintln(w, "Order modified successfully!")
}


// Pause Order
func PauseOrder(w http.ResponseWriter, r *http.Request) {
	var request struct {
		UserID    string `json:"user_id"`
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
	}

	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Generate a unique order_id for this pause batch
	var orderID string
	err = config.DB.QueryRow("SELECT gen_random_uuid()").Scan(&orderID)
	if err != nil {
		http.Error(w, "Failed to generate order ID", http.StatusInternalServerError)
		return
	}

	// Fetch any one product_id from the user's default order
	var productID string
	err = config.DB.QueryRow(`
		SELECT product_id FROM default_order_items
		WHERE user_id = $1
		LIMIT 1
	`, request.UserID).Scan(&productID)

	if err != nil {
		http.Error(w, "Failed to fetch product ID", http.StatusInternalServerError)
		return
	}

	// Insert pause entry with a valid product_id
	_, err = config.DB.Exec(`
		INSERT INTO order_modifications (modification_id, order_id, user_id, product_id, modified_quantity, start_date, end_date, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, 0, $4, $5, NOW())
	`, orderID, request.UserID, productID, request.StartDate, request.EndDate)

	if err != nil {
		log.Printf("Error inserting pause entry: %v\n", err)
		http.Error(w, "Failed to pause order", http.StatusInternalServerError)
		return
	}

	fmt.Fprintln(w, "Order paused successfully!")
}



// ResumeOrder Handler
func ResumeOrder(w http.ResponseWriter, r *http.Request) {
	var request struct {
		UserID    string `json:"user_id"`
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
	}

	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Fetch Default Order Items for the User
	rows, err := config.DB.Query(`
		SELECT product_id, quantity FROM default_order_items
		WHERE user_id = $1
	`, request.UserID)

	if err != nil {
		log.Printf("Error fetching default order items: %v\n", err)
		http.Error(w, "Failed to fetch default order items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Generate a new unique Order ID for this resume batch
	var orderID string
	err = config.DB.QueryRow("SELECT gen_random_uuid()").Scan(&orderID)
	if err != nil {
		http.Error(w, "Failed to generate order ID", http.StatusInternalServerError)
		return
	}

	// Insert Each Product into Order Modifications
	for rows.Next() {
		var item models.DefaultOrderItem
		err := rows.Scan(&item.ProductID, &item.Quantity)
		if err != nil {
			http.Error(w, "Error scanning default order items", http.StatusInternalServerError)
			return
		}

		_, err = config.DB.Exec(`
			INSERT INTO order_modifications (modification_id, order_id, user_id, product_id, modified_quantity, start_date, end_date, created_at)
			VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
		`, orderID, request.UserID, item.ProductID, item.Quantity, request.StartDate, request.EndDate)

		if err != nil {
			log.Printf("Error inserting resumed order: %v\n", err)
			http.Error(w, "Failed to resume order", http.StatusInternalServerError)
			return
		}
	}

	fmt.Fprintln(w, "Order resumed successfully!")
}


// ClearExpiredOrderModifications deletes records where end_date < sent_date
func ClearExpiredOrderModifications(w http.ResponseWriter, r *http.Request) {
	// Ensure it's a DELETE request
	if r.Method != http.MethodDelete {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	// Get the 'date' parameter from the query string
	sentDate := r.URL.Query().Get("date")

	if sentDate == "" {
		http.Error(w, `{"error": "Missing required date parameter"}`, http.StatusBadRequest)
		return
	}

	// Prepare the delete query
	query := `DELETE FROM order_modifications WHERE end_date < $1`
	result, err := config.DB.Exec(query, sentDate)

	if err != nil {
		log.Printf("Error deleting expired order modifications: %v\n", err)
		http.Error(w, `{"error": "Failed to delete expired records"}`, http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()

	// Create JSON response
	response := map[string]interface{}{
		"message":       "Expired order modifications deleted successfully",
		"rows_affected": rowsAffected,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}