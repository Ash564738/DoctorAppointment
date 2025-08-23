import React from "react";
import { Routes, Route } from "react-router-dom";
import PatientDashboard from "../pages/Patient/PatientDashboard/PatientDashboard";
import PatientAppointments from "../pages/Patient/PatientAppointments/PatientAppointments";
import PatientRecords from "../pages/Patient/PatientRecords/PatientRecords";
import BookAppointment from "../pages/Patient/FindDoctors/FindDoctors"; 
import DoctorRatings from "../pages/Patient/Ratings/Ratings";
import PatientPayments from "../pages/Patient/PaymentBilling/PaymentBilling";
import FamilyProfiles from "../pages/Patient/FamilyProfiles/FamilyProfiles";

const PatientRoutes = () => (
  <Routes>
    <Route index element={<PatientDashboard />} />
    <Route path="dashboard" element={<PatientDashboard />} />
    <Route path="doctors" element={<BookAppointment />} />
    <Route path="appointments" element={<PatientAppointments />} />
    <Route path="medical-records" element={<PatientRecords />} />
    <Route path="ratings" element={<DoctorRatings />} />
    <Route path="payments" element={<PatientPayments />} />
    <Route path="family" element={<FamilyProfiles />} />
  </Routes>
);

export default PatientRoutes;
