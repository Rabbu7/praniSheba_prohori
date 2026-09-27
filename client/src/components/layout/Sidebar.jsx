import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.jpeg';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-screen w-sidebar-width flex-col py-6 px-0 border-r border-border-subtle bg-sidebar-bg z-10">
        <div className="px-2 mb-8 flex flex-col items-center">
          <img src={logo} alt="Prohori Logo" className="w-12 h-auto rounded-full" />
        </div>
        <div className="flex-1 px-2 space-y-4 flex flex-col items-center">
          <NavLink
            to="/"
            className={({ isActive }) => `flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-300 ease-in-out ${
              isActive
                ? 'text-white bg-primary-container/20 hover:bg-primary-container/40'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Dashboard"
          >
            <span className="material-symbols-outlined">dashboard</span>
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) => `flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-300 ease-in-out ${
              isActive
                ? 'text-white bg-primary-container/20 hover:bg-primary-container/40'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="History"
          >
            <span className="material-symbols-outlined">history</span>
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) => `flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-300 ease-in-out ${
              isActive
                ? 'text-white bg-primary-container/20 hover:bg-primary-container/40'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Calendar"
          >
            <span className="material-symbols-outlined">calendar_month</span>
          </NavLink>
          <a
            className="flex items-center justify-center w-12 h-12 text-gray-600 cursor-not-allowed rounded-lg transition-all duration-300 ease-in-out"
            href="#"
            title="Settings"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined">settings</span>
          </a>
        </div>
        <div className="mt-auto flex flex-col items-center gap-3 px-2">
          <button
            className="flex h-12 w-12 items-center justify-center rounded-lg text-gray-400 transition-all duration-300 ease-in-out hover:bg-white/10 hover:text-white"
            type="button"
            title="Log out"
            aria-label="Log out"
            onClick={handleLogout}
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
          <div
            className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-300"
            title="Device: G3036"
          >
            <div className="w-2 h-2 rounded-full bg-status-online animate-glow-pulse"></div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-sidebar-bg border-t border-white/10 flex items-center justify-around z-20 px-4">
        <NavLink
          to="/"
          className={({ isActive }) => `flex flex-col items-center ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          title="Dashboard"
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) => `flex flex-col items-center ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          title="History"
        >
          <span className="material-symbols-outlined">history</span>
          <span className="text-[10px] mt-0.5">History</span>
        </NavLink>
        <NavLink
          to="/calendar"
          className={({ isActive }) => `flex flex-col items-center ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          title="Calendar"
        >
          <span className="material-symbols-outlined">calendar_month</span>
          <span className="text-[10px] mt-0.5">Calendar</span>
        </NavLink>
        <a
          className="flex flex-col items-center text-gray-600 cursor-not-allowed"
          href="#"
          title="Settings"
          onClick={(e) => e.preventDefault()}
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="text-[10px] mt-0.5">Settings</span>
        </a>
        <button
          className="flex flex-col items-center text-gray-400 hover:text-white"
          type="button"
          title="Log out"
          aria-label="Log out"
          onClick={handleLogout}
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-[10px] mt-0.5">Log out</span>
        </button>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10" title="Device: G3036">
          <div className="w-2 h-2 rounded-full bg-status-online animate-glow-pulse"></div>
        </div>
      </nav>
    </>
  );
}
