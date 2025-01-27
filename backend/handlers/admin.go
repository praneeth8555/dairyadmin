package handlers

import (
	"backend/config"
	"backend/models"
	"encoding/json"
	"fmt"

	// "log"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte("your_secret_key") // Change this in production!

// Generate JWT Token
func generateToken(username string) (string, error) {
	claims := jwt.MapClaims{
		"username": username,
		"exp":      time.Now().Add(time.Hour * 24).Unix(), // Token expires in 24 hrs
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}




// Admin Login Handler
// Admin Login Handler (Fixed)
func AdminLogin(w http.ResponseWriter, r *http.Request) {
	var loginData struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	err := json.NewDecoder(r.Body).Decode(&loginData)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}
	//fmt.Printf("Login attempt - Username: %s, Password: %s\n", loginData.Username, loginData.Password)

	// Get admin from DB
	var admin models.Admin
	err = config.DB.QueryRow("SELECT admin_id, username, password_hash FROM admin WHERE username = $1", loginData.Username).
		Scan(&admin.AdminID, &admin.Username, &admin.PasswordHash)
	if err != nil {
		http.Error(w, "Invalid username", http.StatusUnauthorized)
		return
	}
	//fmt.Printf("Fetched admin from DB - AdminID: %s, Username: %s, PasswordHash: %s\n", admin.AdminID, admin.Username, admin.PasswordHash)

	// Compare stored hash with entered password
	err = bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(loginData.Password))
	if err != nil {
		//fmt.Println("❌ Password does NOT match!")
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Generate JWT Token
	token, err := generateToken(admin.Username)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	fmt.Println("✅ Login Successful!")
	response := map[string]string{"token": token}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Admin Registration (For first-time setup)
func AdminRegister(w http.ResponseWriter, r *http.Request) {
	var registrationData struct {
    Username string `json:"username"`
    Password string `json:"password"`
}

err := json.NewDecoder(r.Body).Decode(&registrationData)
if err != nil {
    http.Error(w, "Invalid request format", http.StatusBadRequest)
    return
}

// Hash the password
hashedPassword, err := bcrypt.GenerateFromPassword([]byte(registrationData.Password), bcrypt.DefaultCost)
if err != nil {
    http.Error(w, "Failed to hash password", http.StatusInternalServerError)
    return
}

// Insert into the database
_, err = config.DB.Exec("INSERT INTO admin (admin_id, username, password_hash) VALUES (gen_random_uuid(), $1, $2)",
    registrationData.Username, string(hashedPassword))
if err != nil {
    http.Error(w, "Failed to create admin", http.StatusInternalServerError)
    return
}

fmt.Fprintln(w, "✅ Admin registered successfully!")

}
