import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Plus, Users, Play, StopCircle, Award, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api } from '../api/client';
import { Election, VoterProfile } from '../types';
import { Alert } from '../components/Alert';

export const ElectionDetailAdmin: React.FC = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const navigate = useNavigate();

  const [election, setElection] = useState<Election | null>(null);
  const [allVoters, setAllVoters] = useState<VoterProfile[]>([]);
  const [eligibleVoters, setEligibleVoters] = useState<VoterProfile[]>([]);
  const [selectedVoterIds, setSelectedVoterIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Candidate Modal
  const [showCandModal, setShowCandModal] = useState(false);
  const [candName, setCandName] = useState('');
  const [candManifesto, setCandManifesto] = useState('');
  const [candSymbol, setCandSymbol] = useState('');

  // Eligibility Modal
  const [showVoterModal, setShowVoterModal] = useState(false);

  useEffect(() => {
    loadDetails();
  }, [electionId]);

  const loadDetails = async () => {
    if (!electionId) return;
    try {
      setLoading(true);
      const [el, voters, elig] = await Promise.all([
        api.getAdminElection(electionId),
        api.getRegisteredVoters(),
        api.getElectionVoters(electionId)
      ]);
      setElection(el);
      setAllVoters(voters);
      setEligibleVoters(elig);
    } catch (err: any) {
      setError(err.message || 'Failed to load election details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!electionId) return;
    setActionLoading(true);
    setError(null);

    try {
      await api.addCandidate(electionId, {
        name: candName,
        manifesto: candManifesto,
        symbol: candSymbol
      });
      setSuccess(`Candidate "${candName}" added successfully.`);
      setShowCandModal(false);
      setCandName('');
      setCandManifesto('');
      setCandSymbol('');
      loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to add candidate.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignVoters = async () => {
    if (!electionId || selectedVoterIds.length === 0) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await api.assignEligibleVoters(electionId, selectedVoterIds);
      setSuccess(res.message);
      setShowVoterModal(false);
      setSelectedVoterIds([]);
      loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to assign eligible voters.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!electionId) return;
    if (!window.confirm('Activate this election? Once active, eligible voters can cast encrypted ballots.')) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await api.activateElection(electionId);
      setSuccess(res.message);
      loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to activate election.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!electionId) return;
    if (!window.confirm('Close this election? Ballot submissions will be halted immediately.')) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await api.closeElection(electionId);
      setSuccess(res.message);
      loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to close election.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!electionId) return;
    if (!window.confirm('Trigger authorized tally and publish results? The server will decrypt submitted ballots with the election key and compute finalized totals.')) return;
    setActionLoading(true);
    setError(null);

    try {
      await api.publishResults(electionId);
      setSuccess('Results successfully computed and published to ledger!');
      loadDetails();
      navigate(`/results/${electionId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to tally and publish results.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleVoterSelection = (voterId: string) => {
    setSelectedVoterIds(prev =>
      prev.includes(voterId) ? prev.filter(id => id !== voterId) : [...prev, voterId]
    );
  };

  const selectAllUnassigned = () => {
    const unassigned = allVoters
      .filter(v => !eligibleVoters.some(ev => ev.id === v.id))
      .map(v => v.id);
    setSelectedVoterIds(unassigned);
  };

  if (loading || !election) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center font-mono">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent animate-spin mx-auto"></div>
        <p className="text-xs text-zinc-500 mt-2 uppercase tracking-wider">Loading configuration...</p>
      </div>
    );
  }

  const isDraft = election.status === 'draft';
  const isActive = election.status === 'active';
  const isClosed = election.status === 'closed';
  const isPublished = election.status === 'published';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <Link to="/admin" className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-950 flex items-center gap-1 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Admin Console</span>
      </Link>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Main Header / Status Banner */}
      <div className="bg-white border border-zinc-300 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 font-mono">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 border ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : isPublished
                  ? 'bg-zinc-100 text-zinc-800 border-zinc-400 font-bold'
                  : isClosed
                  ? 'bg-zinc-100 text-zinc-600 border-zinc-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              Status: {election.status}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">ID: {election.id.slice(0, 8)}...</span>
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-zinc-950 font-sans">{election.title}</h1>
          <p className="text-xs text-zinc-600 mt-1 max-w-2xl font-mono">{election.description || 'No description'}</p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-200 font-mono">
            <span>Eligible Voters: <strong className="text-zinc-900">{election.total_eligible}</strong></span>
            <span>Ballots Cast: <strong className="text-emerald-700">{election.total_voted}</strong></span>
            <span>Turnout: <strong className="text-zinc-950">
              {election.total_eligible > 0 ? Math.round((election.total_voted / election.total_eligible) * 100) : 0}%
            </strong></span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto font-mono text-xs">
          {isDraft && (
            <button
              onClick={handleActivate}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider border border-emerald-600 transition disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>Activate</span>
            </button>
          )}

          {isActive && (
            <button
              onClick={handleClose}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider border border-rose-600 transition disabled:opacity-50"
            >
              <StopCircle className="w-4 h-4" />
              <span>Close Election</span>
            </button>
          )}

          {isClosed && (
            <button
              onClick={handlePublish}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider border border-zinc-900 transition disabled:opacity-50"
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Decrypt, Tally & Publish</span>
            </button>
          )}

          {isPublished && (
            <Link
              to={`/results/${election.id}`}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-100 text-zinc-950 font-bold uppercase tracking-wider border border-zinc-900 transition"
            >
              <Award className="w-4 h-4" />
              <span>View Results</span>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-mono">
        {/* Candidates Column */}
        <div className="bg-white border border-zinc-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">Candidates ({election.candidates.length})</h2>
              <p className="text-[10px] text-zinc-500">Minimum 2 candidates required for activation</p>
            </div>
            {isDraft && (
              <button
                onClick={() => setShowCandModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider border border-zinc-900 transition"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Candidate</span>
              </button>
            )}
          </div>

          {election.candidates.length === 0 ? (
            <div className="text-center py-10 bg-zinc-50 border border-dashed border-zinc-300 text-xs text-zinc-500">
              No candidates added yet. Add at least two candidates before activating.
            </div>
          ) : (
            <div className="space-y-3">
              {election.candidates.map((cand) => (
                <div key={cand.id} className="p-4 bg-zinc-50 border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-950 font-sans">{cand.name}</h3>
                    {cand.symbol && (
                      <span className="text-[10px] font-bold text-zinc-700 bg-white px-2 py-0.5 border border-zinc-300">
                        {cand.symbol}
                      </span>
                    )}
                  </div>
                  {cand.manifesto && (
                    <p className="text-xs text-zinc-600 mt-2 font-mono">{cand.manifesto}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voter Eligibility Column */}
        <div className="bg-white border border-zinc-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">Eligible Voters ({eligibleVoters.length})</h2>
              <p className="text-[10px] text-zinc-500">Students permitted to request one-time authorization</p>
            </div>
            {!isClosed && !isPublished && (
              <button
                onClick={() => {
                  setShowVoterModal(true);
                  setSelectedVoterIds([]);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider border border-zinc-900 transition"
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Assign Voters</span>
              </button>
            )}
          </div>

          {eligibleVoters.length === 0 ? (
            <div className="text-center py-10 bg-zinc-50 border border-dashed border-zinc-300 text-xs text-zinc-500">
              No voters assigned to this election yet. Click "Assign Voters" to register students.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {eligibleVoters.map((v) => (
                <div key={v.id} className="p-3 bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-zinc-950 font-sans">{v.name}</span>
                    <span className="text-zinc-500 ml-2 font-mono text-[11px]">{v.student_id}</span>
                    <p className="text-[11px] text-zinc-500">{v.department} • {v.academic_year}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Candidate Modal */}
      {showCandModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-zinc-950 max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-950 uppercase font-mono mb-1">Add Candidate</h3>
            <p className="text-xs text-zinc-500 mb-4 font-mono">Nominee details will be committed to the election record.</p>

            <form onSubmit={handleAddCandidate} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block font-bold text-zinc-700 uppercase text-[10px] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 rounded-none"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase text-[10px] mb-1">Election Symbol</label>
                <input
                  type="text"
                  value={candSymbol}
                  onChange={(e) => setCandSymbol(e.target.value)}
                  placeholder="e.g. Torch / Book / Rocket"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 rounded-none"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase text-[10px] mb-1">Manifesto / Agenda</label>
                <textarea
                  rows={3}
                  value={candManifesto}
                  onChange={(e) => setCandManifesto(e.target.value)}
                  placeholder="Candidate's vision and objectives..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 rounded-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowCandModal(false)}
                  className="px-4 py-2 font-bold uppercase text-zinc-600 hover:text-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider border border-zinc-900 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Add Nominee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Eligible Voters Modal */}
      {showVoterModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-zinc-950 max-w-2xl w-full p-6 shadow-2xl font-mono">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-zinc-950 uppercase">Assign Eligible Voters</h3>
              <button
                type="button"
                onClick={selectAllUnassigned}
                className="text-xs font-bold text-emerald-600 hover:underline uppercase"
              >
                [Select All Unassigned]
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Select students from the registered college voter directory to grant eligibility.
            </p>

            <div className="max-h-72 overflow-y-auto divide-y divide-zinc-200 border border-zinc-300 mb-4">
              {allVoters.map((v) => {
                const alreadyAssigned = eligibleVoters.some(ev => ev.id === v.id);
                const isChecked = selectedVoterIds.includes(v.id) || alreadyAssigned;

                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      if (!alreadyAssigned) toggleVoterSelection(v.id);
                    }}
                    className={`p-3 flex items-center justify-between text-xs transition ${
                      alreadyAssigned
                        ? 'bg-zinc-100 opacity-60 cursor-not-allowed'
                        : 'hover:bg-zinc-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        disabled={alreadyAssigned}
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded-none text-zinc-900 focus:ring-0"
                      />
                      <div>
                        <div className="font-bold text-zinc-950 font-sans">{v.name}</div>
                        <div className="text-zinc-500 font-mono text-[11px]">{v.student_id} • {v.email}</div>
                      </div>
                    </div>
                    <span className="text-[11px] text-zinc-500">{v.department}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 text-xs">
              <span className="text-zinc-500">
                {selectedVoterIds.length} newly selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowVoterModal(false)}
                  className="px-4 py-2 font-bold uppercase text-zinc-600 hover:text-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedVoterIds.length === 0 || actionLoading}
                  onClick={handleAssignVoters}
                  className="px-5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider border border-zinc-900 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : `Assign (${selectedVoterIds.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
