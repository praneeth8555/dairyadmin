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

	// Get the last priority order in the apartment
	var lastPriority int
	err = config.DB.QueryRow("SELECT COALESCE(MAX(priority_order), 0) + 1 FROM users WHERE apartment_id = $1", customer.ApartmentID).Scan(&lastPriority)
	if err != nil {
		log.Printf("Error fetching last priority: %v\n", err)
		http.Error(w, "Failed to determine priority order", http.StatusInternalServerError)
		return
	}

	// Insert new customer with assigned priority
	_, err = config.DB.Exec(`
		INSERT INTO users (user_id, name, apartment_id, room_number, phone_number, email, priority_order) 
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
		customer.Name, customer.ApartmentID, customer.RoomNumber, customer.PhoneNumber, customer.Email, lastPriority)
	
	if err != nil {
		log.Printf("Error inserting customer: %v\n", err)
		http.Error(w, "Failed to add customer", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintln(w, "Customer added successfully!")
}




// Update customer details


// Update customer details and default order (if provided)


func UpdateCustomer(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	userID := params["id"]

	var customer models.User
	err := json.NewDecoder(r.Body).Decode(&customer)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	_, err = config.DB.Exec("UPDATE users SET name = $1, apartment_id = $2, room_number = $3, phone_number = $4, email = $5 WHERE user_id = $6",
		customer.Name, customer.ApartmentID, customer.RoomNumber, customer.PhoneNumber, customer.Email, userID)
	if err != nil {
		log.Printf("Error updating customer: %v\n", err)
		http.Error(w, "Failed to update customer", http.StatusInternalServerError)
		return
	}

	fmt.Fprintln(w, "Customer updated successfully!")
}





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

	// Step 1: Check if a default order already exists for the user
	var exists bool
	err = config.DB.QueryRow("SELECT EXISTS (SELECT 1 FROM default_order_items WHERE user_id = $1)", customerID).Scan(&exists)
	if err != nil {
		log.Printf("Error checking existing default order: %v\n", err)
		http.Error(w, "Failed to check existing default order", http.StatusInternalServerError)
		return
	}

	if exists {
		http.Error(w, "Default order already exists for this user", http.StatusConflict)
		return
	}

	// Step 2: Insert new products into default_order_items
	for _, item := range request.Products {
		_, err := config.DB.Exec(
			"INSERT INTO default_order_items (user_id, product_id, quantity) VALUES ($1, $2, $3)",
			customerID, item.ProductID, item.Quantity,
		)
		if err != nil {
			log.Printf("Error adding product to default order: %v\n", err)
			http.Error(w, "Failed to add products to default order", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Default order created successfully!"})
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

func UpdateDefaultOrder(w http.ResponseWriter, r *http.Request) {
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

	// Step 1: Check if a default order exists for the user
	var exists bool
	err = config.DB.QueryRow("SELECT EXISTS (SELECT 1 FROM default_order_items WHERE user_id = $1)", customerID).Scan(&exists)
	if err != nil {
		log.Printf("Error checking existing default order: %v\n", err)
		http.Error(w, "Failed to check existing default order", http.StatusInternalServerError)
		return
	}

	if !exists {
		http.Error(w, "No default order found for this user", http.StatusNotFound)
		return
	}

	// Step 2: Delete existing default order items for this user
	_, err = config.DB.Exec("DELETE FROM default_order_items WHERE user_id = $1", customerID)
	if err != nil {
		log.Printf("Error clearing existing default order items: %v\n", err)
		http.Error(w, "Failed to update default order", http.StatusInternalServerError)
		return
	}

	// Step 3: Insert updated products into default_order_items
	for _, item := range request.Products {
		_, err := config.DB.Exec(
			"INSERT INTO default_order_items (user_id, product_id, quantity) VALUES ($1, $2, $3)",
			customerID, item.ProductID, item.Quantity,
		)
		if err != nil {
			log.Printf("Error updating product in default order: %v\n", err)
			http.Error(w, "Failed to update default order", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Default order updated successfully!"})
}

func GetDefaultOrder(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	customerID := params["id"]

	// Check if user has a default order
	var exists bool
	err := config.DB.QueryRow(
		"SELECT EXISTS (SELECT 1 FROM default_order_items WHERE user_id = $1)", customerID,
	).Scan(&exists)

	if err != nil {
		log.Printf("ERROR: Failed to check default order for user %s: %v", customerID, err)
		http.Error(w, "Failed to check default order", http.StatusInternalServerError)
		return
	}

	if !exists {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("[]")) // Return empty list if no default order found
		return
	}

	// Fetch products for the user's default order
	rows, err := config.DB.Query(`
		SELECT product_id, quantity FROM default_order_items WHERE user_id = $1
	`, customerID)

	if err != nil {
		http.Error(w, "Failed to fetch order products", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var orderItems []models.DefaultOrderItem
	for rows.Next() {
		var item models.DefaultOrderItem
		err := rows.Scan(&item.ProductID, &item.Quantity)
		if err != nil {
			http.Error(w, "Error scanning order products", http.StatusInternalServerError)
			return
		}
		orderItems = append(orderItems, item)
	}

	// Return the default order with product details
	response := map[string]interface{}{
		"user_id":  customerID,
		"products": orderItems,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}


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
