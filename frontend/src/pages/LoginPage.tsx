import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ticket, Lock, Mail, ArrowRight, AlertCircle, Shield, User, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnUrl = (location.state as any)?.returnUrl || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate(returnUrl);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    setError(null);
    try {
      await login(demoEmail, demoPass);
      navigate(returnUrl);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Ticket className="h-6 w-6 text-navy-950 font-bold" />
            </div>
          </Link>
          <h2 className="text-3xl font-extrabold text-white">Welcome Back</h2>
          <p className="text-xs text-slate-400 mt-2">
            Sign in to access your seats, tickets, and bookings.
          </p>
        </div>

        {/* Demo Fast-Login Pill Box */}
        <div className="bg-slate-900/90 border border-brand-500/30 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-400 mb-3 uppercase tracking-wider">
            <Sparkles className="h-4 w-4" /> 1-Click Reviewer Demo Logins
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('customer@example.com', 'Customer@123')}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-white flex items-center gap-1">
                <User className="h-3 w-3 text-emerald-400" /> Customer (John)
              </div>
              <div className="text-[9px] text-slate-400 font-mono">customer@example.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('sarah@example.com', 'Customer@123')}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-white flex items-center gap-1">
                <User className="h-3 w-3 text-blue-400" /> Customer 2 (Sarah)
              </div>
              <div className="text-[9px] text-slate-400 font-mono">sarah@example.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('organiser@example.com', 'Organiser@123')}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-white flex items-center gap-1">
                <Shield className="h-3 w-3 text-amber-400" /> Organiser Portal
              </div>
              <div className="text-[9px] text-slate-400 font-mono">organiser@example.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin@example.com', 'Admin@123')}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-white flex items-center gap-1">
                <Shield className="h-3 w-3 text-indigo-400" /> System Admin
              </div>
              <div className="text-[9px] text-slate-400 font-mono">admin@example.com</div>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-extrabold text-sm transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 mt-6"
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-400 hover:underline font-semibold">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
};
