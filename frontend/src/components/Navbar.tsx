import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ticket, Film, Shield, LayoutDashboard, LogOut, User as UserIcon, Clock } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="border-b border-slate-800/80 bg-navy-900/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Ticket className="h-5 w-5 text-navy-950 font-bold" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                Show<span className="text-brand-500">Reserve</span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider font-semibold uppercase -mt-1">
                Real-Time Ticketing
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/events"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-brand-400 transition-colors"
            >
              <Film className="h-4 w-4" />
              Events & Movies
            </Link>

            {isAuthenticated && user?.role === 'CUSTOMER' && (
              <Link
                to="/bookings"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-brand-400 transition-colors"
              >
                <Ticket className="h-4 w-4" />
                My Tickets
              </Link>
            )}

            {isAuthenticated && (user?.role === 'ORGANISER' || user?.role === 'ADMIN') && (
              <Link
                to="/organiser/dashboard"
                className="flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Organiser Portal
              </Link>
            )}

            {isAuthenticated && user?.role === 'ADMIN' && (
              <Link
                to="/admin/venues"
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Shield className="h-4 w-4" />
                Admin Venues
              </Link>
            )}
          </div>

          {/* User Auth Section */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                  <div className="h-7 w-7 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-200 leading-tight">{user?.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide font-mono">
                      {user?.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-black transition-all shadow-md shadow-brand-500/10 hover:shadow-brand-500/20"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
