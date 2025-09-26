import React from "react";
import { Routes, Route } from "react-router-dom";
import DoctorDashboard from "../pages/Doctor/DoctorDashboard/DoctorDashboard";
import DoctorAppointments from "../pages/Doctor/DoctorAppointments/DoctorAppointments";
import ShiftLeaveManagement from "../pages/Doctor/ShiftManagement/ShiftManagement";
import DoctorRecords from "../pages/Doctor/DoctorRecords/DoctorRecords";
import DoctorEarning from "../pages/Doctor/DoctorEarning/DoctorEarning";
import DoctorRating from "../pages/Doctor/DoctorRating/DoctorRating";

const DoctorRoutes = () => (
  <Routes>
    <Route index element={<DoctorDashboard />} />
    <Route path="dashboard" element={<DoctorDashboard />} />
    <Route path="appointments" element={<DoctorAppointments />} />
    <Route path="medical-records" element={<DoctorRecords />} />
    <Route path="schedule" element={<ShiftLeaveManagement />} />
    <Route path="earnings" element={<DoctorEarning />} />
    <Route path="ratings" element={<DoctorRating />} />
  </Routes>
);

export default DoctorRoutes;
