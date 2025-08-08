import React, { lazy, Suspense } from "react";
// Main CSS entry point - includes all styles in proper order
import "./styles/index.css";
import "./styles/accessibility.css";
// Component-specific styles
import "./styles/navbar.css";
import "./styles/sidebar.css";
import "./styles/hero.css";
import "./styles/Home.css";
import "./styles/homecircles.css";
import "./styles/footer.css";
import "./styles/user.css";
import "./styles/doctorcard.css";
import "./styles/doctors.css";
import "./styles/profile.css";
import "./styles/register.css";
import "./styles/bookappointment.css";
import "./styles/contact.css";
import "./styles/notification.css";
import "./styles/payment.css";
import "./styles/chat.css";
import "./styles/error.css";
import "./styles/reminder.css";
import "./styles/floating-chat.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Protected, Public, Admin } from "./middleware/route";
import Loading from "./components/Loading";
import ErrorBoundary from "./components/ErrorBoundary";
import AccessibilityProvider from "./components/AccessibilityProvider";
import FloatingChatButton from "./components/FloatingChatButton";
import AppointmentReminder from "./components/AppointmentReminder";

// Lazy load all components for better performance
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

const Home = lazy(() => import("./pages/Home"));
const Appointments = lazy(() => import("./pages/Appointments"));
const PatientAppointments = lazy(() => import("./pages/PatientAppointments"));
const Doctors = lazy(() => import("./pages/Doctors"));
const Profile = lazy(() => import("./pages/Profile"));
const Change = lazy(() => import("./pages/ChangePassword"));
const Notifications = lazy(() => import("./pages/Notifications"));

const Error = lazy(() => import("./pages/Error"));

function App() {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <Router>
          <Toaster />
          <div className="App" id="main-content">
            <Suspense fallback={<Loading />}>

        <Routes>
          <Route
            path="/login"
            element={
              <Suspense fallback={<Loading />}>
                <Login />
              </Suspense>
            }
          />
          <Route
            path="/forgotpassword"
            element={
              <Suspense fallback={<Loading />}>
                <ForgotPassword />
              </Suspense>
            }
          />
          <Route
            path="/resetpassword/:id/:token"
            element={
              <Suspense fallback={<Loading />}>
                <ResetPassword />
              </Suspense>
            }
          />
          <Route
            path="/register"
            element={
              <Public>
                <Suspense fallback={<Loading />}>
                  <Register />
                </Suspense>
              </Public>
            }
          />
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route
            path="/appointments"
            element={
              <Protected>
                <Appointments />
              </Protected>
            }
          />
          <Route
            path="/my-appointments"
            element={
              <Protected>
                <PatientAppointments />
              </Protected>
            }
          />
          <Route
            path="/notifications"
            element={
              <Protected>
                <Notifications />
              </Protected>
            }
          />

          <Route
            path="/profile"
            element={
              <Protected>
                <Profile />
              </Protected>
            }
          />
          <Route
            path="/ChangePassword"
            element={
              <Protected>
                <Change />
              </Protected>
            }
          />
          <Route
            path="/dashboard/home"
            element={
              <Admin>
                <Dashboard type ={"home"} />
              </Admin>
            }
          />
          <Route
            path="/dashboard/users"
            element={
              <Admin>
                <Dashboard type={"users"} />
              </Admin>
            }
          />
          <Route
            path="/dashboard/doctors"
            element={
              <Admin>
                <Dashboard type={"doctors"} />
              </Admin>
            }
          />
          <Route
            path="/dashboard/appointments"
            element={
              <Admin>
                <Dashboard type={"appointments"} />
              </Admin>
            }
          />
          <Route
            path="/dashboard/applications"
            element={
              <Admin>
                <Dashboard type={"applications"} />
              </Admin>
            }
          />
          <Route
            path="/dashboard/aprofile"
            element={
              <Admin>
                <Dashboard type={"aprofile"} />
              </Admin>
            }
          />
          <Route path="*" element={<Error />} />
            </Routes>
            </Suspense>
            <AppointmentReminder />
            <FloatingChatButton />
          </div>
        </Router>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}

export default App;
