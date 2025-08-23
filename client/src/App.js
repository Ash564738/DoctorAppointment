import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { jwtDecode } from "jwt-decode";

// Global / shared styles (retain existing naming until normalization step)
import "./styles/index.css";
import "./styles/app.css";
import "./styles/variables.css";

// Role-based route components
import PatientRoutes from "./routes/PatientRoutes";
import DoctorRoutes from "./routes/DoctorRoutes";
import AdminRoutes from "./routes/AdminRoutes";
import AuthenticatedRoute from "./routes/AuthenticatedRoute";


import ErrorBoundary from "./components/Common/ErrorBoundary/ErrorBoundary";
import Loading from "./components/Common/Loading/Loading";
import FloatingChatButton from "./components/Common/ChatButton/ChatButton";
import AccessibilityProvider from "./components/Common/Accessibility/AccessibilityProvider";
import { PatientProtected, DoctorProtected, AdminProtected, Public } from "./middleware/route";

const Home = lazy(() => import("./pages/Common/Home/Home"));
const Login = lazy(() => import("./pages/Common/Login/Login"));
const Register = lazy(() => import("./pages/Common/Register/Register"));
const ForgotPassword = lazy(() => import("./pages/Common/ForgotPassword/ForgotPassword"));
const Doctors = lazy(() => import("./pages/Patient/FindDoctors/FindDoctors"));
const Error = lazy(() => import("./pages/Common/Error/Error"));
const Profile = lazy(() => import("./pages/Common/Profile/Profile"));
const Notifications = lazy(() => import("./pages/Common/Notifications/Notifications"));
const ChangePassword = lazy(() => import("./pages/Common/ChangePassword/ChangePassword"));

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Toaster />
        <div className="app-container" id="main-content">
            <Suspense fallback={<Loading />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Public><Login /></Public>} />
                <Route path="/register" element={<Public><Register /></Public>} />
                <Route path="/forgotpassword" element={<Public><ForgotPassword /></Public>} />
                <Route path="/doctors" element={<Doctors />} />

                {/* Global authenticated routes (available to all logged-in users) */}
                <Route path="/profile" element={<AuthenticatedRoute><Profile /></AuthenticatedRoute>} />
                <Route path="/notifications" element={<AuthenticatedRoute><Notifications /></AuthenticatedRoute>} />
                <Route path="/changepassword" element={<AuthenticatedRoute><ChangePassword /></AuthenticatedRoute>} />                

                {/* Role-based groups */}
                <Route path="patient/*" element={
                  <PatientProtected>
                    <PatientRoutes />
                  </PatientProtected>
                } />
                <Route path="doctor/*" element={
                  <DoctorProtected>
                    <DoctorRoutes />
                  </DoctorProtected>
                } />
                <Route path="admin/*" element={
                  <AdminProtected>
                    <AdminRoutes />
                  </AdminProtected>
                } />

                {/* Fallback */}
                <Route path="*" element={<Error />} />
              </Routes>
            </Suspense>
            
            {/* Global Floating Chat Button */}
            <FloatingChatButton />
            <AccessibilityProvider />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
