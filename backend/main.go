package main

import (
	"backend/config"
	"backend/routes"
	"fmt"
	"log"
	"net/http"
	"github.com/gorilla/mux"
)

// CORS Middleware
func enableCORS(next http.Handler) http.Handler {
	// err := godotenv.Load()
	// if err != nil {
	// 	log.Fatal("Error loading .env file")
	// }

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*") // Change "*" to specific origins if needed
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	// Connect to database
	config.ConnectDatabase()

	// if err := config.ConnectDatabase(); err != nil {
	// 	log.Fatalf("Database connection failed: %v", err)
	// }

	// appEnv := os.Getenv("APP_ENV")
	// if appEnv == "" {
	// 	appEnv = "production"
	// }

	// if appEnv == "production" {
	// 	defer config.PGX.Close(context.Background())

	// 	var version string
	// 	if err := config.PGX.QueryRow(context.Background(), "SELECT version()").Scan(&version); err != nil {
	// 		log.Fatalf("Query failed: %v", err)
	// 	}
	// 	log.Println("Connected to:", version)
	// } else {
	// 	defer config.DB.Close()

	// 	var version string
	// 	if err := config.DB.QueryRow("SELECT version()").Scan(&version); err != nil {
	// 		log.Fatalf("Query failed: %v", err)
	// 	}
	// 	log.Println("Connected to:", version)
	// }

	// Create a new router
	router := mux.NewRouter()

	// Load API routes
	routes.RegisterRoutes(router)

	// Wrap the router with CORS middleware
	handlerWithCORS := enableCORS(router)

	

	// Start server
	port := ":8080"
	// fmt.Println("🚀 Server running on http://localhost" + port)
	fmt.Println("🚀 Server running on http://0.0.0.0" + port)
	log.Fatal(http.ListenAndServe(port, handlerWithCORS))
}
