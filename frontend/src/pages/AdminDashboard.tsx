import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Vote, Users, Layers, Clock, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { Election, BlockchainStats } from '../types';
import { Alert } from '../components/Alert';

export const AdminDashboard: React.FC = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [stats, setStats] = useState<BlockchainStats | null>(null);
  const [voterCount, setVoterCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Election Modal
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [elData, bStats, voters] = await Promise.all([
        api.getAdminElections(),
        api.getBlockchainStats(),
        api.getRegisteredVoters()
      ]);
      setElections(elData);
      setStats(bStats);
      setVoterCount(voters.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrative dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const created = await api.createElection({
        title: newTitle,
        description: newDesc,
        start_time: new Date(newStart).toISOString(),
        end_time: new Date(newEnd).toISOString()
      });
      setSuccess(`Draft election "${created.title}" successfully created.`);
      setShowModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewStart('');
      setNewEnd('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create election.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1 font-mono">
            <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500 bg-zinc-950 px-2 py-0.5 border border-zinc-800">
              Admin Console
            </span>
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-zinc-950 font-sans">
            Election Lifecycle & Administration
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5 font-mono">
            Manage candidates, voter eligibility, election activation, closure, and ledger tallies.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-mono font-bold uppercase tracking-wider border border-zinc-900 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>New Election</span>
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 font-mono">
        <div className="bg-white p-5 border border-zinc-300 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Total Elections</span>
            <div className="text-2xl font-bold text-zinc-950 mt-1">{elections.length}</div>
          </div>
          <div className="w-9 h-9 bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-800">
            <Vote className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-5 border border-zinc-300 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Active Elections</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {elections.filter(e => e.status === 'active').length}
            </div>
          </div>
          <div className="w-9 h-9 bg-zinc-100 border border-zinc-300 flex items-center justify-center text-emerald-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-5 border border-zinc-300 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Registered Voters</span>
            <div className="text-2xl font-bold text-zinc-950 mt-1">{voterCount}</div>
          </div>
          <div className="w-9 h-9 bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-800">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-5 border border-zinc-300 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Ledger Blocks</span>
            <div className="text-2xl font-bold text-zinc-950 mt-1">{stats?.total_blocks || 0}</div>
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
              {stats?.is_chain_valid ? 'Integrity Valid' : 'Ledger Flagged'}
            </span>
          </div>
          <div className="w-9 h-9 bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-800">
            <Layers className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Elections List */}
      <div className="bg-white border border-zinc-300 overflow-hidden mb-8">
        <div className="p-4 px-5 border-b border-zinc-200 flex items-center justify-between font-mono">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 font-mono">Configured Elections</h2>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">{elections.length} Total</span>
        </div>

        {loading ? (
          <div className="p-12 text-center font-mono">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent animate-spin mx-auto"></div>
            <p className="text-xs text-zinc-500 mt-2 uppercase tracking-wider">Loading...</p>
          </div>
        ) : elections.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500 font-mono">
            No elections configured yet. Click "New Election" above.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {elections.map((election) => {
              const turnout = election.total_eligible > 0
                ? Math.round((election.total_voted / election.total_eligible) * 100)
                : 0;

              return (
                <div key={election.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                          election.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : election.status === 'published'
                            ? 'bg-zinc-100 text-zinc-800 border-zinc-400 font-bold'
                            : election.status === 'closed'
                            ? 'bg-zinc-100 text-zinc-600 border-zinc-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {election.status}
                      </span>
                      <h3 className="text-base font-bold text-zinc-950 font-sans">{election.title}</h3>
                    </div>
                    <p className="text-xs text-zinc-600 line-clamp-1">{election.description || 'No description'}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 pt-1 font-mono">
                      <span>Candidates: <strong className="text-zinc-900">{election.candidates?.length || 0}</strong></span>
                      <span>Eligible Voters: <strong className="text-zinc-900">{election.total_eligible}</strong></span>
                      <span>Ballots Cast: <strong className="text-emerald-700">{election.total_voted}</strong></span>
                      <span>Turnout: <strong className="text-zinc-950">{turnout}%</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs">
                    <Link
                      to={`/admin/elections/${election.id}`}
                      className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider border border-zinc-900 transition"
                    >
                      Manage
                    </Link>
                    {election.status === 'published' && (
                      <Link
                        to={`/results/${election.id}`}
                        className="px-3.5 py-1.5 bg-white hover:bg-zinc-100 text-zinc-950 font-bold uppercase tracking-wider border border-zinc-900 transition"
                      >
                        Results
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Election Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-zinc-950 max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-950 uppercase font-mono mb-1">Create Election</h3>
            <p className="text-xs text-zinc-500 mb-4 font-mono">Initial status will be set to 'Draft'.</p>

            <form onSubmit={handleCreateElection} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block font-bold text-zinc-700 uppercase text-[10px] mb-1">Election Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Student Council Vice President 2026"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 rounded-none"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase text-[10px] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Eligibility criteria and election info..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase text-[10px] mb-1">Start Time (UTC)</label>
                  <input
                    type="datetime-local"
                    required
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 rounded-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 uppercase text-[10px] mb-1">End Time (UTC)</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 rounded-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-bold uppercase text-zinc-600 hover:text-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider border border-zinc-900 transition disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
