package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"backend/config"
)

// Request struct for updating priority
type UpdatePriorityRequest struct {
	ApartmentID string         `json:"apartment_id"`
	Customers   []PriorityData `json:"customers"`
}

// Individual priority struct
type PriorityData struct {
	UserID        string `json:"user_id"`
	PriorityOrder int    `json:"priority_order"`
}

// UpdateCustomerPriorities updates customer priority in bulk
func UpdateCustomerPriorities(w http.ResponseWriter, r *http.Request) {
	// Parse JSON request body
	var req UpdatePriorityRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON request", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.ApartmentID == "" || len(req.Customers) == 0 {
		http.Error(w, "apartment_id and customers are required", http.StatusBadRequest)
		return
	}

	// Start a transaction
	tx, err := config.DB.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}

	// Prepare update statement
	stmt, err := tx.Prepare("UPDATE users SET priority_order = $1 WHERE user_id = $2 AND apartment_id = $3")
	if err != nil {
		tx.Rollback()
		http.Error(w, "Failed to prepare statement", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	// Update each user's priority in a loop
	for _, customer := range req.Customers {
		_, err := stmt.Exec(customer.PriorityOrder, customer.UserID, req.ApartmentID)
		if err != nil {
			log.Println("Error updating priority for user:", customer.UserID, err)
			tx.Rollback()
			http.Error(w, fmt.Sprintf("Failed to update priority for user %s", customer.UserID), http.StatusInternalServerError)
			return
		}
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	// Send success response
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Priorities updated successfully"})
}
