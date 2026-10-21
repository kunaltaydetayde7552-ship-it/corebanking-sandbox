import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Landmark,
  Home,
  Users,
  CreditCard,
  ArrowLeftRight,
  Send,
  FileText,
  Settings,
  HelpCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useRole } from '../hooks/useRole';

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { isAdmin } = useRole();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home, end: true },
    { name: 'Customers', path: '/customers', icon: Users, end: false },
    { name: 'Accounts', path: '/accounts', icon: CreditCard, end: false },
    { name: 'Statement', path: '/statement', icon: FileText, end: false },
    { name: 'Transactions', path: '/transactions', icon: ArrowLeftRight, end: false },
    { name: 'Fund Transfer', path: '/transfer', icon: Send, end: false },
    ...(isAdmin ? [{ name: 'Admin Settings', path: '/admin', icon: Settings, end: false }] : []),
    { name: 'About & Rules', path: '/about', icon: HelpCircle, end: false },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[250px] bg-[#1e3a5f] text-white flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Logo & Brand Header */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-slate-700/60">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight text-white leading-tight">
                  CoreBanking
                </div>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-teal-300">
                    Sandbox
                  </span>
                </div>
              </div>
            </div>
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden text-slate-300 hover:text-white p-1 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.end
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onClose && onClose()}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#2c5282] text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:bg-[#2c5282]/40 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? 'text-teal-300' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info card */}
        <div className="p-4 border-t border-slate-700/60">
          <div className="bg-[#152943] rounded-lg p-3 text-xs border border-slate-700/50">
            <div className="flex items-center space-x-1.5 text-teal-300 font-semibold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>FinTech Sandbox</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              ID: PST_PD_153
            </p>
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Environment:</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                ONLINE
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
