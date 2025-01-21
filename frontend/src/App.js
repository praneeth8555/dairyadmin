import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import AdminLogin from "./screens/AdminLogin";
import ManagementPanel from "./screens/ManagementPanel";
import ProductManagement from "./screens/ProductManagement";
import ManageCustomers from "./screens/ManageCustomers";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminLogin />} />
        <Route path="/managementpanel" element={<ManagementPanel />} />
        <Route path="/products" element={<ProductManagement/>}/>
        <Route path="/customers" element={<ManageCustomers />} />

      </Routes>
    </Router>
  );
}

export default App;
