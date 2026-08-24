import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { SeatSelectionPage } from './pages/SeatSelectionPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { BookingSuccessPage } from './pages/BookingSuccessPage';
import { BookingsHistoryPage } from './pages/BookingsHistoryPage';
import { WaitlistClaimPage } from './pages/WaitlistClaimPage';
import { OrganiserDashboardPage } from './pages/OrganiserDashboardPage';
import { AdminVenuesPage } from './pages/AdminVenuesPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Role } from './types';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: Role[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-navy-950 text-slate-100">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<HomePage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/shows/:id/seats" element={<SeatSelectionPage />} />
          <Route path="/waitlist-claim" element={<WaitlistClaimPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Customer Protected Routes */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER', 'ORGANISER', 'ADMIN']}>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking-success"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER', 'ORGANISER', 'ADMIN']}>
                <BookingSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER', 'ORGANISER', 'ADMIN']}>
                <BookingsHistoryPage />
              </ProtectedRoute>
            }
          />

          {/* Organiser Protected Routes */}
          <Route
            path="/organiser/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ORGANISER', 'ADMIN']}>
                <OrganiserDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin/venues"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminVenuesPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-navy-950 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 ShowReserve Inc. Distributed Ticketing Architecture.</p>
          <div className="flex items-center gap-6 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> PostgreSQL Authoritative
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Redis Distributed Locks
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> FIFO Reallocation
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
