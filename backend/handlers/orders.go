package handlers

import (
	"backend/config"
	// "backend/models"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// Fetch Orders for a Given Month
// func GetOrders(w http.ResponseWriter, r *http.Request) {
// 	query := r.URL.Query()
// 	customerID := query.Get("customer_id")
// 	month := query.Get("month")
// 	year := query.Get("year")

// 	if customerID == "" || month == "" || year == "" {
// 		http.Error(w, "Missing required parameters", http.StatusBadRequest)
// 		return
// 	}

// 	yearInt, monthInt := year, month
// 	layout := "2006-01-02"
// 	startDate, _ := time.Parse(layout, fmt.Sprintf("%s-%s-01", yearInt, monthInt))
// 	endDate := startDate.AddDate(0, 1, -1) // Last day of the month

// 	// Fetch default orders
// 	defaultOrdersQuery := `
// 		SELECT product_id, quantity
// 		FROM default_order_items
// 		WHERE user_id = $1
// 	`
// 	rows, err := config.DB.Query(defaultOrdersQuery, customerID)
// 	if err != nil {
// 		http.Error(w, "Failed to fetch default orders", http.StatusInternalServerError)
// 		return
// 	}
// 	defer rows.Close()

// 	defaultOrders := make(map[string]models.DefaultOrderItem)
// 	for rows.Next() {
// 		var item models.DefaultOrderItem
// 		err := rows.Scan(&item.ProductID, &item.Quantity)
// 		if err != nil {
// 			http.Error(w, "Error scanning default orders", http.StatusInternalServerError)
// 			return
// 		}
// 		defaultOrders[item.ProductID] = item
// 	}

// 	// Construct the response for each day of the month
// 	var response []map[string]interface{}

// 	for date := startDate; !date.After(endDate); date = date.AddDate(0, 0, 1) {
// 		dayOrders := []map[string]interface{}{}

// 		// Fetch the latest modified order_id for this date
// 		var orderID string
// 		err := config.DB.QueryRow(`
// 			SELECT order_id FROM order_modifications
// 			WHERE user_id = $1 AND start_date <= $2 AND end_date >= $2
// 			ORDER BY created_at DESC LIMIT 1;
// 		`, customerID, date.Format(layout)).Scan(&orderID)

// 		if err == nil { // If a modified order exists, fetch products from modifications
// 			modRows, err := config.DB.Query(`
// 				SELECT product_id, modified_quantity FROM order_modifications WHERE order_id = $1;
// 			`, orderID)

// 			if err != nil {
// 				http.Error(w, "Failed to fetch modified orders", http.StatusInternalServerError)
// 				return
// 			}
// 			defer modRows.Close()

// 			for modRows.Next() {
// 				var productID string
// 				var modifiedQuantity float64
// 				if err := modRows.Scan(&productID, &modifiedQuantity); err != nil {
// 					http.Error(w, "Error scanning modified orders", http.StatusInternalServerError)
// 					return
// 				}
// 				if modifiedQuantity > 0 {
// 					dayOrders = append(dayOrders, map[string]interface{}{
// 						"product_id": productID,
// 						"quantity":  modifiedQuantity,
// 					})
// 				}
// 			}
// 		} else { // If no modified order exists, use default orders
// 			for productID, defaultOrder := range defaultOrders {
// 				if defaultOrder.Quantity > 0 {
// 					dayOrders = append(dayOrders, map[string]interface{}{
// 						"product_id": productID,
// 						"quantity":  defaultOrder.Quantity,
// 					})
// 				}
// 			}
// 		}

// 		response = append(response, map[string]interface{}{
// 			"date":   date.Format("2006-01-02"),
// 			"orders": dayOrders,
// 		})
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(response)
// }

// GetOrders handles fetching daily order summaries for a user for a given month and year.
// It supports normal and alternating default orders plus their respective modifications.
// For alternating modifications, it filters products by day_type (ODD/EVEN) computed from each modification's start_date.


func GetOrders(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	customerID := query.Get("customer_id")
	month := query.Get("month")
	year := query.Get("year")
	// log.Printf(customerID)
	if customerID == "" || month == "" || year == "" {
		http.Error(w, "Missing required parameters", http.StatusBadRequest)
		return
	}
	// 1) Compute month range
	yearInt, monthInt := year, month
	layout := "2006-01-02"
	startDate, _ := time.Parse(layout, fmt.Sprintf("%s-%s-01", yearInt, monthInt))
	endDate := startDate.AddDate(0, 1, -1) // Last day of the month
    // 2) Check if user uses alternating default orders
    var isAlt bool
    if err := config.DB.
        QueryRow(`SELECT is_alternating_order FROM users WHERE user_id = $1`, customerID).
        Scan(&isAlt); err != nil {
        http.Error(w, "Failed to determine order type", http.StatusInternalServerError)
        return
    }

    // 3) Global reference date for alternating defaults
     globalRef := time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC)
	
	

    // 4) Preload default orders
    //    - Normal: simple map[product_id]→quantity
    //    - Alternating: map[dayType]→map[product_id]→quantity
    normalDefaults := make(map[string]float64)
    altDefaults    := make(map[string]map[string]float64)

    if isAlt {
        rows, err := config.DB.Query(`
            SELECT product_id, quantity, day_type
              FROM alternating_default_order_items
             WHERE user_id = $1
        `, customerID)
        if err != nil {
            http.Error(w, "Failed loading alternating defaults", http.StatusInternalServerError)
            return
        }
        defer rows.Close()

        for rows.Next() {
            var pid, dt string
            var qty float64
            if err := rows.Scan(&pid, &qty, &dt); err != nil {
                http.Error(w, "Scan alternating defaults", http.StatusInternalServerError)
                return
            }
            if altDefaults[dt] == nil {
                altDefaults[dt] = make(map[string]float64)
            }
            altDefaults[dt][pid] = qty
        }

    } else {
        rows, err := config.DB.Query(`
            SELECT product_id, quantity
              FROM default_order_items
             WHERE user_id = $1
        `, customerID)
        if err != nil {
            http.Error(w, "Failed loading normal defaults", http.StatusInternalServerError)
            return
        }
        defer rows.Close()

        for rows.Next() {
            var pid string
            var qty float64
            if err := rows.Scan(&pid, &qty); err != nil {
                http.Error(w, "Scan normal defaults", http.StatusInternalServerError)
                return
            }
            normalDefaults[pid] = qty
        }
    }


	// Construct the response for each day of the month
	var response []map[string]interface{}

	for date := startDate; !date.After(endDate); date = date.AddDate(0, 0, 1) {
		dayOrders := []map[string]interface{}{}
		curr := date.Format(layout)
		// Fetch the latest modified order_id for this date
		var (
			modOrderID string
			modCreated time.Time
			modStart   string
			modDayType sql.NullString
			srcTable   string
		)
		err := config.DB.QueryRow(`
			SELECT order_id, created_at, start_date, NULL AS day_type, 'normal' AS tbl
			  FROM order_modifications
			 WHERE user_id=$1
			   AND $2 BETWEEN start_date AND end_date

			UNION ALL

			SELECT order_id, created_at, start_date, day_type, 'alt' AS tbl
			  FROM alternating_order_modifications
			 WHERE user_id=$1
			   AND $2 BETWEEN start_date AND end_date

			ORDER BY created_at DESC
			LIMIT 1
		`, customerID, curr).Scan(&modOrderID, &modCreated, &modStart, &modDayType, &srcTable)

		if err == nil { // If a modified order exists, fetch products from modifications
				
			switch srcTable {
			case "normal":
				rows, _ := config.DB.Query(`
					SELECT product_id, modified_quantity
					  FROM order_modifications
					 WHERE order_id=$1
				`, modOrderID)
				defer rows.Close()
				for rows.Next() {
					var pid string; var qty float64
					rows.Scan(&pid, &qty)
					if qty > 0 {
						dayOrders = append(dayOrders, map[string]interface{}{
							"product_id": pid,
							"quantity":   qty,
						})
					}
				}

			case "alt":
				// parse the start_date we scanned into modStart
				startRef, err := time.Parse(time.RFC3339, modStart)
				if err != nil {
					log.Printf("invalid start_date %q: %v", modStart, err)
				} else {
					todayType := getDayType(startRef, date)
					// log.Printf("alt mod start=%s → startRef=%s → todayType=%s",
					// 	modStart, startRef.Format(layout), todayType)

					rows, err := config.DB.Query(`
						SELECT product_id, modified_quantity
						FROM alternating_order_modifications
						WHERE order_id = $1
						AND day_type = $2
					`, modOrderID, todayType)
					if err != nil {
						log.Printf("query error for alt mods: %v", err)
					} else {
						defer rows.Close()
						for rows.Next() {
							var pid string
							var qty float64
							rows.Scan(&pid, &qty)
							// log.Printf("   alt row: pid=%s, qty=%f", pid, qty)
							if qty > 0 {
								dayOrders = append(dayOrders, map[string]interface{}{
									"product_id": pid,
									"quantity":   qty,
								})
							}
						}
					}
				}

			}

		} else { // If no modified order exists, use default orders
				if isAlt {
				// fallback to alternating default for this date
				dayType := getDayType(globalRef, date)
				for pid, qty := range altDefaults[dayType] {
					if qty > 0 {
						dayOrders = append(dayOrders, map[string]interface{}{
							"product_id": pid,
							"quantity":   qty,
						})
					}
				}
			} else {
				// fallback to normal default
				for pid, qty := range normalDefaults {
					if qty > 0 {
						dayOrders = append(dayOrders, map[string]interface{}{
							"product_id": pid,
							"quantity":   qty,
						})
					}
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

func getDayType(ref, curr time.Time) string {
    diff := int(curr.Sub(ref).Hours() / 24)
    if diff%2 == 0 {
        return "EVEN"
    }
    return "ODD"
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
    var req struct {
        UserID    string `json:"user_id"`
        StartDate string `json:"start_date"`
        EndDate   string `json:"end_date"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request format", http.StatusBadRequest)
        return
    }

    // 1) generate a new order_id for this pause batch
    var orderID string
    if err := config.DB.QueryRow("SELECT gen_random_uuid()").Scan(&orderID); err != nil {
        http.Error(w, "Failed to generate order ID", http.StatusInternalServerError)
        return
    }

    // 2) check if user uses alternating orders
    var isAlt bool
    if err := config.DB.QueryRow(`
        SELECT is_alternating_order FROM users WHERE user_id = $1
    `, req.UserID).Scan(&isAlt); err != nil {
        http.Error(w, "Failed to check order type", http.StatusInternalServerError)
        return
    }

    // 3) fetch any one product_id from the appropriate default table
    var productID string
    var query string
    if isAlt {
        query = `
            SELECT product_id
              FROM alternating_default_order_items
             WHERE user_id = $1
             LIMIT 1
        `
    } else {
        query = `
            SELECT product_id
              FROM default_order_items
             WHERE user_id = $1
             LIMIT 1
        `
    }
    if err := config.DB.QueryRow(query, req.UserID).Scan(&productID); err != nil {
        http.Error(w, "Failed to fetch product ID", http.StatusInternalServerError)
        return
    }

    // 4) insert the pause (modified_quantity = 0)
    if _, err := config.DB.Exec(`
        INSERT INTO order_modifications (
            modification_id, order_id, user_id,
            product_id, modified_quantity,
            start_date, end_date, created_at
        ) VALUES (
            gen_random_uuid(), $1, $2,
            $3, 0,
            $4, $5, NOW()
        )
    `, orderID, req.UserID, productID, req.StartDate, req.EndDate); err != nil {
        log.Printf("Error inserting pause entry: %v\n", err)
        http.Error(w, "Failed to pause order", http.StatusInternalServerError)
        return
    }

    fmt.Fprintln(w, "Order paused successfully!")
}




// ResumeOrder Handler
func ResumeOrder(w http.ResponseWriter, r *http.Request) {
    var req struct {
        UserID    string `json:"user_id"`
        StartDate string `json:"start_date"` // e.g. "2025-06-10"
        EndDate   string `json:"end_date"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request format", http.StatusBadRequest)
        return
    }

    const layout = "2006-01-02"
    // parse the day you’re resuming
    parsedStart, err := time.Parse(layout, req.StartDate)
    if err != nil {
        http.Error(w, "Invalid start_date", http.StatusBadRequest)
        return
    }

    // 1) generate a new order_id for this resume batch
    var orderID string
    if err := config.DB.QueryRow("SELECT gen_random_uuid()").Scan(&orderID); err != nil {
        http.Error(w, "Failed to generate order ID", http.StatusInternalServerError)
        return
    }

    // 2) check if user uses alternating orders
    var isAlt bool
    if err := config.DB.QueryRow(
        `SELECT is_alternating_order FROM users WHERE user_id = $1`,
        req.UserID,
    ).Scan(&isAlt); err != nil {
        http.Error(w, "Failed to check order type", http.StatusInternalServerError)
        return
    }

    // hard‐coded global ref for alternating defaults
    globalRef := time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC)

    if isAlt {
        // 3a) compute ODD/EVEN for parsedStart
        dayType := getDayType(globalRef, parsedStart)

        // 3b) fetch only that day_type’s products
        rows, err := config.DB.Query(`
            SELECT product_id, quantity
              FROM alternating_default_order_items
             WHERE user_id = $1
               AND day_type = $2
        `, req.UserID, dayType)
        if err != nil {
            http.Error(w, "Failed to fetch alternating defaults", http.StatusInternalServerError)
            return
        }
        defer rows.Close()

        // 3c) insert each into alternating_order_modifications
        for rows.Next() {
            var pid string
            var qty float64
            if err := rows.Scan(&pid, &qty); err != nil {
                http.Error(w, "Error scanning alternating defaults", http.StatusInternalServerError)
                return
            }
            if _, err := config.DB.Exec(`
                INSERT INTO order_modifications (
                    modification_id, order_id, user_id,
                    product_id, modified_quantity,
                    start_date, end_date, created_at
                ) VALUES (
                    gen_random_uuid(), $1, $2,
                    $3, $4, 
					$5,$6, NOW()
                )
            `, orderID, req.UserID, pid, qty, req.StartDate, req.EndDate); err != nil {
                log.Printf("Error inserting alternating resume: %v\n", err)
                http.Error(w, "Failed to resume alternating order", http.StatusInternalServerError)
                return
            }
        }

    } else {
        // 3d) normal: fetch all products
        rows, err := config.DB.Query(`
            SELECT product_id, quantity
              FROM default_order_items
             WHERE user_id = $1
        `, req.UserID)
        if err != nil {
            http.Error(w, "Failed to fetch default order items", http.StatusInternalServerError)
            return
        }
        defer rows.Close()

        // 3e) insert each into order_modifications
        for rows.Next() {
            var pid string
            var qty float64
            if err := rows.Scan(&pid, &qty); err != nil {
                http.Error(w, "Error scanning default order items", http.StatusInternalServerError)
                return
            }
            if _, err := config.DB.Exec(`
                INSERT INTO order_modifications (
                    modification_id, order_id, user_id,
                    product_id, modified_quantity,
                    start_date, end_date, created_at
                ) VALUES (
                    gen_random_uuid(), $1, $2,
                    $3, $4,
                    $5, $6, NOW()
                )
            `, orderID, req.UserID, pid, qty, req.StartDate, req.EndDate); err != nil {
                log.Printf("Error inserting resumed order: %v\n", err)
                http.Error(w, "Failed to resume order", http.StatusInternalServerError)
                return
            }
        }
    }

    fmt.Fprintln(w, "Order resumed successfully!")
}


// func ResumeOrder(w http.ResponseWriter, r *http.Request) {
// 	var request struct {
// 		UserID    string `json:"user_id"`
// 		StartDate string `json:"start_date"`
// 		EndDate   string `json:"end_date"`
// 	}

// 	err := json.NewDecoder(r.Body).Decode(&request)
// 	if err != nil {
// 		http.Error(w, "Invalid request format", http.StatusBadRequest)
// 		return
// 	}

// 	// Fetch Default Order Items for the User
// 	rows, err := config.DB.Query(`
// 		SELECT product_id, quantity FROM default_order_items
// 		WHERE user_id = $1
// 	`, request.UserID)

// 	if err != nil {
// 		log.Printf("Error fetching default order items: %v\n", err)
// 		http.Error(w, "Failed to fetch default order items", http.StatusInternalServerError)
// 		return
// 	}
// 	defer rows.Close()

// 	// Generate a new unique Order ID for this resume batch
// 	var orderID string
// 	err = config.DB.QueryRow("SELECT gen_random_uuid()").Scan(&orderID)
// 	if err != nil {
// 		http.Error(w, "Failed to generate order ID", http.StatusInternalServerError)
// 		return
// 	}

// 	// Insert Each Product into Order Modifications
// 	for rows.Next() {
// 		var item models.DefaultOrderItem
// 		err := rows.Scan(&item.ProductID, &item.Quantity)
// 		if err != nil {
// 			http.Error(w, "Error scanning default order items", http.StatusInternalServerError)
// 			return
// 		}

// 		_, err = config.DB.Exec(`
// 			INSERT INTO order_modifications (modification_id, order_id, user_id, product_id, modified_quantity, start_date, end_date, created_at)
// 			VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
// 		`, orderID, request.UserID, item.ProductID, item.Quantity, request.StartDate, request.EndDate)

// 		if err != nil {
// 			log.Printf("Error inserting resumed order: %v\n", err)
// 			http.Error(w, "Failed to resume order", http.StatusInternalServerError)
// 			return
// 		}
// 	}

// 	fmt.Fprintln(w, "Order resumed successfully!")
// }
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


func ModifyAlternatingOrder(w http.ResponseWriter, r *http.Request) {
	var request struct {
		UserID    string `json:"user_id"`
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
		Products  []struct {
			ProductID string  `json:"product_id"`
			Quantity  float64 `json:"quantity"`
			DayType   string  `json:"day_type"` // "ODD", "EVEN", or "CUSTOM"
		} `json:"products"`
	}

	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}
	var orderID string
	err = config.DB.QueryRow("SELECT gen_random_uuid()").Scan(&orderID)
	if err != nil {
		http.Error(w, "Failed to generate order ID", http.StatusInternalServerError)
		return
	}

	// Insert each product-specific modification
	for _, p := range request.Products {
		if p.DayType != "ODD" && p.DayType != "EVEN" && p.DayType != "CUSTOM" {
			http.Error(w, "Invalid day_type: must be ODD, EVEN, or CUSTOM", http.StatusBadRequest)
			return
		}

		_, err := config.DB.Exec(`
			INSERT INTO alternating_order_modifications (
				modification_id,
				order_id,
				user_id,
				product_id,
				modified_quantity,
				start_date,
				end_date,
				day_type,
				created_at
			)
			VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6,$7, NOW())
		`, orderID, request.UserID, p.ProductID, p.Quantity, request.StartDate, request.EndDate, p.DayType)

		if err != nil {
			log.Printf("Error inserting alternating modification: %v\n", err)
			http.Error(w, "Failed to modify alternating order", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Alternating order modified successfully"})
}
