package models

// Apartment model
 type Apartment struct {
	ApartmentID   string `json:"apartment_id"`
	ApartmentName string `json:"apartment_name"`
	CreatedAt     string `json:"created_at"`
}

// User model
 type User struct {
	UserID      string `json:"user_id"`
	Name        string `json:"name"`
	ApartmentID string `json:"apartment_id"`
	RoomNumber  string `json:"room_number"`
	PhoneNumber string `json:"phone_number"`
	Email       string `json:"email,omitempty"` 
	PriorityOrder int    `json:"priority_order"`
	IsAlternatingOrder bool `json:"is_alternating_order"`
	CreatedAt   string `json:"created_at"`
}

// Product model
 type Product struct {
	ProductID   string  `json:"product_id"`
	ProductName string  `json:"product_name"`
	Unit        string  `json:"unit"`
	CurrentPrice float64 `json:"current_price"`
	CreatedAt   string  `json:"created_at"`
	ImageURL    string  `json:"image_url"`
	Acronym     string 	`json:"acronym"`
}

// ProductPriceHistory model
 type ProductPriceHistory struct {
	PriceID      string  `json:"price_id"`
	ProductID    string  `json:"product_id"`
	OldPrice     float64 `json:"old_price"`
	NewPrice     float64 `json:"new_price"`
	EffectiveFrom string `json:"effective_from"`
	UpdatedAt    string  `json:"updated_at"`
}

type DefaultOrderItem struct {
	OrderItemID   string  `json:"order_item_id"`
	ProductID     string  `json:"product_id"`
	Quantity      float64 `json:"quantity"`
	UserID    	string `json:"user_id"`
}

type AlternatingDefaultOrderItem struct {
	OrderItemID string  `json:"order_item_id"`
	UserID      string  `json:"user_id"`
	ProductID   string  `json:"product_id"`
	Quantity    float64 `json:"quantity"`
	DayType     string  `json:"day_type"` // "ODD", "EVEN", "CUSTOM"
	CreatedAt   string  `json:"created_at"`
}

type OrderModification struct { 
	ModificationID   string  `json:"modification_id"`
	UserID           string  `json:"user_id"`  
	ProductID        string  `json:"product_id"`
	ModifiedQuantity float64 `json:"modified_quantity"`
	StartDate        string  `json:"start_date"`
	EndDate          string  `json:"end_date"`
	OrderID       string  `json:"order_id"`
	CreatedAt        string  `json:"created_at"`
}

type AlternatingOrderModification struct {
	ModificationID   string  `json:"modification_id"`
	UserID           string  `json:"user_id"`
	ProductID        string  `json:"product_id"`
	ModifiedQuantity float64 `json:"modified_quantity"`
	DayType          string  `json:"day_type"` // "ODD", "EVEN", or "CUSTOM"
	StartDate        string  `json:"start_date"`
	EndDate          string  `json:"end_date"`
	OrderID       	 string  `json:"order_id"`
	CreatedAt        string  `json:"created_at"`
}

type Admin struct {
	AdminID      string `json:"admin_id"`
	Username     string `json:"username"`
	PasswordHash string `json:"password_hash"`
}


// DailyOrderSummary model
//  type DailyOrderSummary struct {
// 	SummaryID    string  `json:"summary_id"`
// 	OrderDate    string  `json:"order_date"`
// 	ProductID    string  `json:"product_id"`
// 	TotalQuantity float64 `json:"total_quantity"`
// 	ApartmentID  string  `json:"apartment_id"`
// }

// // MonthlyBill model
//  type MonthlyBill struct {
// 	BillID       string  `json:"bill_id"`
// 	UserID       string  `json:"user_id"`
// 	MonthYear    string  `json:"month_year"`
// 	TotalAmount  float64 `json:"total_amount"`
// 	PaymentStatus string `json:"payment_status"`
// 	GeneratedAt  string  `json:"generated_at"`
// }

//admin model


