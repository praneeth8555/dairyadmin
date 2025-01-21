package handlers

import (
	"backend/config"
	"backend/models"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
)

// Get all customers
func GetCustomers(w http.ResponseWriter, r *http.Request) {
	rows, err := config.DB.Query("SELECT user_id, name, apartment_id, room_number, phone_number, email, created_at FROM users")
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

// Add a new customer
func CreateCustomer(w http.ResponseWriter, r *http.Request) {
	var customer models.User
	err := json.NewDecoder(r.Body).Decode(&customer)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	_, err = config.DB.Exec("INSERT INTO users (user_id, name, apartment_id, room_number, phone_number, email) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)",
		customer.Name, customer.ApartmentID, customer.RoomNumber, customer.PhoneNumber, customer.Email)
	if err != nil {
		log.Printf("Error inserting customer: %v\n", err)
		http.Error(w, "Failed to add customer", http.StatusInternalServerError)
		return
	}

	fmt.Fprintln(w, "Customer added successfully!")
}

// Update customer details
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

	_, err := config.DB.Exec("DELETE FROM users WHERE user_id = $1", userID)
	if err != nil {
		log.Printf("Error deleting customer: %v\n", err)
		http.Error(w, "Failed to delete customer", http.StatusInternalServerError)
		return
	}

	fmt.Fprintln(w, "Customer deleted successfully!")
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

