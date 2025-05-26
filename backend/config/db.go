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
	once sync.Once
)

// ConnectDatabase connects to the appropriate DB depending on APP_MODE
func ConnectDatabase() error {
	var err error

	once.Do(func() {
		// Load environment variables
		if err = godotenv.Load("../.env"); err != nil {
			log.Println("⚠️  Could not load .env file, using system environment variables")
		}

		appMode := os.Getenv("APP_ENV")
		log.Println(appMode)
		var connStr string

		if appMode == "production" {
			// Use Supabase DATABASE_URL
			databaseURL := os.Getenv("DATABASE_URL")
			if databaseURL == "" {
				err = fmt.Errorf("DATABASE_URL is not set in production mode")
				log.Fatal(err)
				return
			}
			connStr = databaseURL
			log.Println("🌐 Using Supabase production database")
		} else {
			// Use local development environment variables
			dbUser := os.Getenv("dbUser")
			dbPassword := os.Getenv("dbPassword")
			dbName := os.Getenv("dbName")
			dbHost := os.Getenv("dbHost")
			dbPort := os.Getenv("dbPort")

			connStr = fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s sslmode=disable",
				dbUser, dbPassword, dbName, dbHost, dbPort)

			log.Println("🧪 Using local development database")
		}

		DB, err = sql.Open("postgres", connStr)
		if err != nil {
			log.Fatalf("❌ Failed to open database: %v", err)
		}

		if err = DB.Ping(); err != nil {
			log.Fatalf("❌ Failed to ping database: %v", err)
		}

		log.Println("✅ Connected to PostgreSQL database successfully!")
	})

	return err
}
