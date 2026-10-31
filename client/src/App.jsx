import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { roleHome } from './utils/roleHome';
import useFarmerSync from './hooks/useFarmerSync';

import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Calendar from './pages/Calendar';
import Login from './pages/Login';
import Register from './pages/Register';
import LinkDevice from './pages/LinkDevice';
import Devices from './pages/Devices';
import CompleteProfile from './pages/CompleteProfile';
import Profile from './pages/Profile';
import ManagerOverview from './pages/manager/Overview';
import ManagerFarmers from './pages/manager/Farmers';
import ManagerFarmerDetail from './pages/manager/FarmerDetail';
import ManagerFarmerDevice from './pages/manager/FarmerDevice';
import ManagerRequests from './pages/manager/Requests';
import AdminOverview from './pages/admin/Overview';
import AdminManagers from './pages/admin/Managers';

function AuthLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface text-sm text-secondary">
      Checking your session...
    </main>
  );
}

function FarmerSyncWatcher() {
  useFarmerSync();
  return null;
}

function RedirectIfAuthed({ children }) {
  const { user, token, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (token && user) return <Navigate to={roleHome(user)} replace />;
  return children;
}

function CompleteProfileGuard({ children }) {
  const { user, token, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'manager') return <Navigate to="/manager" replace />;
  if (user.role === 'farmer' && user.profileComplete) return <Navigate to="/" replace />;
  return (
    <>
      <FarmerSyncWatcher />
      {children}
    </>
  );
}

function FarmerDataGuard({ children }) {
  const { user, token, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'manager') return <Navigate to="/manager" replace />;
  if (user.role === 'farmer') {
    if (!user.profileComplete) return <Navigate to="/complete-profile" replace />;
    if (!user.devices || user.devices.length === 0) return <Navigate to="/devices" replace />;
  }
  return (
    <>
      <FarmerSyncWatcher />
      {children}
    </>
  );
}

function FarmerDeviceGuard({ children }) {
  const { user, token, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'manager') return <Navigate to="/manager" replace />;
  if (user.role === 'farmer' && !user.profileComplete) {
    return <Navigate to="/complete-profile" replace />;
  }
  return (
    <>
      <FarmerSyncWatcher />
      {children}
    </>
  );
}

function ProfileGuard({ children }) {
  const { user, token, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role === 'farmer' && !user.profileComplete) {
    return <Navigate to="/complete-profile" replace />;
  }
  return (
    <>
      {user.role === 'farmer' && <FarmerSyncWatcher />}
      {children}
    </>
  );
}

function ManagerGuard({ children }) {
  const { user, token, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role !== 'manager') return <Navigate to={roleHome(user)} replace />;
  return children;
}

function AdminGuard({ children }) {
  const { user, token, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to={roleHome(user)} replace />;
  return children;
}

function RootCatchAll() {
  const { user, token, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!token || !user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
        <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
        <Route path="/complete-profile" element={<CompleteProfileGuard><CompleteProfile /></CompleteProfileGuard>} />

        {/* Farmer reading pages */}
        <Route path="/" element={<FarmerDataGuard><Dashboard /></FarmerDataGuard>} />
        <Route path="/history" element={<FarmerDataGuard><History /></FarmerDataGuard>} />
        <Route path="/calendar" element={<FarmerDataGuard><Calendar /></FarmerDataGuard>} />

        {/* Farmer device pages */}
        <Route path="/devices" element={<FarmerDeviceGuard><Devices /></FarmerDeviceGuard>} />
        <Route path="/link-device" element={<FarmerDeviceGuard><LinkDevice /></FarmerDeviceGuard>} />

        {/* Profile (all roles) */}
        <Route path="/profile" element={<ProfileGuard><Profile /></ProfileGuard>} />

        {/* Manager routes */}
        <Route path="/manager" element={<ManagerGuard><ManagerOverview title="Overview" /></ManagerGuard>} />
        <Route path="/manager/farmers" element={<ManagerGuard><ManagerFarmers /></ManagerGuard>} />
        <Route path="/manager/farmers/:farmerId" element={<ManagerGuard><ManagerFarmerDetail /></ManagerGuard>} />
        <Route path="/manager/farmers/:farmerId/devices/:deviceId" element={<ManagerGuard><ManagerFarmerDevice /></ManagerGuard>} />
        <Route path="/manager/requests" element={<ManagerGuard><ManagerRequests /></ManagerGuard>} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminGuard><AdminOverview title="Overview" /></AdminGuard>} />
        <Route path="/admin/managers" element={<AdminGuard><AdminManagers /></AdminGuard>} />

        {/* Fallback to role home */}
        <Route path="*" element={<RootCatchAll />} />
      </Routes>
    </BrowserRouter>
  );
}
