import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, ArrowLeftRight, CreditCard, Shield, Code2 } from 'lucide-react';
import { useRole } from '../hooks/useRole';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, toggleRole, isAdmin } = useRole();

  return (
    <div className="min-h-screen bg-[#f7fafc] text-slate-800 flex flex-col lg:flex-row">
      {/* Sidebar Component */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-[250px] flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Open Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100">
                PST_PD_153 Sandbox
              </span>
            </div>
          </div>

          {/* Right Header Navigation & Role Switcher */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Role Switcher Button */}
            <button
              onClick={toggleRole}
              title={`Click to switch to ${isAdmin ? 'Developer' : 'Admin'} view`}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                isAdmin
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              {isAdmin ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  <span>Admin Mode</span>
                </>
              ) : (
                <>
                  <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Developer Mode</span>
                </>
              )}
            </button>

            <Link
              to="/transfer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Transfer</span>
            </Link>
            <Link
              to="/accounts/new"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e3a5f] hover:bg-[#2c5282] text-white shadow-sm transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>New Account</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Page Outlet */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
