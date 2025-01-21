package config

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// ConnectDatabase initializes the database connection
func ConnectDatabase() {
	// Load environment variables
	dbUser := "postgres"       // Change if needed
	dbPassword := "1431" // Change this to your actual password
	dbName := "dairy_business"
	dbHost := "localhost"
	dbPort := "5432"

	// PostgreSQL connection string
	connStr := fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s sslmode=disable",
		dbUser, dbPassword, dbName, dbHost, dbPort)

	// Open database connection
	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Failed to connect to the database:", err)
	}

	// Verify connection
	err = DB.Ping()
	if err != nil {
		log.Fatal("Database is not responding:", err)
	}

	fmt.Println("✅ Connected to PostgreSQL database successfully!")
}
