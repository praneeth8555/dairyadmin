package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"sync"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

var (
	DB   *sql.DB
	once sync.Once // Ensures ConnectDatabase is only called once
)

// ConnectDatabase initializes the database connection only once
func ConnectDatabase() error {
	var err error

	once.Do(func() {
		// Load environment variables only once
		if err = godotenv.Load("../.env"); err != nil {
			log.Printf("Warning: Could not load .env file, using system environment variables")
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
		DB, err = sql.Open("postgres", connStr)
		if err != nil {
			log.Fatalf("❌ Failed to connect to the database: %v", err)
		}

		// Verify connection
		err = DB.Ping()
		if err != nil {
			log.Fatalf("❌ Database is not responding: %v", err)
		}

		log.Println("✅ Connected to PostgreSQL database successfully!")
	})

	return err
}