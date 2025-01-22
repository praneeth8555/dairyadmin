package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

var DB *sql.DB

// ConnectDatabase initializes the database connection
func ConnectDatabase() {
	// Load environment variables
	err := godotenv.Load("../.env")
	if err != nil {
		log.Fatalf("Error loading .env file")
	}
	dbUser := os.Getenv("dbUser")       // Change if needed
	dbPassword :=os.Getenv("dbPassword") // Change this to your actual password
	dbName := os.Getenv("dbName")
	dbHost := os.Getenv("dbHost")
	dbPort := os.Getenv("dbPort")

	// PostgreSQL connection string
	connStr := fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s sslmode=disable",
		dbUser, dbPassword, dbName, dbHost, dbPort)

	// Open database connection
	// var err error
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
