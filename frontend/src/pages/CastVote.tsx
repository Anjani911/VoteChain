import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Vote, Check, Copy, ArrowRight, ExternalLink, Lock, CheckCircle2 } from 'lucide-react';
import { api, encryptBallotForElection } from '../api/client';
import { Candidate, VoteSubmitResponse } from '../types';
import { Alert } from '../components/Alert';

export const CastVote: React.FC = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<VoteSubmitResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    async function fetchCandidates() {
      if (!electionId) return;
      try {
        setLoading(true);
        const data = await api.getCandidates(electionId);
        setCandidates(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch candidate list.');
      } finally {
        setLoading(false);
      }
    }
    fetchCandidates();
  }, [electionId]);

  const handleConfirmVote = async () => {
    if (!electionId || !selectedCandidate) return;
    setShowConfirmModal(false);
    setSubmitting(true);
    setError(null);

    try {
      // 1. Request one-time voting authorization
      const authResp = await api.authorizeVote(electionId);
      const authToken = authResp.authorization_token;

      // 2. Encrypt ballot payload using AES-256-GCM on client
      const encryptedVote = await encryptBallotForElection(selectedCandidate, electionId);

      // 3. Submit encrypted ballot anonymously (no voter id included)
      const result = await api.submitBallot({
        election_id: electionId,
        authorization_token: authToken,
        encrypted_vote: encryptedVote
      });

      setSubmitResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to submit ballot to blockchain ledger.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyReceiptCode = () => {
    if (submitResult?.receipt_code) {
      navigator.clipboard.writeText(submitResult.receipt_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center font-mono">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent animate-spin mx-auto"></div>
        <p className="text-xs text-zinc-500 mt-3 uppercase tracking-wider">Loading ballot parameters...</p>
      </div>
    );
  }

  // Success Confirmation Screen with Anonymous Receipt
  if (submitResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white border-2 border-emerald-600 shadow-none">
          <div className="bg-zinc-950 p-6 text-white text-center border-b border-zinc-800">
            <div className="w-12 h-12 bg-zinc-900 border border-emerald-500 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tight font-mono">Ballot Committed to Ledger</h2>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              Encrypted vote is permanently anchored in the private blockchain.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-zinc-50 border border-zinc-300 p-4 font-mono">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                Anonymous Receipt Reference Code
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={submitResult.receipt_code}
                  className="bg-white border border-zinc-400 text-zinc-950 font-mono text-sm font-bold px-3 py-2 w-full focus:outline-none select-all rounded-none"
                />
                <button
                  type="button"
                  onClick={copyReceiptCode}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider transition rounded-none"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-600 mt-2">
                Retain this receipt to verify ledger inclusion without revealing your candidate choice.
              </p>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-zinc-200">
                <span className="text-zinc-500">Ballot SHA-256 Digest:</span>
                <span className="text-zinc-900 font-bold truncate max-w-[280px]">
                  {submitResult.ballot_hash}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200">
                <span className="text-zinc-500">Commitment Timestamp:</span>
                <span className="text-zinc-800">{new Date(submitResult.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200">
                <span className="text-zinc-500">Voter Identity Separation:</span>
                <span className="text-emerald-700 font-bold uppercase">Enforced (No Voter ID Stored)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 font-mono text-xs">
              <Link
                to={`/verify-receipt?code=${submitResult.receipt_code}`}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition"
              >
                <span>Verify Receipt</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/explorer"
                className="flex-1 py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition"
              >
                <span>View in Explorer</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const chosenCandidateObj = candidates.find(c => c.id === selectedCandidate);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/voter" className="text-xs text-zinc-600 hover:text-zinc-900 font-mono uppercase tracking-wider font-bold mb-2 inline-block">
          ← Back to Eligible Elections
        </Link>
        <h1 className="text-2xl font-bold uppercase tracking-tight text-zinc-950 font-sans">Cast Secure Ballot</h1>
        <p className="text-xs text-zinc-500 mt-1 font-mono">
          Select a candidate. The payload is encrypted client-side with AES-256-GCM prior to submission.
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Security Banner */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 mb-6 flex items-start gap-3 text-white">
        <Lock className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs font-mono text-zinc-300">
          <span className="font-bold text-white uppercase">Cryptographic Privacy: </span>
          The server uses a single-use authorization token. Your student identity is strictly separated from your ballot record. Once submitted, your vote cannot be linked to your account.
        </div>
      </div>

      {/* Candidate Selection Grid */}
      <div className="space-y-4 mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">Official Nominees</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((cand) => {
            const isSelected = selectedCandidate === cand.id;
            return (
              <div
                key={cand.id}
                onClick={() => setSelectedCandidate(cand.id)}
                className={`p-5 border-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-zinc-950 bg-zinc-950 text-white shadow-none'
                    : 'border-zinc-300 bg-white text-zinc-950 hover:border-zinc-500'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-base font-bold font-sans">{cand.name}</h3>
                    {cand.symbol && (
                      <span className={`inline-block mt-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 border ${
                        isSelected
                          ? 'bg-zinc-900 text-emerald-400 border-zinc-700'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                      }`}>
                        Symbol: {cand.symbol}
                      </span>
                    )}
                  </div>

                  <div
                    className={`w-5 h-5 flex items-center justify-center border transition ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500 text-zinc-950 font-bold'
                        : 'border-zinc-400 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </div>

                <p className={`text-xs mt-3 ${isSelected ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {cand.manifesto || 'No manifesto provided.'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-300 font-mono">
        <button
          type="button"
          onClick={() => navigate('/voter')}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-900"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!selectedCandidate || submitting}
          onClick={() => setShowConfirmModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider border border-emerald-500 transition disabled:opacity-50"
        >
          <Vote className="w-4 h-4" />
          <span>Confirm & Submit Vote</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-zinc-950 max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-zinc-950 text-emerald-400 flex items-center justify-center border border-zinc-800">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-sans text-zinc-950 uppercase">Confirm Vote Submission</h3>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Irreversible blockchain commitment</p>
              </div>
            </div>

            <div className="p-4 bg-zinc-100 border border-zinc-300 mb-4 text-xs font-mono">
              <div className="text-zinc-500 uppercase text-[10px] font-bold">Selected Nominee:</div>
              <div className="text-base font-bold text-zinc-950 mt-0.5">{chosenCandidateObj?.name}</div>
              {chosenCandidateObj?.symbol && (
                <div className="text-[11px] text-zinc-600 mt-0.5">Symbol: {chosenCandidateObj.symbol}</div>
              )}
            </div>

            <p className="text-xs text-zinc-600 mb-6 font-mono">
              Your device will now encrypt your choice using AES-256-GCM. Your single-use authorization token will be consumed, and you cannot recast your ballot.
            </p>

            <div className="flex items-center justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 font-bold uppercase text-zinc-600 hover:text-zinc-900"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmVote}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider border border-emerald-500 transition disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin"></div>
                ) : (
                  <span>Commit to Blockchain</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
