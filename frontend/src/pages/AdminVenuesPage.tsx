import React, { useState, useEffect } from 'react';
import { Venue } from '../types';
import api from '../api/client';
import { Shield, Plus, Building2, MapPin, Grid, Layers, Trash2 } from 'lucide-react';

export const AdminVenuesPage: React.FC = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Venue Form State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [totalRows, setTotalRows] = useState(6);
  const [totalCols, setTotalCols] = useState(10);
  const [aislesStr, setAislesStr] = useState('3, 7');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [venuesRes, statsRes] = await Promise.all([
        api.get<Venue[]>('/venues'),
        api.get('/admin/stats').catch(() => ({ data: null })),
      ]);
      setVenues(venuesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const aisles = aislesStr
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      await api.post('/venues', {
        name,
        city,
        address,
        totalRows: Number(totalRows),
        totalCols: Number(totalCols),
        aisles,
      });

      setShowModal(false);
      setName('');
      setCity('');
      setAddress('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create venue');
    }
  };

  const handleDeleteVenue = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this venue?')) return;
    try {
      await api.delete(`/venues/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete venue');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3 mx-auto mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-48 bg-slate-900 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Shield className="h-3.5 w-3.5" /> System Administration
          </div>
          <h1 className="text-3xl font-extrabold text-white">Venue Layout Engine</h1>
          <p className="text-xs text-slate-400 mt-1">
            Build structured visual seating grids, aisles, and configure venues across cities.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-bold text-xs transition-all shadow-md shadow-brand-500/10"
        >
          <Plus className="h-4 w-4" /> Add New Venue
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="bg-navy-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 font-semibold">Total Venues</span>
            <div className="text-xl font-extrabold text-white font-mono mt-1">{stats.totalVenues}</div>
          </div>
          <div className="bg-navy-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 font-semibold">Configured Seats</span>
            <div className="text-xl font-extrabold text-white font-mono mt-1">{stats.totalSeats}</div>
          </div>
          <div className="bg-navy-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 font-semibold">Active Holds</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">{stats.activeHolds}</div>
          </div>
          <div className="bg-navy-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 font-semibold">Queued Waitlists</span>
            <div className="text-xl font-extrabold text-amber-400 font-mono mt-1">{stats.waitingWaitlists}</div>
          </div>
        </div>
      )}

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((venue) => (
          <div
            key={venue.id}
            className="bg-navy-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <button
                  onClick={() => handleDeleteVenue(venue.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Delete Venue"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">{venue.name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" /> {venue.address}, {venue.city}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-800/40 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Grid Dimensions</span>
                  <span className="font-mono font-bold text-white">
                    {venue.totalRows} Rows × {venue.totalCols} Cols
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/40 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Aisles After</span>
                  <span className="font-mono font-bold text-brand-400">
                    Col {venue.aisles?.join(', ') || 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Venue */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-navy-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Configure Structured Venue</h2>
            <form onSubmit={handleCreateVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Venue Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dolby Cinema at Sunset"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. San Francisco"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 500 Howard St"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Rows (1-26)</label>
                  <input
                    type="number"
                    min={1}
                    max={26}
                    value={totalRows}
                    onChange={(e) => setTotalRows(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cols (1-50)</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={totalCols}
                    onChange={(e) => setTotalCols(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Aisles (e.g. 3, 7)</label>
                  <input
                    type="text"
                    value={aislesStr}
                    onChange={(e) => setAislesStr(e.target.value)}
                    placeholder="3, 7"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-800/40 rounded-xl text-[11px] text-slate-400 border border-slate-700/50">
                ⚡ The system will automatically build the structured matrix of physical seats, category distribution (VIP, Premium, Standard), and aisle spaces.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-bold text-xs"
                >
                  Generate Venue Grid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
