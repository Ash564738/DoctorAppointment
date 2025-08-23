import React from "react";
import { Routes, Route } from "react-router-dom";
import DoctorDashboard from "../pages/Doctor/DoctorDashboard/DoctorDashboard";
import DoctorAppointments from "../pages/Doctor/DoctorAppointments/DoctorAppointments";
import ShiftLeaveManagement from "../pages/Doctor/ShiftManagement/ShiftManagement";
import DoctorRecords from "../pages/Doctor/DoctorRecords/DoctorRecords";
import DoctorAnalytics from "../pages/Doctor/DoctorAnalytics/DoctorAnalytics";

const DoctorRoutes = () => (
  <Routes>
    <Route index element={<DoctorDashboard />} />
    <Route path="dashboard" element={<DoctorDashboard />} />
    <Route path="appointments" element={<DoctorAppointments />} />
    <Route path="medical-records" element={<DoctorRecords />} />
    <Route path="schedule" element={<ShiftLeaveManagement />} />
    <Route path="analytics" element={<DoctorAnalytics />} />
    <Route path="earnings" element={<DoctorAnalytics />} />
    <Route path="ratings" element={<DoctorAnalytics />} />
  </Routes>
);

export default DoctorRoutes;
