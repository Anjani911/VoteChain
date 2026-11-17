import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, Users, Vote, ShieldCheck, ArrowLeft, BarChart3 } from 'lucide-react';
import { api } from '../api/client';
import { ElectionResults } from '../types';
import { Alert } from '../components/Alert';

export const ResultsView: React.FC = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResults() {
      if (!electionId) return;
      try {
        setLoading(true);
        const data = await api.getResults(electionId);
        setResults(data);
      } catch (err: any) {
        setError(err.message || 'Results are not available yet.');
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [electionId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center font-mono">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent animate-spin mx-auto"></div>
        <p className="text-xs text-zinc-500 mt-2 uppercase tracking-wider">Compiling results...</p>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Alert type="error" title="Results Withheld" message={error || 'Election results have not been published.'} />
        <div className="text-center mt-6">
          <Link to="/" className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900 hover:underline">
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const winner = results.candidate_results.length > 0 ? results.candidate_results[0] : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans">
      <div className="mb-6">
        <Link to="/" className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-950 flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-zinc-900 text-white border border-zinc-800">
            Official Results Published
          </span>
        </div>
        <h1 className="text-2xl font-bold uppercase tracking-tight text-zinc-950 mt-1">{results.title}</h1>
        <p className="text-xs text-zinc-500 mt-0.5 font-mono">
          Finalized aggregate tally computed from decrypted blockchain ballots (SRS FR-17).
        </p>
      </div>

      {/* Turnout & Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 font-mono">
        <div className="bg-white p-5 border border-zinc-300">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Eligible Voters</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-950">{results.total_eligible}</div>
        </div>

        <div className="bg-white p-5 border border-zinc-300">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Ballots Tallied</span>
            <Vote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{results.total_votes_cast}</div>
        </div>

        <div className="bg-white p-5 border border-zinc-300">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Turnout</span>
            <BarChart3 className="w-4 h-4 text-zinc-700" />
          </div>
          <div className="text-2xl font-bold text-zinc-950">{results.turnout_percentage}%</div>
        </div>
      </div>

      {/* Winner Banner */}
      {winner && winner.vote_count > 0 && (
        <div className="bg-zinc-950 border-2 border-emerald-500 p-6 text-white mb-8 flex items-center gap-4 font-mono">
          <div className="w-12 h-12 bg-zinc-900 border border-emerald-500 flex items-center justify-center flex-shrink-0">
            <Award className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Declared Winner</span>
            <h2 className="text-xl font-bold uppercase font-sans tracking-tight text-white">{winner.name}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Won with {winner.vote_count} votes ({winner.percentage}% of cast ballots)
              {winner.symbol && ` • Symbol: ${winner.symbol}`}
            </p>
          </div>
        </div>
      )}

      {/* Candidate Breakdown */}
      <div className="bg-white border border-zinc-300 p-6 mb-8 font-mono">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-4">Candidate Vote Breakdown</h2>

        <div className="space-y-5">
          {results.candidate_results.map((c, index) => (
            <div key={c.candidate_id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-400 font-mono">#{index + 1}</span>
                  <span className="font-bold text-zinc-950 text-sm font-sans">{c.name}</span>
                  {c.symbol && (
                    <span className="text-[10px] text-zinc-700 bg-zinc-100 px-2 py-0.5 border border-zinc-300 font-bold">
                      {c.symbol}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-zinc-950">{c.vote_count} votes</span>
                  <span className="text-zinc-500 ml-2">({c.percentage}%)</span>
                </div>
              </div>

              {/* Sharp Rectangular Percentage Bar */}
              <div className="h-2.5 bg-zinc-100 border border-zinc-200">
                <div
                  className={`h-full transition-all duration-500 ${
                    index === 0 ? 'bg-emerald-600' : 'bg-zinc-800'
                  }`}
                  style={{ width: `${Math.max(c.percentage, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit & Integrity Footer */}
      <div className="bg-zinc-100 border border-zinc-300 p-4 flex items-center justify-between text-xs text-zinc-600 font-mono">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>All votes tallied strictly from encrypted ledger transactions without exposing individual choices.</span>
        </div>
        <Link to="/explorer" className="font-bold text-zinc-950 hover:underline uppercase whitespace-nowrap ml-4">
          Ledger Explorer →
        </Link>
      </div>
    </div>
  );
};
