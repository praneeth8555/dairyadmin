import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import AdminLogin from "./screens/AdminLogin";
import ManagementPanel from "./screens/ManagementPanel";
import ProductManagement from "./screens/ProductManagement";
import ManageCustomers from "./screens/ManageCustomers";
import OrdersPage from "./screens/OrdersPage";
import DailyOrderSummary from "./screens/DailyOrderSummary";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminLogin />} />
        <Route path="/managementpanel" element={<ManagementPanel />} />
        <Route path="/products" element={<ProductManagement/>}/>
        <Route path="/customers" element={<ManageCustomers />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/summary" element={<DailyOrderSummary />} />
      </Routes>
    </Router>
  );
}

export default App;
