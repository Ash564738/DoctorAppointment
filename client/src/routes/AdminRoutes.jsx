import React from "react";
import { Routes, Route } from "react-router-dom";
import AdminDashboard from "../pages/Admin/AdminDashboard/AdminDashboard";
import UserManagement from "../pages/Admin/UserManagement/UserManagement";
import DoctorManagement from "../pages/Admin/DoctorManagement/DoctorManagement";
import AppointmentManagement from "../pages/Admin/AppointmentManagement/AppointmentManagement";
import DoctorScheduling from "../pages/Admin/DoctorScheduling/DoctorScheduling";
import BillingReports from "../pages/Admin/BillingReports/BillingReports";

const AdminRoutes = () => (
  <Routes>
    <Route index element={<AdminDashboard />} />
    <Route path="dashboard" element={<AdminDashboard />} />
    <Route path="home" element={<AdminDashboard />} />
    <Route path="users" element={<UserManagement />} />
    <Route path="doctors" element={<DoctorManagement />} />
    <Route path="appointments" element={<AppointmentManagement />} />
    <Route path="schedule" element={<DoctorScheduling />} />
    <Route path="billing" element={<BillingReports />} />
  </Routes>
);

export default AdminRoutes;
