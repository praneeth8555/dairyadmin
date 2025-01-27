import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import AuthProvider from "./AuthContext";
import PrivateRoute from "./PrivateRoute";
import AdminLogin from "./screens/AdminLogin";
import ManagementPanel from "./screens/ManagementPanel";
import ProductManagement from "./screens/ProductManagement";
import ManageCustomers from "./screens/ManageCustomers";
import OrdersPage from "./screens/OrdersPage";
import DailyOrderSummary from "./screens/DailyOrderSummary";
import CustomerSorting from "./screens/CustomerSorting";
import MonthlyBilling from "./screens/MonthlyBilling";



function App() {
  return (
    <AuthProvider>
    <Router>
      <Routes>
        <Route path="/" element={<AdminLogin />} />
        <Route element={<PrivateRoute />}>
          <Route path="/managementpanel" element={<ManagementPanel />} />
          <Route path="/products" element={<ProductManagement/>}/>
          <Route path="/customers" element={<ManageCustomers />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/summary" element={<DailyOrderSummary />} />
          <Route path="/sorting" element={<CustomerSorting/>}/>
          <Route path="/billing" element={<MonthlyBilling />} />
        </Route>
      </Routes>
    </Router>
    </AuthProvider>
  );
}

export default App;
