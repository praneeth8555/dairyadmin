package handlers

import (
	"backend/config"
	"backend/models"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

// Get all products
func GetProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := config.DB.Query("SELECT product_id, product_name, unit, current_price, image_url,acronym FROM products")
	if err != nil {
		http.Error(w, "Failed to fetch products", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var product models.Product
		err := rows.Scan(&product.ProductID, &product.ProductName, &product.Unit, &product.CurrentPrice, &product.ImageURL,&product.Acronym)
		if err != nil {
			http.Error(w, "Error scanning products", http.StatusInternalServerError)
			return
		}
		products = append(products, product)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}


// Add a new product (upload image to Cloudinary)
// Add a new product (upload image to Cloudinary)
func CreateProduct(w http.ResponseWriter, r *http.Request) {
    var product models.Product
    
    // Log the incoming request method and endpoint
  //  fmt.Printf("[DEBUG] Received request to CreateProduct - Method: %s\n", r.Method)
    
    // Log the incoming request body
    body, _ := io.ReadAll(r.Body)
 //   fmt.Printf("[DEBUG] Raw Request Body: %s\n", string(body))
 //   
    // Reset the request body for decoding
    r.Body = io.NopCloser(bytes.NewBuffer(body))
    
    // Decode JSON request body
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&product)
    if err != nil {
       // fmt.Printf("[ERROR] Error decoding JSON: %v\n", err)
        http.Error(w, "Invalid request format", http.StatusBadRequest)
        return
    }
    
    // Debug log the parsed product
   // fmt.Printf("[DEBUG] Parsed Product: %+v\n", product)
    
    // Check if the image_url is empty or invalid
    if product.ImageURL == "" {
       // fmt.Println("[ERROR] Image URL is missing in the request")
        http.Error(w, "Image URL is required", http.StatusBadRequest)
        return
    }
    
    // Log the image URL to ensure it is being received correctly
   // fmt.Printf("[DEBUG] Image URL received: %s\n", product.ImageURL)
    
    // Insert into database
    _, err = config.DB.Exec("INSERT INTO products (product_id, product_name, unit, current_price, image_url, acronym) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)",
        product.ProductName, product.Unit, product.CurrentPrice, product.ImageURL, product.Acronym)
    
    if err != nil {
     //   fmt.Printf("[ERROR] Failed to execute database insert query: %v\n", err)
        http.Error(w, "Failed to add product", http.StatusInternalServerError)
        return
    }
    
   // fmt.Println("[INFO] Product added successfully!")
    
    // Send response
    w.WriteHeader(http.StatusCreated)
    fmt.Fprintln(w, "Product added successfully!")
}


// Update product details


// Update product details & track price changes
func UpdateProduct(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	productID := params["id"]

	// Decode request body
	var requestData struct {
		ProductName   string  `json:"product_name"`
		Unit          string  `json:"unit"`
		CurrentPrice  float64 `json:"current_price"`
		ImageURL      string  `json:"image_url"`
		EffectiveFrom string  `json:"effective_from"`
		Acronym   string  `json:"acronym"`// Admin provides this date
	}
	err := json.NewDecoder(r.Body).Decode(&requestData)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Fetch the current price before updating
	var oldPrice float64
	err = config.DB.QueryRow("SELECT current_price FROM products WHERE product_id = $1", productID).Scan(&oldPrice)
	if err != nil {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	// Check if the price has changed
	if oldPrice != requestData.CurrentPrice {
		// Insert into product_price_history table
		log.Printf("entering here")
		_, err = config.DB.Exec(
			"INSERT INTO product_price_history (price_id, product_id, old_price, new_price, effective_from, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())",
			productID, oldPrice, requestData.CurrentPrice, requestData.EffectiveFrom,
		)
		if err != nil {
			log.Printf("Error inserting into price history: %v\n", err)
			http.Error(w, "Failed to track price change", http.StatusInternalServerError)
			return
		}
	}

	// Update the product in the products table
	query := `
		UPDATE products
		SET product_name = $1, unit = $2, current_price = $3, image_url = $4 ,acronym =$5
		WHERE product_id = $6
	`
	_, err = config.DB.Exec(query, requestData.ProductName, requestData.Unit, requestData.CurrentPrice, requestData.ImageURL,requestData.Acronym, productID)
	if err != nil {
		log.Printf("Error updating product in database: %v\n", err)
		http.Error(w, "Failed to update product", http.StatusInternalServerError)
		return
	}

	fmt.Fprintln(w, "Product updated successfully!")
}



// Delete a product
func DeleteProduct(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	productID := params["id"]

	_, err := config.DB.Exec("DELETE FROM products WHERE product_id = $1", productID)
	if err != nil {
		http.Error(w, "Failed to delete product", http.StatusInternalServerError)
		return
	}

	fmt.Fprintln(w, "Product deleted successfully!")
}


func Bulkupload(w http.ResponseWriter, r *http.Request) {
    var products []models.Product

    // Log the incoming request body
    fmt.Println("Incoming request body for multiple products:")

    // Decode the array of products from the request body
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&products)
    if err != nil {
        fmt.Println("Error decoding JSON:", err)
        http.Error(w, "Invalid request format", http.StatusBadRequest)
        return
    }

    // Debug log the parsed products
    fmt.Printf("Received products: %+v\n", products)

    // Iterate over each product in the array
    for _, product := range products {
        // Check if the image_url is empty or invalid
        if product.ImageURL == "" {
            fmt.Printf("Error: Image URL is empty for product: %+v\n", product)
            http.Error(w, "Image URL is required for all products", http.StatusBadRequest)
            return
        }

        // Log the product details
        fmt.Printf("Processing product: %+v\n", product)

        // Insert into the database
        _, err = config.DB.Exec(
            "INSERT INTO products (product_id, product_name, unit, current_price, image_url) VALUES (gen_random_uuid(), $1, $2, $3, $4)",
            product.ProductName, product.Unit, product.CurrentPrice, product.ImageURL,
        )
        if err != nil {
            fmt.Printf("Error inserting product into database: %+v, error: %v\n", product, err)
            http.Error(w, "Failed to add some products", http.StatusInternalServerError)
            return
        }

        // Log success for this product
        fmt.Printf("Product added successfully: %+v\n", product)
    }

    // Log overall success
    fmt.Println("All products added successfully.")

    // Send response
    w.WriteHeader(http.StatusCreated)
    fmt.Fprintln(w, "All products added successfully!")
}


func GetProductPriceHistory(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	productID := params["id"]

	rows, err := config.DB.Query(
		"SELECT price_id, old_price, new_price, effective_from, updated_at FROM product_price_history WHERE product_id = $1 ORDER BY effective_from ASC",
		productID,
	)
	if err != nil {
		http.Error(w, "Failed to fetch price history", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var priceHistory []models.ProductPriceHistory
	for rows.Next() {
		var entry models.ProductPriceHistory
		err := rows.Scan(&entry.PriceID, &entry.OldPrice, &entry.NewPrice, &entry.EffectiveFrom, &entry.UpdatedAt)
		if err != nil {
			http.Error(w, "Error scanning price history", http.StatusInternalServerError)
			return
		}
		priceHistory = append(priceHistory, entry)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(priceHistory)
}

