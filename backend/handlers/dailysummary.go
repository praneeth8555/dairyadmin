// package handlers

// import (
// 	"backend/config"
// 	"encoding/json"

// 	"log"
// 	"net/http"
// )

// // GetDailyOrderSummary Handler
package handlers

import (
	"database/sql"
	"encoding/json"

	// "fmt"
	"log"
	"net/http"
	"time"

	"backend/config"
)

func GetDailyOrderSummary(w http.ResponseWriter, r *http.Request) {
    q := r.URL.Query()
    aptID := q.Get("apartment_id")
    dateStr := q.Get("date") // YYYY-MM-DD

    if aptID == "" || dateStr == "" {
        http.Error(w, "Missing required parameters", http.StatusBadRequest)
        return
    }

    const layout = "2006-01-02"
    currDate, err := time.Parse(layout, dateStr)
    if err != nil {
        http.Error(w, "Invalid date format", http.StatusBadRequest)
        return
    }

    // 1) Load users in apartment ordered by priority
    userRows, err := config.DB.Query(`
        SELECT user_id, name, room_number, priority_order
          FROM users
         WHERE apartment_id = $1
         ORDER BY priority_order ASC
    `, aptID)
    if err != nil {
        log.Printf("Error fetching users: %v\n", err)
        http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
        return
    }
    defer userRows.Close()

    globalRef := time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC)
    summaries := make([]map[string]interface{}, 0)

    // 2) Iterate users
    for userRows.Next() {
        var userID, name, room string
        var prio int
        if err := userRows.Scan(&userID, &name, &room, &prio); err != nil {
            http.Error(w, "Error scanning user", http.StatusInternalServerError)
            return
        }

        // 2a) check if alternating
        var isAlt bool
        if err := config.DB.QueryRow(
            `SELECT is_alternating_order FROM users WHERE user_id=$1`, userID,
        ).Scan(&isAlt); err != nil {
            http.Error(w, "Error checking order type", http.StatusInternalServerError)
            return
        }

        // 2b) find latest modification for that user and date
        var (
            modOrderID string
            modCreated time.Time
            modStart   string
            modDayType sql.NullString
            srcTable   string
        )
        err = config.DB.QueryRow(`
            SELECT order_id, created_at, start_date, NULL AS day_type, 'normal' AS tbl
              FROM order_modifications
             WHERE user_id=$1 AND $2 BETWEEN start_date AND end_date
            UNION ALL
            SELECT order_id, created_at, start_date, day_type, 'alt' AS tbl
              FROM alternating_order_modifications
             WHERE user_id=$1 AND $2 BETWEEN start_date AND end_date
            ORDER BY created_at DESC
            LIMIT 1
        `, userID, dateStr).Scan(
            &modOrderID, &modCreated, &modStart, &modDayType, &srcTable,
        )

        userOrders := make([]map[string]interface{}, 0)

        if err == nil {
            // 2c) we have a modification; load from the winning table:
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
                        userOrders = append(userOrders, map[string]interface{}{
                            "product_id": pid, "quantity": qty,
                        })
                    }
                }

            case "alt":
                // parse RFC3339 or date-only
                startRef, parseErr := time.Parse(time.RFC3339, modStart)
                if parseErr != nil {
                    startRef, _ = time.Parse(layout, modStart[:10])
                }
                todayType := getDayType(startRef, currDate)

                rows, _ := config.DB.Query(`
                    SELECT product_id, modified_quantity
                      FROM alternating_order_modifications
                     WHERE order_id=$1 AND day_type=$2
                `, modOrderID, todayType)
                defer rows.Close()
                for rows.Next() {
                    var pid string; var qty float64
                    rows.Scan(&pid, &qty)
                    if qty > 0 {
                        userOrders = append(userOrders, map[string]interface{}{
                            "product_id": pid, "quantity": qty,
                        })
                    }
                }
            }

        } else {
            // 2d) no mod → fallback to defaults
            if isAlt {
                dayType := getDayType(globalRef, currDate)
                rows, _ := config.DB.Query(`
                    SELECT product_id, quantity
                      FROM alternating_default_order_items
                     WHERE user_id=$1 AND day_type=$2
                `, userID, dayType)
                defer rows.Close()
                for rows.Next() {
                    var pid string; var qty float64
                    rows.Scan(&pid, &qty)
                    if qty > 0 {
                        userOrders = append(userOrders, map[string]interface{}{
                            "product_id": pid, "quantity": qty,
                        })
                    }
                }
            } else {
                rows, _ := config.DB.Query(`
                    SELECT product_id, quantity
                      FROM default_order_items
                     WHERE user_id=$1
                `, userID)
                defer rows.Close()
                for rows.Next() {
                    var pid string; var qty float64
                    rows.Scan(&pid, &qty)
                    if qty > 0 {
                        userOrders = append(userOrders, map[string]interface{}{
                            "product_id": pid, "quantity": qty,
                        })
                    }
                }
            }
        }

        // 3) append this user’s summary
        summaries = append(summaries, map[string]interface{}{
            "user_id":        userID,
            "name":           name,
            "room_number":    room,
            "priority_order": prio,
            "orders":         userOrders,
        })
    }

    // 4) send back
    resp := map[string]interface{}{
        "apartment_id": aptID,
        "date":         dateStr,
        "user_orders":  summaries,
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

// getDayType returns "EVEN" or "ODD" based on days since ref
// func getDayType(ref, curr time.Time) string {
//     if int(curr.Sub(ref).Hours()/24)%2 == 0 {
//         return "EVEN"
//     }
//     return "ODD"
// }

// GetDailyTotalSummary Handler

// GetDailyTotalSummary Handler
func GetDailyTotalSummary(w http.ResponseWriter, r *http.Request) {
    q := r.URL.Query()
    aptID := q.Get("apartment_id")
    dateStr := q.Get("date") // YYYY-MM-DD

    if aptID == "" || dateStr == "" {
        http.Error(w, "Missing required parameters", http.StatusBadRequest)
        return
    }

    const layout = "2006-01-02"
    currDate, err := time.Parse(layout, dateStr)
    if err != nil {
        http.Error(w, "Invalid date format", http.StatusBadRequest)
        return
    }

    // 1) Gather all users in the apartment
    userRows, err := config.DB.Query(`
        SELECT user_id, is_alternating_order
          FROM users
         WHERE apartment_id = $1
    `, aptID)
    if err != nil {
        log.Printf("Error fetching users: %v", err)
        http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
        return
    }
    defer userRows.Close()

    // Global ref for alternating defaults
    globalRef := time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC)

    // Accumulators
    modifiedTotals := make(map[string]float64)
    defaultTotals  := make(map[string]float64)

    for userRows.Next() {
        var userID string
        var isAlt bool
        if err := userRows.Scan(&userID, &isAlt); err != nil {
            http.Error(w, "Error scanning user", http.StatusInternalServerError)
            return
        }

        // 2) Find the single latest modification (normal OR alt)
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
             WHERE user_id = $1
               AND $2 BETWEEN start_date AND end_date
            UNION ALL
            SELECT order_id, created_at, start_date, day_type, 'alt' AS tbl
              FROM alternating_order_modifications
             WHERE user_id = $1
               AND $2 BETWEEN start_date AND end_date
            ORDER BY created_at DESC
            LIMIT 1
        `, userID, dateStr).Scan(
            &modOrderID, &modCreated, &modStart, &modDayType, &srcTable,
        )

        // Track which products this user modified
        var modifiedProducts = map[string]bool{}

        if err == nil {
            // We have a modification: load sums into modifiedTotals
            switch srcTable {

            case "normal":
                // Sum normal mod quantities
                rows, _ := config.DB.Query(`
                    SELECT product_id, modified_quantity
                      FROM order_modifications
                     WHERE order_id = $1
                `, modOrderID)
                defer rows.Close()
                for rows.Next() {
                    var pid string
                    var qty float64
                    rows.Scan(&pid, &qty)
                    modifiedTotals[pid] += qty
                    modifiedProducts[pid] = true
                }

            case "alt":
                // Determine dayType from this mod’s start_date
                startRef, pErr := time.Parse(time.RFC3339, modStart)
                if pErr != nil {
                    startRef, _ = time.Parse(layout, modStart[:10])
                }
                dayType := getDayType(startRef, currDate)

                // Sum only products of that dayType
                rows, _ := config.DB.Query(`
                    SELECT product_id, modified_quantity
                      FROM alternating_order_modifications
                     WHERE order_id = $1
                       AND day_type = $2
                `, modOrderID, dayType)
                defer rows.Close()
                for rows.Next() {
                    var pid string
                    var qty float64
                    rows.Scan(&pid, &qty)
                    modifiedTotals[pid] += qty
                    modifiedProducts[pid] = true
                }
            }
        }

        // 3) Fallback to defaults for any products this user did *not* modify
        if isAlt {
            // Alternating default: only the dayType for this date
            dayType := getDayType(globalRef, currDate)
            // Exclude products in modifiedProducts
            rows, _ := config.DB.Query(`
                SELECT product_id, quantity
                  FROM alternating_default_order_items
                 WHERE user_id = $1
                   AND day_type = $2
            `, userID, dayType)
            defer rows.Close()
            for rows.Next() {
                var pid string
                var qty float64
                rows.Scan(&pid, &qty)
                if !modifiedProducts[pid] {
                    defaultTotals[pid] += qty
                }
            }

        } else {
            // Normal default: all products except modified
            rows, _ := config.DB.Query(`
                SELECT product_id, quantity
                  FROM default_order_items
                 WHERE user_id = $1
            `, userID)
            defer rows.Close()
            for rows.Next() {
                var pid string
                var qty float64
                rows.Scan(&pid, &qty)
                if !modifiedProducts[pid] {
                    defaultTotals[pid] += qty
                }
            }
        }
    }

    // 4) Merge into final slice
    finalTotals := make([]map[string]interface{}, 0)

    for pid, qty := range modifiedTotals {
        finalTotals = append(finalTotals, map[string]interface{}{
            "product_id": pid, "quantity": qty,
        })
    }
    for pid, qty := range defaultTotals {
        if _, seen := modifiedTotals[pid]; !seen {
            finalTotals = append(finalTotals, map[string]interface{}{
                "product_id": pid, "quantity": qty,
            })
        }
    }

    // 5) Return JSON
    resp := map[string]interface{}{
        "apartment_id": aptID,
        "date":         dateStr,
        "totals":       finalTotals,
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}


func GetDailySalesSummary(w http.ResponseWriter, r *http.Request) {
    q := r.URL.Query()
    dateStr := q.Get("date") // YYYY-MM-DD

    if dateStr == "" {
        http.Error(w, "Missing required date parameter", http.StatusBadRequest)
        return
    }

    const layout = "2006-01-02"
    curr, err := time.Parse(layout, dateStr)
    if err != nil {
        http.Error(w, "Invalid date format", http.StatusBadRequest)
        return
    }

    globalRef := time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC)

    // Fetch all users and their apartment_id
    userRows, err := config.DB.Query(`
        SELECT user_id, apartment_id, is_alternating_order
          FROM users
    `)
    if err != nil {
        log.Printf("Error fetching users: %v", err)
        http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
        return
    }
    defer userRows.Close()

    type UserInfo struct {
        ApartmentID string
        IsAlt       bool
    }

    users := make(map[string]UserInfo)

    for userRows.Next() {
        var uid, aptID string
        var isAlt bool
        if err := userRows.Scan(&uid, &aptID, &isAlt); err != nil {
            http.Error(w, "Error scanning user", http.StatusInternalServerError)
            return
        }
        users[uid] = UserInfo{ApartmentID: aptID, IsAlt: isAlt}
    }

    // Aggregators
    type ProductSales struct {
        TotalQty float64
        ByApt    map[string]float64
        Price    float64
    }

    sales := make(map[string]*ProductSales)

    for uid, info := range users {
        aptID := info.ApartmentID
        isAlt := info.IsAlt

        // Check for modifications
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
             WHERE user_id=$1 AND $2 BETWEEN start_date AND end_date
            UNION ALL
            SELECT order_id, created_at, start_date, day_type, 'alt' AS tbl
              FROM alternating_order_modifications
             WHERE user_id=$1 AND $2 BETWEEN start_date AND end_date
            ORDER BY created_at DESC
            LIMIT 1
        `, uid, dateStr).Scan(&modOrderID, &modCreated, &modStart, &modDayType, &srcTable)

        usedProducts := make(map[string]bool)

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
                    var pid string
                    var qty float64
                    rows.Scan(&pid, &qty)
                    if qty < 0 {
                        continue
                    }
                    if _, ok := sales[pid]; !ok {
                        sales[pid] = &ProductSales{ByApt: make(map[string]float64)}
                    }
                    sales[pid].TotalQty += qty
                    sales[pid].ByApt[aptID] += qty
                    usedProducts[pid] = true
                }

            case "alt":
                startRef, parseErr := time.Parse(time.RFC3339, modStart)
                if parseErr != nil {
                    startRef, _ = time.Parse(layout, modStart[:10])
                }
                dayType := getDayType(startRef, curr)

                rows, _ := config.DB.Query(`
                    SELECT product_id, modified_quantity
                      FROM alternating_order_modifications
                     WHERE order_id=$1 AND day_type=$2
                `, modOrderID, dayType)
                defer rows.Close()
                for rows.Next() {
                    var pid string
                    var qty float64
                    rows.Scan(&pid, &qty)
                    if qty < 0 {
                        continue
                    }
                    if _, ok := sales[pid]; !ok {
                        sales[pid] = &ProductSales{ByApt: make(map[string]float64)}
                    }
                    sales[pid].TotalQty += qty
                    sales[pid].ByApt[aptID] += qty
                    usedProducts[pid] = true
                }
            }
        }

        // No modification → fallback to defaults
        if isAlt {
            dayType := getDayType(globalRef, curr)
            rows, _ := config.DB.Query(`
                SELECT product_id, quantity
                  FROM alternating_default_order_items
                 WHERE user_id=$1 AND day_type=$2
            `, uid, dayType)
            defer rows.Close()
            for rows.Next() {
                var pid string
                var qty float64
                rows.Scan(&pid, &qty)
                if qty < 0 || usedProducts[pid] {
                    continue
                }
                if _, ok := sales[pid]; !ok {
                    sales[pid] = &ProductSales{ByApt: make(map[string]float64)}
                }
                sales[pid].TotalQty += qty
                sales[pid].ByApt[aptID] += qty
            }

        } else {
            rows, _ := config.DB.Query(`
                SELECT product_id, quantity
                  FROM default_order_items
                 WHERE user_id=$1
            `, uid)
            defer rows.Close()
            for rows.Next() {
                var pid string
                var qty float64
                rows.Scan(&pid, &qty)
                if qty < 0 || usedProducts[pid] {
                    continue
                }
                if _, ok := sales[pid]; !ok {
                    sales[pid] = &ProductSales{ByApt: make(map[string]float64)}
                }
                sales[pid].TotalQty += qty
                sales[pid].ByApt[aptID] += qty
            }
        }
    }

    // Attach pricing info
    for pid, entry := range sales {
        var pricePerUnit float64
        if err := config.DB.QueryRow(`
            SELECT new_price FROM product_price_history
             WHERE product_id=$1 AND effective_from <= $2
             ORDER BY effective_from DESC LIMIT 1
        `, pid, curr).Scan(&pricePerUnit); err != nil {
            if err2 := config.DB.QueryRow(`
                SELECT old_price FROM product_price_history
                 WHERE product_id=$1
                 ORDER BY effective_from ASC LIMIT 1
            `, pid).Scan(&pricePerUnit); err2 != nil {
                if err3 := config.DB.QueryRow(`
                    SELECT current_price FROM products WHERE product_id=$1
                `, pid).Scan(&pricePerUnit); err3 != nil {
                    pricePerUnit = 0
                }
            }
        }
        entry.Price = pricePerUnit
    }

    // Prepare response
// Prepare response in desired format
output := make([]map[string]interface{}, 0)

for pid, entry := range sales {
    apartmentList := make([]map[string]interface{}, 0)
    for aptID, qty := range entry.ByApt {
        apartmentList = append(apartmentList, map[string]interface{}{
            "app1_id": aptID,
            "qty":     qty,
        })
    }

    output = append(output, map[string]interface{}{
        "pid":        pid,
        "tqty":       entry.TotalQty,
        "price":      entry.Price,
        "apartments": apartmentList,
    })
}


    resp := map[string]interface{}{
        "date":   dateStr,
        "sales":  output,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}
