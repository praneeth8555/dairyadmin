package handlers

import (
	"backend/config"
	"backend/models"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

// Get all apartments
func GetApartments(w http.ResponseWriter, r *http.Request) {
	rows, err := config.DB.Query("SELECT apartment_id, apartment_name, created_at FROM apartments")
	if err != nil {
		http.Error(w, "Failed to fetch apartments", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var apartments []models.Apartment
	for rows.Next() {
		var apartment models.Apartment
		err := rows.Scan(&apartment.ApartmentID, &apartment.ApartmentName, &apartment.CreatedAt)
		if err != nil {
			http.Error(w, "Error scanning apartments", http.StatusInternalServerError)
			return
		}
		apartments = append(apartments, apartment)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(apartments)
}

// Add a new apartment
func CreateApartment(w http.ResponseWriter, r *http.Request) {
	var apartment models.Apartment
	err := json.NewDecoder(r.Body).Decode(&apartment)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	_, err = config.DB.Exec("INSERT INTO apartments (apartment_id, apartment_name) VALUES (gen_random_uuid(), $1)",
		apartment.ApartmentName)
	if err != nil {
		log.Printf("Error inserting apartment: %v\n", err)
		http.Error(w, "Failed to add apartment", http.StatusInternalServerError)
		return
	}

	fmt.Fprintln(w, "Apartment added successfully!")
}

// Delete an apartment
func DeleteApartment(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	apartmentID := params["id"]

	_, err := config.DB.Exec("DELETE FROM apartments WHERE apartment_id = $1", apartmentID)
	if err != nil {
		log.Printf("Error deleting apartment: %v\n", err)
		http.Error(w, "Failed to delete apartment", http.StatusInternalServerError)
		return
	}

	fmt.Fprintln(w, "Apartment deleted successfully!")
}
