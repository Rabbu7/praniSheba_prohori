import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.jpeg';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { selectedDeviceId } = useDevice();
  const role = user?.role || 'farmer';
  const isFarmer = role === 'farmer';
  const deviceLabel = selectedDeviceId ? `Device: ${selectedDeviceId}` : 'Device: —';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = () => {
    if (role === 'admin') {
      return [
        { to: '/admin', icon: 'dashboard', label: 'Overview', mobileLabel: 'Overview', end: true },
        { to: '/admin/managers', icon: 'group', label: 'Managers', mobileLabel: 'Managers' },
        { to: '/profile', icon: 'account_circle', label: 'Profile', mobileLabel: 'Profile' },
      ];
    }
    if (role === 'manager') {
      return [
        { to: '/manager', icon: 'dashboard', label: 'Overview', mobileLabel: 'Overview', end: true },
        { to: '/manager/farmers', icon: 'group', label: 'Farmers', mobileLabel: 'Farmers' },
        { to: '/manager/requests', icon: 'pending_actions', label: 'Requests', mobileLabel: 'Requests' },
        { to: '/profile', icon: 'account_circle', label: 'Profile', mobileLabel: 'Profile' },
      ];
    }
    // Farmer
    return [
      { to: '/', icon: 'dashboard', label: 'Dashboard', mobileLabel: 'Dashboard', end: true },
      { to: '/history', icon: 'history', label: 'History', mobileLabel: 'History' },
      { to: '/calendar', icon: 'calendar_month', label: 'Calendar', mobileLabel: 'Calendar' },
      { to: '/devices', icon: 'devices', label: 'My Devices', mobileLabel: 'Devices' },
      { to: '/profile', icon: 'account_circle', label: 'Profile', mobileLabel: 'Profile' },
    ];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-screen w-sidebar-width flex-col py-6 px-0 border-r border-border-subtle bg-sidebar-bg z-10">
        <div className="px-2 mb-8 flex flex-col items-center">
          <img src={logo} alt="Prohori Logo" className="w-12 h-auto rounded-full" />
        </div>
        <div className="flex-1 px-2 space-y-4 flex flex-col items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-300 ease-in-out ${
                isActive
                  ? 'text-white bg-primary-container/20 hover:bg-primary-container/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
            </NavLink>
          ))}
          {isFarmer && (
            <a
              className="flex items-center justify-center w-12 h-12 text-gray-600 cursor-not-allowed rounded-lg transition-all duration-300 ease-in-out"
              href="#"
              title="Settings"
              aria-label="Settings"
              onClick={(e) => e.preventDefault()}
            >
              <span className="material-symbols-outlined">settings</span>
            </a>
          )}
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
          {isFarmer && (
            <div
              className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-300"
              title={deviceLabel}
            >
              <div className="w-2 h-2 rounded-full bg-status-online animate-glow-pulse" />
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-sidebar-bg border-t border-white/10 flex items-center justify-around z-20 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `flex flex-col items-center ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            title={item.label}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="text-[10px] mt-0.5">{item.mobileLabel}</span>
          </NavLink>
        ))}
        {isFarmer && (
          <a
            className="flex flex-col items-center text-gray-600 cursor-not-allowed"
            href="#"
            title="Settings"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-[10px] mt-0.5">Settings</span>
          </a>
        )}
        <button
          className="flex flex-col items-center text-gray-400 hover:text-white"
          type="button"
          title="Log out"
          aria-label="Log out"
          onClick={handleLogout}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-[10px] mt-0.5">Logout</span>
        </button>
        {isFarmer && (
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 border border-white/10" title={deviceLabel}>
            <div className="w-2 h-2 rounded-full bg-status-online animate-glow-pulse" />
          </div>
        )}
      </nav>
    </>
  );
}
