import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Existing components
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import ApplyDoctor from '../pages/ApplyDoctor';
import Appointments from '../pages/Appointments';
import PatientAppointments from '../pages/PatientAppointments';
import Doctors from '../pages/Doctors';
import Profile from '../pages/Profile';
import Notifications from '../pages/Notifications';
import ChangePassword from '../pages/ChangePassword';
import ForgotPassword from '../pages/ForgotPassword';
import Error from '../pages/Error';

// Enhanced components
import EnhancedDashboard from '../components/EnhancedDashboard';
import ShiftManagement from '../components/ShiftManagement';
import EnhancedBookAppointment from '../components/EnhancedBookAppointment';
import MedicalRecords from '../components/MedicalRecords';
import LeaveManagement from '../components/LeaveManagement';

// Admin components
import AdminApplications from '../components/AdminApplications';
import AdminAppointments from '../components/AdminAppointments';
import AdminDoctors from '../components/AdminDoctors';
import Users from '../components/Users';

const AppRoutes = () => {
  const { userInfo: user } = useSelector(state => state.root);

  // Protected route wrapper
  const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  // Public route wrapper (redirect to dashboard if already logged in)
  const PublicRoute = ({ children }) => {
    if (user) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      <Route path="/forgot-password" element={
        <PublicRoute>
          <ForgotPassword />
        </PublicRoute>
      } />

      {/* Protected Routes - All authenticated users */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <EnhancedDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      
      <Route path="/change-password" element={
        <ProtectedRoute>
          <ChangePassword />
        </ProtectedRoute>
      } />
      
      <Route path="/notifications" element={
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      } />

      {/* Patient Routes */}
      <Route path="/doctors" element={
        <ProtectedRoute allowedRoles={['Patient']}>
          <Doctors />
        </ProtectedRoute>
      } />
      
      <Route path="/book-appointment" element={
        <ProtectedRoute allowedRoles={['Patient']}>
          <EnhancedBookAppointment />
        </ProtectedRoute>
      } />
      
      <Route path="/my-appointments" element={
        <ProtectedRoute allowedRoles={['Patient']}>
          <PatientAppointments />
        </ProtectedRoute>
      } />
      
      <Route path="/my-medical-records" element={
        <ProtectedRoute allowedRoles={['Patient']}>
          <MedicalRecords />
        </ProtectedRoute>
      } />

      {/* Doctor Routes */}
      <Route path="/doctor-appointments" element={
        <ProtectedRoute allowedRoles={['Doctor']}>
          <Appointments />
        </ProtectedRoute>
      } />
      
      <Route path="/shift-management" element={
        <ProtectedRoute allowedRoles={['Doctor']}>
          <ShiftManagement />
        </ProtectedRoute>
      } />
      
      <Route path="/patient-records" element={
        <ProtectedRoute allowedRoles={['Doctor']}>
          <MedicalRecords />
        </ProtectedRoute>
      } />
      
      <Route path="/leave-requests" element={
        <ProtectedRoute allowedRoles={['Doctor']}>
          <LeaveManagement />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['Admin']}>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/applications" element={
        <ProtectedRoute allowedRoles={['Admin']}>
          <AdminApplications />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/appointments" element={
        <ProtectedRoute allowedRoles={['Admin']}>
          <AdminAppointments />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/doctors" element={
        <ProtectedRoute allowedRoles={['Admin']}>
          <AdminDoctors />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['Admin']}>
          <Users />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/leave-management" element={
        <ProtectedRoute allowedRoles={['Admin']}>
          <LeaveManagement />
        </ProtectedRoute>
      } />

      {/* Shared Routes - Doctors and Admin */}
      <Route path="/apply-doctor" element={
        <ProtectedRoute allowedRoles={['Patient']}>
          <ApplyDoctor />
        </ProtectedRoute>
      } />

      {/* Legacy route redirects */}
      <Route path="/appointments" element={
        <ProtectedRoute>
          {user?.role === 'Patient' ? 
            <Navigate to="/my-appointments" replace /> : 
            <Navigate to="/doctor-appointments" replace />
          }
        </ProtectedRoute>
      } />

      {/* Error and fallback routes */}
      <Route path="/error" element={<Error />} />
      <Route path="*" element={<Navigate to="/error" replace />} />
    </Routes>
  );
};

export default AppRoutes;
