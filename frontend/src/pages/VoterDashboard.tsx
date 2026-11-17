import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Vote, Clock, CheckCircle2, FileCheck2, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { Election, VoterElectionStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';

export const VoterDashboard: React.FC = () => {
  const { user } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [statuses, setStatuses] = useState<Record<string, VoterElectionStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEligibleElections() {
      try {
        setLoading(true);
        const data = await api.getEligibleElections();
        setElections(data);

        const statusMap: Record<string, VoterElectionStatus> = {};
        for (const el of data) {
          try {
            const st = await api.getVoterStatus(el.id);
            statusMap[el.id] = st;
          } catch (e) {
            console.error(`Failed to load status for ${el.id}:`, e);
          }
        }
        setStatuses(statusMap);
      } catch (err: any) {
        setError(err.message || 'Failed to load eligible elections.');
      } finally {
        setLoading(false);
      }
    }
    loadEligibleElections();
  }, []);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Voter Profile Banner */}
      <div className="bg-zinc-950 p-6 mb-8 border border-zinc-800 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 bg-zinc-900 px-2 py-0.5 border border-zinc-800">
                Verified Student Voter
              </span>
            </div>
            <h1 className="text-xl font-bold font-sans tracking-tight text-white">{user?.name}</h1>
            <p className="text-xs text-zinc-400 mt-1">
              STUDENT ID: <span className="text-emerald-400 font-bold">{user?.voter_profile?.student_id || 'N/A'}</span> • {user?.voter_profile?.department} • {user?.voter_profile?.academic_year}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/verify-receipt"
              className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 text-xs font-bold uppercase tracking-wider border border-zinc-700 text-zinc-200 transition"
            >
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span>Verify Receipt</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between font-mono">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-zinc-900 font-sans">Eligible Elections</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Elections where your student profile is approved (SRS FR-06).
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center font-mono">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent animate-spin"></div>
          <p className="text-zinc-500 text-xs mt-3 uppercase tracking-wider">Querying verified ledger...</p>
        </div>
      ) : elections.length === 0 ? (
        <div className="bg-white p-12 text-center border border-zinc-300">
          <Vote className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold uppercase font-mono text-zinc-800">No Eligible Elections</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
            You are currently not registered as eligible for any active or upcoming elections. Contact the administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {elections.map((election) => {
            const statusInfo = statuses[election.id];
            const hasVoted = statusInfo?.status === 'voted';
            const isActive = election.status === 'active';
            const isPublished = election.status === 'published';

            return (
              <div
                key={election.id}
                className="bg-white border border-zinc-300 hover:border-zinc-900 transition-colors flex flex-col justify-between"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3 font-mono">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                        election.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : election.status === 'published'
                          ? 'bg-zinc-100 text-zinc-800 border-zinc-300 font-bold'
                          : election.status === 'closed'
                          ? 'bg-zinc-100 text-zinc-600 border-zinc-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {election.status}
                    </span>

                    {hasVoted ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        Voted
                      </span>
                    ) : isActive ? (
                      <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 border border-emerald-300">
                        Eligible
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-base font-bold text-zinc-950 mb-1">{election.title}</h3>
                  <p className="text-xs text-zinc-600 line-clamp-2 mb-4">
                    {election.description || 'No description provided.'}
                  </p>

                  <div className="space-y-1.5 text-xs text-zinc-500 pt-3 border-t border-zinc-200 font-mono">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Closes: {formatDate(election.end_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Vote className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{election.candidates?.length || 0} Candidates Running</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 border-t border-zinc-200 font-mono">
                  {hasVoted ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Committed to ledger</span>
                      <Link
                        to="/verify-receipt"
                        className="font-bold text-zinc-900 hover:underline flex items-center gap-1 uppercase"
                      >
                        Receipt <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ) : isActive ? (
                    <Link
                      to={`/vote/${election.id}`}
                      className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-900 transition"
                    >
                      <Vote className="w-4 h-4 text-emerald-400" />
                      <span>Cast Encrypted Ballot</span>
                    </Link>
                  ) : isPublished ? (
                    <Link
                      to={`/results/${election.id}`}
                      className="w-full py-2.5 px-4 bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-900 transition"
                    >
                      <span>View Results</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <div className="text-center py-1 text-xs text-zinc-400 uppercase tracking-wider">
                      Inactive
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
