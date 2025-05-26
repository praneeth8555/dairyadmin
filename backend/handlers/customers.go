package handlers

import (
	"backend/config"
	"backend/models"

	// "database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
)

// Get all customers
func GetCustomers(w http.ResponseWriter, r *http.Request) {
	rows, err := config.DB.Query("SELECT user_id, name, apartment_id, room_number, phone_number, email, created_at FROM users ORDER BY created_at DESC")
	if err != nil {
		http.Error(w, "Failed to fetch customers", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var customers []models.User
	for rows.Next() {
		var customer models.User
		err := rows.Scan(&customer.UserID, &customer.Name, &customer.ApartmentID, &customer.RoomNumber, &customer.PhoneNumber, &customer.Email, &customer.CreatedAt)
		if err != nil {
			http.Error(w, "Error scanning customers", http.StatusInternalServerError)
			return
		}
		customers = append(customers, customer)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(customers)
}

func GetApartCustomers(w http.ResponseWriter, r *http.Request) {
	apartmentID := r.URL.Query().Get("apartment_id")
	if apartmentID == "" {
		http.Error(w, "apartment_id is required", http.StatusBadRequest)
		return
	}

	// Query to fetch users from the correct table, sorted by priority_order
	query := `
		SELECT user_id, name, apartment_id, room_number, phone_number, email, created_at, priority_order 
		FROM users 
		WHERE apartment_id = $1 
		ORDER BY priority_order ASC
	`
	rows, err := config.DB.Query(query, apartmentID)

	// Log the actual database error if the query fails
	if err != nil {
		log.Println("Database Query Error:", err)
		http.Error(w, fmt.Sprintf("Failed to fetch users: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Store the users in a slice
	var users []models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(&user.UserID, &user.Name, &user.ApartmentID, &user.RoomNumber, &user.PhoneNumber, &user.Email, &user.CreatedAt, &user.PriorityOrder)
		if err != nil {
			log.Println("Row Scanning Error:", err)
			http.Error(w, "Error scanning users", http.StatusInternalServerError)
			return
		}
		users = append(users, user)
	}

	// Return users in JSON format
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}
// Add a new customer

func CreateCustomer(w http.ResponseWriter, r *http.Request) {
	var customer models.User
	err := json.NewDecoder(r.Body).Decode(&customer)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Fetch last priority (append position)
	var lastPriority int
	err = config.DB.QueryRow("SELECT COALESCE(MAX(priority_order), 0) + 1 FROM users WHERE apartment_id = $1", customer.ApartmentID).Scan(&lastPriority)
	if err != nil {
		log.Printf("Error fetching last priority: %v\n", err)
		http.Error(w, "Failed to determine priority order", http.StatusInternalServerError)
		return
	}

	// If no valid priority_order is specified, assign lastPriority
	if customer.PriorityOrder <= 0 || customer.PriorityOrder >= lastPriority {
		customer.PriorityOrder = lastPriority
	} else {
		// Shift others starting from the given priority
		_, err := config.DB.Exec(`
			UPDATE users
			SET priority_order = priority_order + 1
			WHERE apartment_id = $1 AND priority_order >= $2
		`, customer.ApartmentID, customer.PriorityOrder)

		if err != nil {
			log.Printf("Error shifting priorities: %v\n", err)
			http.Error(w, "Failed to shift priorities", http.StatusInternalServerError)
			return
		}
	}

	// Insert new customer with assigned/updated priority
	_, err = config.DB.Exec(`
		INSERT INTO users (user_id, name, apartment_id, room_number, phone_number, email, priority_order) 
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
	`, customer.Name, customer.ApartmentID, customer.RoomNumber, customer.PhoneNumber, customer.Email, customer.PriorityOrder)

	if err != nil {
		log.Printf("Error inserting customer: %v\n", err)
		http.Error(w, "Failed to add customer", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintln(w, "Customer added successfully!")
}

// func CreateCustomer(w http.ResponseWriter, r *http.Request) {
// 	var customer models.User
// 	err := json.NewDecoder(r.Body).Decode(&customer)
// 	if err != nil {
// 		http.Error(w, "Invalid request format", http.StatusBadRequest)
// 		return
// 	}

// 	// Get the last priority order in the apartment
// 	var lastPriority int
// 	err = config.DB.QueryRow("SELECT COALESCE(MAX(priority_order), 0) + 1 FROM users WHERE apartment_id = $1", customer.ApartmentID).Scan(&lastPriority)
// 	if err != nil {
// 		log.Printf("Error fetching last priority: %v\n", err)
// 		http.Error(w, "Failed to determine priority order", http.StatusInternalServerError)
// 		return
// 	}

// 	// Insert new customer with assigned priority
// 	_, err = config.DB.Exec(`
// 		INSERT INTO users (user_id, name, apartment_id, room_number, phone_number, email, priority_order) 
// 		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
// 		customer.Name, customer.ApartmentID, customer.RoomNumber, customer.PhoneNumber, customer.Email, lastPriority)
	
// 	if err != nil {
// 		log.Printf("Error inserting customer: %v\n", err)
// 		http.Error(w, "Failed to add customer", http.StatusInternalServerError)
// 		return
// 	}

// 	w.WriteHeader(http.StatusCreated)
// 	fmt.Fprintln(w, "Customer added successfully!")
// }



func UpdateCustomer(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	userID := params["id"]

	log.Println(userID)

	var customer models.User

	err := json.NewDecoder(r.Body).Decode(&customer)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	tx, err := config.DB.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}

	// Step 1: Get current priority of this user
	var currentPriority int
	err = tx.QueryRow("SELECT priority_order FROM users WHERE user_id = $1", userID).Scan(&currentPriority)
	if err != nil {
		tx.Rollback()
		http.Error(w, "Customer not found", http.StatusNotFound)
		return
	}

	newPriority := customer.PriorityOrder

	if newPriority != currentPriority {
		// Reorder others
		if newPriority < currentPriority {
			// Shift others down
			_, err = tx.Exec(`
				UPDATE users 
				SET priority_order = priority_order + 1
				WHERE apartment_id = $1 AND priority_order >= $2 AND priority_order < $3 AND user_id != $4
			`, customer.ApartmentID, newPriority, currentPriority, userID)
		} else {
			// Shift others up
			_, err = tx.Exec(`
				UPDATE users 
				SET priority_order = priority_order - 1
				WHERE apartment_id = $1 AND priority_order <= $2 AND priority_order > $3 AND user_id != $4
			`, customer.ApartmentID, newPriority, currentPriority, userID)
		}

		if err != nil {
			tx.Rollback()
			http.Error(w, "Failed to reorder other customers", http.StatusInternalServerError)
			return
		}
	}

	// Step 2: Update this customer
	_, err = tx.Exec(`
		UPDATE users 
		SET name = $1, apartment_id = $2, room_number = $3, phone_number = $4, email = $5, priority_order = $6
		WHERE user_id = $7
	`, customer.Name, customer.ApartmentID, customer.RoomNumber, customer.PhoneNumber, customer.Email, newPriority, userID)

	if err != nil {
		tx.Rollback()
		http.Error(w, "Failed to update customer", http.StatusInternalServerError)
		return
	}

	err = tx.Commit()
	if err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	fmt.Fprintln(w, "Customer and priorities updated successfully!")
}


// func UpdateCustomer(w http.ResponseWriter, r *http.Request) {
// 	params := mux.Vars(r)
// 	userID := params["id"]

// 	var customer models.User
// 	err := json.NewDecoder(r.Body).Decode(&customer)
// 	if err != nil {
// 		http.Error(w, "Invalid request format", http.StatusBadRequest)
// 		return
// 	}

// 	_, err = config.DB.Exec("UPDATE users SET name = $1, apartment_id = $2, room_number = $3, phone_number = $4, email = $5 WHERE user_id = $6",
// 		customer.Name, customer.ApartmentID, customer.RoomNumber, customer.PhoneNumber, customer.Email, userID)
// 	if err != nil {
// 		log.Printf("Error updating customer: %v\n", err)
// 		http.Error(w, "Failed to update customer", http.StatusInternalServerError)
// 		return
// 	}

// 	fmt.Fprintln(w, "Customer updated successfully!")
// }





// Delete a customer
func DeleteCustomer(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	userID := params["id"]

	// Get apartment_id and priority_order of the customer being deleted
	var apartmentID string
	var deletedPriority int
	err := config.DB.QueryRow("SELECT apartment_id, priority_order FROM users WHERE user_id = $1", userID).
		Scan(&apartmentID, &deletedPriority)

	if err != nil {
		log.Printf("Error fetching customer details: %v\n", err)
		http.Error(w, "Customer not found", http.StatusNotFound)
		return
	}

	// Start a transaction
	tx, err := config.DB.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v\n", err)
		http.Error(w, "Failed to delete customer", http.StatusInternalServerError)
		return
	}

	// Delete the customer
	_, err = tx.Exec("DELETE FROM users WHERE user_id = $1", userID)
	if err != nil {
		log.Printf("Error deleting customer: %v\n", err)
		tx.Rollback()
		http.Error(w, "Failed to delete customer", http.StatusInternalServerError)
		return
	}

	// Shift priority_order of remaining users in the same apartment
	_, err = tx.Exec(`
		UPDATE users 
		SET priority_order = priority_order - 1 
		WHERE apartment_id = $1 AND priority_order > $2
	`, apartmentID, deletedPriority)

	if err != nil {
		log.Printf("Error updating priorities: %v\n", err)
		tx.Rollback()
		http.Error(w, "Failed to reorder customers", http.StatusInternalServerError)
		return
	}

	// Commit the transaction
	err = tx.Commit()
	if err != nil {
		log.Printf("Error committing transaction: %v\n", err)
		http.Error(w, "Failed to finalize deletion", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "Customer deleted and priorities updated successfully!")
}


func CreatebulkCustomers(w http.ResponseWriter, r *http.Request) { 
	var customers []models.User

	// Decode the incoming JSON request into an array of customers
	err := json.NewDecoder(r.Body).Decode(&customers)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Prepare the SQL statement for batch insertion
	query := "INSERT INTO users (user_id, name, apartment_id, room_number, phone_number, email) VALUES "
	values := []interface{}{}
	placeholders := []string{}

	for i, customer := range customers {
		index := i * 5
		placeholders = append(placeholders, fmt.Sprintf("(gen_random_uuid(), $%d, $%d, $%d, $%d, $%d)", index+1, index+2, index+3, index+4, index+5))
		values = append(values, customer.Name, customer.ApartmentID, customer.RoomNumber, customer.PhoneNumber, customer.Email)
	}

	// Final query string
	query += strings.Join(placeholders, ", ")

	_, err = config.DB.Exec(query, values...)
	if err != nil {
		log.Printf("Error inserting customers: %v\n", err)
		http.Error(w, "Failed to add customers", http.StatusInternalServerError)
		return
	}

	fmt.Fprintln(w, "Customers added successfully!")
}

// func CreateDefaultOrder(w http.ResponseWriter, r *http.Request) {
// 	params := mux.Vars(r)
// 	customerID := params["id"]

// 	var request struct {
// 		Products []models.DefaultOrderItem `json:"products"`
// 	}

// 	err := json.NewDecoder(r.Body).Decode(&request)
// 	if err != nil {
// 		http.Error(w, "Invalid request format", http.StatusBadRequest)
// 		return
// 	}

// 	// Step 1: Check if a default order already exists for the user
// 	var exists bool
// 	err = config.DB.QueryRow("SELECT EXISTS (SELECT 1 FROM default_order_items WHERE user_id = $1)", customerID).Scan(&exists)
// 	if err != nil {
// 		log.Printf("Error checking existing default order: %v\n", err)
// 		http.Error(w, "Failed to check existing default order", http.StatusInternalServerError)
// 		return
// 	}

// 	if exists {
// 		http.Error(w, "Default order already exists for this user", http.StatusConflict)
// 		return
// 	}

// 	// Step 2: Insert new products into default_order_items
// 	for _, item := range request.Products {
// 		_, err := config.DB.Exec(
// 			"INSERT INTO default_order_items (user_id, product_id, quantity) VALUES ($1, $2, $3)",
// 			customerID, item.ProductID, item.Quantity,
// 		)
// 		if err != nil {
// 			log.Printf("Error adding product to default order: %v\n", err)
// 			http.Error(w, "Failed to add products to default order", http.StatusInternalServerError)
// 			return
// 		}
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	w.WriteHeader(http.StatusOK)
// 	json.NewEncoder(w).Encode(map[string]string{"message": "Default order created successfully!"})
// }

func CreateDefaultOrderUnified(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	customerID := params["id"]

	log.Println("Processing default order for user:", customerID)

	var request struct {
		IsAlternating bool                     `json:"is_alternating_order"`
		Products      []map[string]interface{} `json:"products"`
	}

	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		log.Println("Error decoding request body:", err)
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	payloadBytes, _ := json.MarshalIndent(request, "", "  ")
	log.Println("Received Payload:\n", string(payloadBytes))

	// Step 1: Delete previous default orders
	log.Println("Deleting existing default_order_items...")
	_, err = config.DB.Exec("DELETE FROM default_order_items WHERE user_id = $1", customerID)
	if err != nil {
		log.Println("Error deleting default_order_items:", err)
		http.Error(w, "Failed to clear normal default orders", http.StatusInternalServerError)
		return
	}

	log.Println("Deleting existing alternating_default_order_items...")
	_, err = config.DB.Exec("DELETE FROM alternating_default_order_items WHERE user_id = $1", customerID)
	if err != nil {
		log.Println("Error deleting alternating_default_order_items:", err)
		http.Error(w, "Failed to clear alternating default orders", http.StatusInternalServerError)
		return
	}

	// Step 2: Insert new default orders
	if request.IsAlternating {
		log.Println("Inserting alternating default order items...")
		for i, item := range request.Products {
			productID, ok1 := item["product_id"].(string)
			quantityFloat, ok2 := item["quantity"].(float64) // always float64 from JSON
			dayType, ok3 := item["day_type"].(string)

			if !ok1 || !ok2 || !ok3 {
				log.Printf("Invalid data at index %d: %v\n", i, item)
				http.Error(w, "Invalid product entry in alternating order", http.StatusBadRequest)
				return
			}

			log.Printf("Inserting: product_id=%s, quantity=%d, day_type=%s\n", productID, int(quantityFloat), dayType)

			_, err := config.DB.Exec(
				"INSERT INTO alternating_default_order_items (user_id, product_id, quantity, day_type) VALUES ($1, $2, $3, $4)",
				customerID, productID, int(quantityFloat), dayType,
			)
			if err != nil {
				log.Println("Insert failed for alternating item:", err)
				http.Error(w, "Failed to insert alternating default order", http.StatusInternalServerError)
				return
			}
		}
	} else {
		log.Println("Inserting normal default order items...")
		for i, item := range request.Products {
			productID, ok1 := item["product_id"].(string)
			quantityFloat, ok2 := item["quantity"].(float64)

			if !ok1 || !ok2 {
				log.Printf("Invalid data at index %d: %v\n", i, item)
				http.Error(w, "Invalid product entry in normal order", http.StatusBadRequest)
				return
			}

			log.Printf("Inserting: product_id=%s, quantity=%d\n", productID, int(quantityFloat))

			_, err := config.DB.Exec(
				"INSERT INTO default_order_items (user_id, product_id, quantity) VALUES ($1, $2, $3)",
				customerID, productID, int(quantityFloat),
			)
			if err != nil {
				log.Println("Insert failed for default item:", err)
				http.Error(w, "Failed to insert default order", http.StatusInternalServerError)
				return
			}
		}
	}

	// Step 3: Update user flag
	log.Printf("Updating user %s is_alternating_order = %v\n", customerID, request.IsAlternating)
	_, err = config.DB.Exec("UPDATE users SET is_alternating_order = $1 WHERE user_id = $2", request.IsAlternating, customerID)
	if err != nil {
		log.Println("Failed to update user flag:", err)
		http.Error(w, "Failed to update user type", http.StatusInternalServerError)
		return
	}

	log.Println("Default order saved successfully.")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Default order created successfully"})
}


// func CreateDefaultOrderUnified(w http.ResponseWriter, r *http.Request) {
// 	params := mux.Vars(r)
// 	customerID := params["id"]

// 	var request struct {
// 		IsAlternating bool `json:"is_alternating_order"`
// 		Products      []map[string]interface{} `json:"products"`
// 	}

// 	err := json.NewDecoder(r.Body).Decode(&request)
// 	if err != nil {
// 		http.Error(w, "Invalid request format", http.StatusBadRequest)
// 		return
// 	}

// 	payloadBytes, _ := json.MarshalIndent(request, "", "  ")
// 	log.Println("Received Payload:\n", string(payloadBytes))

// 	// Step 1: Delete both types of previous default orders
// 	_, err = config.DB.Exec("DELETE FROM default_order_items WHERE user_id = $1", customerID)
// 	if err != nil {
// 		http.Error(w, "Failed to clear normal default orders", http.StatusInternalServerError)
// 		return
// 	}

// 	_, err = config.DB.Exec("DELETE FROM alternating_default_order_items WHERE user_id = $1", customerID)
// 	if err != nil {
// 		http.Error(w, "Failed to clear alternating default orders", http.StatusInternalServerError)
// 		return
// 	}

// 	// Step 2: Insert new default order based on type
// 	if request.IsAlternating {
// 		for _, item := range request.Products {
// 			_, err := config.DB.Exec(
// 				"INSERT INTO alternating_default_order_items (user_id, product_id, quantity, day_type) VALUES ($1, $2, $3, $4)",
// 				customerID, item["product_id"], item["quantity"], item["day_type"],
// 			)
// 			if err != nil {
// 				http.Error(w, "Failed to insert alternating default order", http.StatusInternalServerError)
// 				return
// 			}
// 		}
// 	} else {
// 		for _, item := range request.Products {
// 			_, err := config.DB.Exec(
// 				"INSERT INTO default_order_items (user_id, product_id, quantity) VALUES ($1, $2, $3)",
// 				customerID, item["product_id"], item["quantity"],
// 			)
// 			if err != nil {
// 				http.Error(w, "Failed to insert default order", http.StatusInternalServerError)
// 				return
// 			}
// 		}
// 	}

// 	// Step 3: Update user flag
// 	_, err = config.DB.Exec("UPDATE users SET is_alternating_order = $1 WHERE user_id = $2", request.IsAlternating, customerID)
// 	if err != nil {
// 		http.Error(w, "Failed to update user type", http.StatusInternalServerError)
// 		return
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(map[string]string{"message": "Default order created successfully"})
// }


func CreateDefaultOrder(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	customerID := params["id"]

	var request struct {
		Products []models.DefaultOrderItem `json:"products"`
	}

	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Check if a default order already exists
	var exists bool
	err = config.DB.QueryRow("SELECT EXISTS (SELECT 1 FROM default_order_items WHERE user_id = $1)", customerID).Scan(&exists)
	if err != nil {
		http.Error(w, "Failed to check default order", http.StatusInternalServerError)
		return
	}
	if exists {
		http.Error(w, "Default order already exists for this user", http.StatusConflict)
		return
	}

	// Insert into default_order_items
	for _, item := range request.Products {
		_, err := config.DB.Exec(
			"INSERT INTO default_order_items (user_id, product_id, quantity) VALUES ($1, $2, $3)",
			customerID, item.ProductID, item.Quantity,
		)
		if err != nil {
			http.Error(w, "Failed to insert product", http.StatusInternalServerError)
			return
		}
	}

	// Update user to mark as non-alternating
	_, err = config.DB.Exec("UPDATE users SET is_alternating_order = false WHERE user_id = $1", customerID)
	if err != nil {
		http.Error(w, "Failed to update user type", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Default order created successfully"})
}

func CreateAlternatingDefaultOrder(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	customerID := params["id"]

	var request struct {
		Products []models.AlternatingDefaultOrderItem `json:"products"`
	}

	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Check if alternating default order already exists
	var exists bool
	err = config.DB.QueryRow("SELECT EXISTS (SELECT 1 FROM alternating_default_order_items WHERE user_id = $1)", customerID).Scan(&exists)
	if err != nil {
		http.Error(w, "Failed to check alternating default order", http.StatusInternalServerError)
		return
	}
	if exists {
		http.Error(w, "Alternating default order already exists for this user", http.StatusConflict)
		return
	}

	// Insert into alternating_default_order_items
	for _, item := range request.Products {
		_, err := config.DB.Exec(
			"INSERT INTO alternating_default_order_items (user_id, product_id, quantity, day_type) VALUES ($1, $2, $3, $4)",
			customerID, item.ProductID, item.Quantity, item.DayType,
		)
		if err != nil {
			http.Error(w, "Failed to insert alternating product", http.StatusInternalServerError)
			return
		}
	}

	// Update user to mark as alternating
	_, err = config.DB.Exec("UPDATE users SET is_alternating_order = true WHERE user_id = $1", customerID)
	if err != nil {
		http.Error(w, "Failed to update user type", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Alternating default order created successfully"})
}

// func UpdateDefaultOrder(w http.ResponseWriter, r *http.Request) {
// 	params := mux.Vars(r)
// 	customerID := params["id"]

// 	var request struct {
// 		Products []models.DefaultOrderItem `json:"products"`
// 	}

// 	err := json.NewDecoder(r.Body).Decode(&request)
// 	if err != nil {
// 		http.Error(w, "Invalid request format", http.StatusBadRequest)
// 		return
// 	}

// 	// Step 1: Check if a default order exists for the user
// 	var exists bool
// 	err = config.DB.QueryRow("SELECT EXISTS (SELECT 1 FROM default_order_items WHERE user_id = $1)", customerID).Scan(&exists)
// 	if err != nil {
// 		log.Printf("Error checking existing default order: %v\n", err)
// 		http.Error(w, "Failed to check existing default order", http.StatusInternalServerError)
// 		return
// 	}

// 	if !exists {
// 		http.Error(w, "No default order found for this user", http.StatusNotFound)
// 		return
// 	}

// 	// Step 2: Delete existing default order items for this user
// 	_, err = config.DB.Exec("DELETE FROM default_order_items WHERE user_id = $1", customerID)
// 	if err != nil {
// 		log.Printf("Error clearing existing default order items: %v\n", err)
// 		http.Error(w, "Failed to update default order", http.StatusInternalServerError)
// 		return
// 	}

// 	// Step 3: Insert updated products into default_order_items
// 	for _, item := range request.Products {
// 		_, err := config.DB.Exec(
// 			"INSERT INTO default_order_items (user_id, product_id, quantity) VALUES ($1, $2, $3)",
// 			customerID, item.ProductID, item.Quantity,
// 		)
// 		if err != nil {
// 			log.Printf("Error updating product in default order: %v\n", err)
// 			http.Error(w, "Failed to update default order", http.StatusInternalServerError)
// 			return
// 		}
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	w.WriteHeader(http.StatusOK)
// 	json.NewEncoder(w).Encode(map[string]string{"message": "Default order updated successfully!"})
// }

func UpdateDefaultOrderUnified(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	customerID := params["id"]

	var request struct {
		IsAlternating bool `json:"is_alternating_order"`
		// Flexible structure to handle both types
		Products []map[string]interface{} `json:"products"`
	}

	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Step 1: Delete both types of default order entries
	_, err = config.DB.Exec("DELETE FROM default_order_items WHERE user_id = $1", customerID)
	if err != nil {
		http.Error(w, "Failed to delete normal default orders", http.StatusInternalServerError)
		return
	}

	_, err = config.DB.Exec("DELETE FROM alternating_default_order_items WHERE user_id = $1", customerID)
	if err != nil {
		http.Error(w, "Failed to delete alternating default orders", http.StatusInternalServerError)
		return
	}

	// Step 2: Insert into appropriate table based on flag
	if request.IsAlternating {
		for _, item := range request.Products {
			_, err := config.DB.Exec(
				"INSERT INTO alternating_default_order_items (user_id, product_id, quantity, day_type) VALUES ($1, $2, $3, $4)",
				customerID, item["product_id"], item["quantity"], item["day_type"],
			)
			if err != nil {
				http.Error(w, "Failed to insert alternating default order", http.StatusInternalServerError)
				return
			}
		}
	} else {
		for _, item := range request.Products {
			_, err := config.DB.Exec(
				"INSERT INTO default_order_items (user_id, product_id, quantity) VALUES ($1, $2, $3)",
				customerID, item["product_id"], item["quantity"],
			)
			if err != nil {
				http.Error(w, "Failed to insert default order", http.StatusInternalServerError)
				return
			}
		}
	}

	// Step 3: Update user type
	_, err = config.DB.Exec("UPDATE users SET is_alternating_order = $1 WHERE user_id = $2", request.IsAlternating, customerID)
	if err != nil {
		http.Error(w, "Failed to update user type", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Default order updated successfully"})
}

// func GetDefaultOrder(w http.ResponseWriter, r *http.Request) {
// 	params := mux.Vars(r)
// 	customerID := params["id"]

// 	// Check if user has a default order
// 	var exists bool
// 	err := config.DB.QueryRow(
// 		"SELECT EXISTS (SELECT 1 FROM default_order_items WHERE user_id = $1)", customerID,
// 	).Scan(&exists)

// 	if err != nil {
// 		log.Printf("ERROR: Failed to check default order for user %s: %v", customerID, err)
// 		http.Error(w, "Failed to check default order", http.StatusInternalServerError)
// 		return
// 	}

// 	if !exists {
// 		w.Header().Set("Content-Type", "application/json")
// 		w.WriteHeader(http.StatusOK)
// 		w.Write([]byte("[]")) // Return empty list if no default order found
// 		return
// 	}

// 	// Fetch products for the user's default order
// 	rows, err := config.DB.Query(`
// 		SELECT product_id, quantity FROM default_order_items WHERE user_id = $1
// 	`, customerID)

// 	if err != nil {
// 		http.Error(w, "Failed to fetch order products", http.StatusInternalServerError)
// 		return
// 	}
// 	defer rows.Close()

// 	var orderItems []models.DefaultOrderItem
// 	for rows.Next() {
// 		var item models.DefaultOrderItem
// 		err := rows.Scan(&item.ProductID, &item.Quantity)
// 		if err != nil {
// 			http.Error(w, "Error scanning order products", http.StatusInternalServerError)
// 			return
// 		}
// 		orderItems = append(orderItems, item)
// 	}

// 	// Return the default order with product details
// 	response := map[string]interface{}{
// 		"user_id":  customerID,
// 		"products": orderItems,
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(response)
// }


func GetDefaultOrderUnified(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	customerID := params["id"]

	var isAlternating bool
	err := config.DB.QueryRow("SELECT is_alternating_order FROM users WHERE user_id = $1", customerID).Scan(&isAlternating)
	if err != nil {
		http.Error(w, "Failed to check user type", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if isAlternating {
		// Fetch alternating default order
		rows, err := config.DB.Query(`
			SELECT product_id, quantity, day_type
			FROM alternating_default_order_items
			WHERE user_id = $1
		`, customerID)
		if err != nil {
			http.Error(w, "Failed to fetch alternating default order", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var products []map[string]interface{}
		for rows.Next() {
			var productID string
			var quantity float64
			var dayType string
			err := rows.Scan(&productID, &quantity, &dayType)
			if err != nil {
				http.Error(w, "Error scanning alternating default order", http.StatusInternalServerError)
				return
			}
			products = append(products, map[string]interface{}{
				"product_id": productID,
				"quantity":   quantity,
				"day_type":   dayType,
			})
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"user_id":             customerID,
			"is_alternating_order": true,
			"products":            products,
		})
	} else {
		// Fetch normal default order
		rows, err := config.DB.Query(`
			SELECT product_id, quantity
			FROM default_order_items
			WHERE user_id = $1
		`, customerID)
		if err != nil {
			http.Error(w, "Failed to fetch default order", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var products []map[string]interface{}
		for rows.Next() {
			var productID string
			var quantity float64
			err := rows.Scan(&productID, &quantity)
			if err != nil {
				http.Error(w, "Error scanning default order", http.StatusInternalServerError)
				return
			}
			products = append(products, map[string]interface{}{
				"product_id": productID,
				"quantity":   quantity,
			})
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"user_id":             customerID,
			"is_alternating_order": false,
			"products":            products,
		})
	}
}




// func CreateDefaultOrder(w http.ResponseWriter, r *http.Request) {
// 	params := mux.Vars(r)
// 	customerID := params["id"]

// 	var request struct {
// 		Products []models.DefaultOrderItem `json:"products"`
// 	}

// 	err := json.NewDecoder(r.Body).Decode(&request)
// 	if err != nil {
// 		http.Error(w, "Invalid request format", http.StatusBadRequest)
// 		return
// 	}
	
// 	// Create a new default order
// 	var orderID string
// 	err = config.DB.QueryRow(
// 		"INSERT INTO default_orders (user_id, status) VALUES ($1, 'active') RETURNING order_id",
// 		customerID,
// 	).Scan(&orderID)

// 	if err != nil {
// 		log.Printf("Error creating default order: %v\n", err)
// 		http.Error(w, "Failed to create default order", http.StatusInternalServerError)
// 		return
// 	}

// 	// Insert products into default_order_items
// 	for _, item := range request.Products {
// 		_, err := config.DB.Exec(
// 			"INSERT INTO default_order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)",
// 			orderID, item.ProductID, item.Quantity,
// 		)
// 		if err != nil {
// 			log.Printf("Error adding product to default order: %v\n", err)
// 			http.Error(w, "Failed to add products to default order", http.StatusInternalServerError)
// 			return
// 		}
// 	}

// 	fmt.Fprintln(w, "Default order created successfully!")
// }



// func UpdateDefaultOrder(w http.ResponseWriter, r *http.Request) {
// 	params := mux.Vars(r)
// 	customerID := params["id"]

// 	var request struct {
// 		Products []models.DefaultOrderItem `json:"products"`
// 	}

// 	err := json.NewDecoder(r.Body).Decode(&request)
// 	if err != nil {
// 		http.Error(w, "Invalid request format", http.StatusBadRequest)
// 		return
// 	}
	
// 	// Get the customer's existing order ID
// 	var orderID string
// 	err = config.DB.QueryRow(
// 		"SELECT order_id FROM default_orders WHERE user_id = $1", customerID,
// 	).Scan(&orderID)

// 	if err != nil {
// 		log.Printf("No default order found for customer: %v\n", err)
// 		http.Error(w, "No default order found for this customer", http.StatusNotFound)
// 		return
// 	}

// 	// Delete existing order items
// 	_, err = config.DB.Exec("DELETE FROM default_order_items WHERE order_id = $1", orderID)
// 	if err != nil {
// 		log.Printf("Error clearing existing default order items: %v\n", err)
// 		http.Error(w, "Failed to update default order", http.StatusInternalServerError)
// 		return
// 	}

// 	// Insert updated products into default_order_items
// 	for _, item := range request.Products {
// 		_, err := config.DB.Exec(
// 			"INSERT INTO default_order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)",
// 			orderID, item.ProductID, item.Quantity,
// 		)
// 		if err != nil {
// 			log.Printf("Error updating product in default order: %v\n", err)
// 			http.Error(w, "Failed to update default order", http.StatusInternalServerError)
// 			return
// 		}
// 	}

// 	fmt.Fprintln(w, "Default order updated successfully!")
// }





// func GetDefaultOrder(w http.ResponseWriter, r *http.Request) {
// 	params := mux.Vars(r)
// 	customerID := params["id"]

// 	// Get the customer's existing order ID
// 	var orderID string
// 	err := config.DB.QueryRow(
// 		"SELECT order_id FROM default_orders WHERE user_id = $1", customerID,
// 	).Scan(&orderID)

// 	if err == sql.ErrNoRows {
		
// 		w.Header().Set("Content-Type", "application/json")
// 		w.WriteHeader(http.StatusOK) // 200 OK with empty response
// 		w.Write([]byte("[]"))
// 		return
// 	} else if err != nil {
// 		log.Printf("ERROR: Failed to check default order for user %s: %v", customerID, err)
// 		http.Error(w, "Failed to check default order", http.StatusInternalServerError)
// 		return
// 	}

// 	// Fetch products associated with this order
// 	rows, err := config.DB.Query(`
// 		SELECT product_id, quantity FROM default_order_items WHERE order_id = $1
// 	`, orderID)

// 	if err != nil {
// 		http.Error(w, "Failed to fetch order products", http.StatusInternalServerError)
// 		return
// 	}
// 	defer rows.Close()

// 	var orderItems []models.DefaultOrderItem
// 	for rows.Next() {
// 		var item models.DefaultOrderItem
// 		err := rows.Scan(&item.ProductID, &item.Quantity)
// 		if err != nil {
// 			http.Error(w, "Error scanning order products", http.StatusInternalServerError)
// 			return
// 		}
// 		orderItems = append(orderItems, item)
// 	}

// 	// Return the default order with product details
// 	response := map[string]interface{}{
// 		"order_id": orderID,
// 		"user_id":  customerID,
// 		"products": orderItems,
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(response)
// }
