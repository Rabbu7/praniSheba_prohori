import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Calendar from './pages/Calendar';
import Login from './pages/Login';
import Register from './pages/Register';
import LinkDevice from './pages/LinkDevice';

function AuthLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface text-sm text-secondary">
      Checking your session...
    </main>
  );
}

function RequireAuth({ children, requireDevice = false, redirectLinkedDevice = false }) {
  const { user, token, loading } = useAuth();

  if (loading) return <AuthLoading />;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (requireDevice && !user.device) return <Navigate to="/link-device" replace />;
  if (redirectLinkedDevice && user.device) return <Navigate to="/" replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const { user, token, loading } = useAuth();

  if (loading) return <AuthLoading />;
  if (token && user) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
        <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
        <Route path="/link-device" element={<RequireAuth redirectLinkedDevice><LinkDevice /></RequireAuth>} />
        <Route path="/" element={<RequireAuth requireDevice><Dashboard /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth requireDevice><History /></RequireAuth>} />
        <Route path="/calendar" element={<RequireAuth requireDevice><Calendar /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
