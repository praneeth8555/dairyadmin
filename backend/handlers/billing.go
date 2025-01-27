package handlers

import (
	"backend/config"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// GetMonthlyBill Handler
func GetMonthlyBill(w http.ResponseWriter, r *http.Request) {
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

	defaultOrders := make(map[string]float64)
	for rows.Next() {
		var productID string
		var quantity float64
		err := rows.Scan(&productID, &quantity)
		if err != nil {
			http.Error(w, "Error scanning default orders", http.StatusInternalServerError)
			return
		}
		defaultOrders[productID] = quantity
	}

	// Initialize monthly bill details
	var billDetails []map[string]interface{}
	totalMonthlyBill := 0.0

	// Iterate through each date of the month
	for date := startDate; !date.After(endDate); date = date.AddDate(0, 0, 1) {
		dayOrders := make(map[string]float64)

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
				if modifiedQuantity > 0 { // Skip paused orders
					dayOrders[productID] = modifiedQuantity
				}
			}
		} else { // If no modified order exists, use default orders
			for productID, quantity := range defaultOrders {
				if quantity > 0 {
					dayOrders[productID] = quantity
				}
			}
		}

		// Calculate cost per product for this date
		dayTotalBill := 0.0
		dayProducts := []map[string]interface{}{}

		for productID, quantity := range dayOrders {
			var pricePerUnit float64
			priceFetchError := false

			// Try fetching the latest price from `product_price_history`
			err := config.DB.QueryRow(`
				SELECT new_price FROM product_price_history 
				WHERE product_id = $1 AND effective_from <= $2
				ORDER BY effective_from DESC LIMIT 1;
			`, productID, date.Format(layout)).Scan(&pricePerUnit)

			if err != nil { // If no history found, fetch the first old_price
				err = config.DB.QueryRow(`
					SELECT old_price FROM product_price_history 
					WHERE product_id = $1
					ORDER BY effective_from ASC LIMIT 1;
				`, productID).Scan(&pricePerUnit)

				if err != nil { // If no price history at all, get `current_price` from `products`
					err = config.DB.QueryRow(`
						SELECT current_price FROM products WHERE product_id = $1;
					`, productID).Scan(&pricePerUnit)

					if err != nil {
						log.Printf("⚠️ No price history found for product %s. Using default price.\n", productID)
						priceFetchError = true
					}
				}
			}

			// If no price is found even after checking `products`, set price to 0
			if priceFetchError {
				pricePerUnit = 0.0
			}

			totalCost := pricePerUnit * quantity
			dayTotalBill += totalCost

			dayProducts = append(dayProducts, map[string]interface{}{
				"product_id":    productID,
				"quantity":      quantity,
				"price_per_unit": pricePerUnit,
				"total_price":   totalCost,
			})
		}

		// Add daily summary
		billDetails = append(billDetails, map[string]interface{}{
			"date":      date.Format("2006-01-02"),
			"daybill":   dayTotalBill,
			"products":  dayProducts,
		})

		// Accumulate total monthly bill
		totalMonthlyBill += dayTotalBill
	}

	// Construct response
	response := map[string]interface{}{
		"customer_id":  customerID,
		"month":        month,
		"year":         year,
		"total_bill":   totalMonthlyBill,
		"bill_details": billDetails,
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
