import React from 'react';

export default function Sidebar() {
  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-screen w-sidebar-width flex-col py-6 px-0 border-r border-border-subtle bg-[#0F172A] z-10">
        <div className="px-2 mb-8 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white p-1 flex items-center justify-center font-bold text-primary text-xl shadow-sm">
            P
          </div>
        </div>
        <div className="flex-1 px-2 space-y-4 flex flex-col items-center">
          <a
            className="flex items-center justify-center w-12 h-12 text-white bg-primary-container/20 rounded-lg transition-all duration-300 ease-in-out hover:bg-primary-container/40"
            href="#"
            title="Dashboard"
          >
            <span className="material-symbols-outlined">dashboard</span>
          </a>
          <a
            className="flex items-center justify-center w-12 h-12 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300 ease-in-out"
            href="#"
            title="History"
          >
            <span className="material-symbols-outlined">history</span>
          </a>
          <a
            className="flex items-center justify-center w-12 h-12 text-gray-600 cursor-not-allowed rounded-lg transition-all duration-300 ease-in-out"
            href="#"
            title="Settings"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined">settings</span>
          </a>
        </div>
        <div className="px-2 mt-auto flex justify-center">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-300"
            title="Device: G3036"
          >
            <div className="w-2 h-2 rounded-full bg-status-online animate-glow-pulse"></div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0F172A] border-t border-white/10 flex items-center justify-around z-20 px-4">
        <a className="flex flex-col items-center text-white" href="#" title="Dashboard">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </a>
        <a className="flex flex-col items-center text-gray-400 hover:text-white" href="#" title="History">
          <span className="material-symbols-outlined">history</span>
          <span className="text-[10px] mt-0.5">History</span>
        </a>
        <a
          className="flex flex-col items-center text-gray-600 cursor-not-allowed"
          href="#"
          title="Settings"
          onClick={(e) => e.preventDefault()}
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="text-[10px] mt-0.5">Settings</span>
        </a>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10" title="Device: G3036">
          <div className="w-2 h-2 rounded-full bg-status-online animate-glow-pulse"></div>
        </div>
      </nav>
    </>
  );
}
