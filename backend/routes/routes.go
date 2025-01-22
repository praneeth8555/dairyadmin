package routes

import (
	"backend/handlers"
	"github.com/gorilla/mux"
)

func RegisterRoutes(router *mux.Router) {
	// Admin authentication routes
	router.HandleFunc("/admin/login", handlers.AdminLogin).Methods("POST")
	router.HandleFunc("/admin/register", handlers.AdminRegister).Methods("POST")

	router.HandleFunc("/products", handlers.GetProducts).Methods("GET")
	router.HandleFunc("/products", handlers.CreateProduct).Methods("POST")
	router.HandleFunc("/products/{id}", handlers.UpdateProduct).Methods("PUT")
	router.HandleFunc("/products/{id}", handlers.DeleteProduct).Methods("DELETE")

	router.HandleFunc("/products/bulk", handlers.Bulkupload).Methods("POST")
	router.HandleFunc("/products/{id}/price-history", handlers.GetProductPriceHistory).Methods("GET")

	router.HandleFunc("/apartments", handlers.GetApartments).Methods("GET")
	router.HandleFunc("/apartments", handlers.CreateApartment).Methods("POST")
	router.HandleFunc("/apartments/{id}", handlers.DeleteApartment).Methods("DELETE")

	router.HandleFunc("/customers", handlers.GetCustomers).Methods("GET")
	router.HandleFunc("/customers", handlers.CreateCustomer).Methods("POST")
	router.HandleFunc("/customers/{id}", handlers.UpdateCustomer).Methods("PUT")
	router.HandleFunc("/customers/{id}", handlers.DeleteCustomer).Methods("DELETE")

	router.HandleFunc("/bulkcustomers", handlers.CreatebulkCustomers).Methods("POST")

	router.HandleFunc("/customers/{id}/default-order", handlers.CreateDefaultOrder).Methods("POST")
	router.HandleFunc("/customers/{id}/default-order", handlers.UpdateDefaultOrder).Methods("PUT")
	router.HandleFunc("/customers/{id}/default-order", handlers.GetDefaultOrder).Methods("GET")

}
