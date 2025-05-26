package handlers

import (
	"backend/config"
	"encoding/json"
	"fmt"
	// "log"
	"net/http"
	"time"
	"database/sql"
)

// GetMonthlyBill Handler
func GetMonthlyBill(w http.ResponseWriter, r *http.Request) {
    q := r.URL.Query()
    customerID := q.Get("customer_id")
    month := q.Get("month")
    year := q.Get("year")
    if customerID == "" || month == "" || year == "" {
        http.Error(w, "Missing required parameters", http.StatusBadRequest)
        return
    }

    const layout = "2006-01-02"
    startDate, _ := time.Parse(layout, fmt.Sprintf("%s-%s-01", year, month))
    endDate := startDate.AddDate(0, 1, -1) // last day

    // 1) Check if user uses alternating defaults
    var isAlt bool
    if err := config.DB.
        QueryRow(`SELECT is_alternating_order FROM users WHERE user_id=$1`, customerID).
        Scan(&isAlt); err != nil {
        http.Error(w, "Failed to check order type", http.StatusInternalServerError)
        return
    }

    // 2) Hard‐coded global ref for alternating defaults
    globalRef := time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC)

    // 3) Preload default orders
    normalDefaults := make(map[string]float64)        // product_id→qty
    altDefaults := make(map[string]map[string]float64) // dayType→(product_id→qty)
    if isAlt {
        rows, err := config.DB.Query(`
            SELECT product_id, quantity, day_type
              FROM alternating_default_order_items
             WHERE user_id = $1
        `, customerID)
        if err != nil {
            http.Error(w, "Failed loading alternating defaults", http.StatusInternalServerError)
            return
        }
        defer rows.Close()
        for rows.Next() {
            var pid, dt string
            var qty float64
            rows.Scan(&pid, &qty, &dt)
            if altDefaults[dt] == nil {
                altDefaults[dt] = make(map[string]float64)
            }
            altDefaults[dt][pid] = qty
        }
    } else {
        rows, err := config.DB.Query(`
            SELECT product_id, quantity
              FROM default_order_items
             WHERE user_id = $1
        `, customerID)
        if err != nil {
            http.Error(w, "Failed loading normal defaults", http.StatusInternalServerError)
            return
        }
        defer rows.Close()
        for rows.Next() {
            var pid string; var qty float64
            rows.Scan(&pid, &qty)
            normalDefaults[pid] = qty
        }
    }

    // 4) Iterate each day, build bill
    billDetails := make([]map[string]interface{}, 0)
    totalMonthlyBill := 0.0

    for date := startDate; !date.After(endDate); date = date.AddDate(0, 0, 1) {
        curr := date.Format(layout)

        // 4a) Pick latest modification (normal or alt) for this day
        var (
            modOrderID string
            modCreated time.Time
            modStart   string
            modDayType sql.NullString
            srcTable   string
        )
        err := config.DB.QueryRow(`
            SELECT order_id, created_at, start_date, NULL AS day_type, 'normal' AS tbl
              FROM order_modifications
             WHERE user_id=$1
               AND $2 BETWEEN start_date AND end_date
            UNION ALL
            SELECT order_id, created_at, start_date, day_type, 'alt' AS tbl
              FROM alternating_order_modifications
             WHERE user_id=$1
               AND $2 BETWEEN start_date AND end_date
            ORDER BY created_at DESC
            LIMIT 1
        `, customerID, curr).Scan(&modOrderID, &modCreated, &modStart, &modDayType, &srcTable)

        // 4b) Build map of product→quantity for the day
        dayOrders := make(map[string]float64)
        if err == nil {
            switch srcTable {
            case "normal":
                rows, _ := config.DB.Query(`
                    SELECT product_id, modified_quantity
                      FROM order_modifications
                     WHERE order_id=$1
                `, modOrderID)
                defer rows.Close()
                for rows.Next() {
                    var pid string; var qty float64
                    rows.Scan(&pid, &qty)
                    if qty > 0 {
                        dayOrders[pid] = qty
                    }
                }

            case "alt":
                startRef, perr := time.Parse(time.RFC3339, modStart)
                if perr != nil {
                    startRef, _ = time.Parse(layout, modStart[:10])
                }
                todayType := getDayType(startRef, date)

                rows, _ := config.DB.Query(`
                    SELECT product_id, modified_quantity
                      FROM alternating_order_modifications
                     WHERE order_id=$1
                       AND day_type=$2
                `, modOrderID, todayType)
                defer rows.Close()
                for rows.Next() {
                    var pid string; var qty float64
                    rows.Scan(&pid, &qty)
                    if qty > 0 {
                        dayOrders[pid] = qty
                    }
                }
            }
        } else {
            // 4c) No modification → fallback to defaults
            if isAlt {
                dayType := getDayType(globalRef, date)
                for pid, qty := range altDefaults[dayType] {
                    if qty > 0 {
                        dayOrders[pid] = qty
                    }
                }
            } else {
                for pid, qty := range normalDefaults {
                    if qty > 0 {
                        dayOrders[pid] = qty
                    }
                }
            }
        }

        // 4d) Calculate prices & daily total
        dayProducts := make([]map[string]interface{}, 0)
        dayTotal := 0.0

        for pid, qty := range dayOrders {
            // fetch pricePerUnit
            var pricePerUnit float64
            if err := config.DB.QueryRow(`
                SELECT new_price FROM product_price_history
                 WHERE product_id=$1 AND effective_from<= $2
                 ORDER BY effective_from DESC LIMIT 1
            `, pid, curr).Scan(&pricePerUnit); err != nil {
                // fallback to old_price
                if err2 := config.DB.QueryRow(`
                    SELECT old_price FROM product_price_history
                     WHERE product_id=$1
                     ORDER BY effective_from ASC LIMIT 1
                `, pid).Scan(&pricePerUnit); err2 != nil {
                    // final fallback to current_price
                    if err3 := config.DB.QueryRow(`
                        SELECT current_price FROM products WHERE product_id=$1
                    `, pid).Scan(&pricePerUnit); err3 != nil {
                        // if still error, use 0
                        pricePerUnit = 0
                    }
                }
            }

            totalPrice := pricePerUnit * qty
            dayTotal += totalPrice
            dayProducts = append(dayProducts, map[string]interface{}{
                "product_id":    pid,
                "quantity":      qty,
                "price_per_unit": pricePerUnit,
                "total_price":   totalPrice,
            })
        }

        billDetails = append(billDetails, map[string]interface{}{
            "date":     curr,
            "daybill":  dayTotal,
            "products": dayProducts,
        })
        totalMonthlyBill += dayTotal
    }

    // 5) Return the assembled bill
    resp := map[string]interface{}{
        "customer_id":  customerID,
        "month":        month,
        "year":         year,
        "total_bill":   totalMonthlyBill,
        "bill_details": billDetails,
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

// getDayType returns "EVEN" or "ODD" based on (curr - ref) days parity

