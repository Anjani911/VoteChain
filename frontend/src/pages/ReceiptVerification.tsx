import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, CheckCircle2, ShieldCheck, Layers, Lock } from 'lucide-react';
import { api } from '../api/client';
import { ReceiptVerification as ReceiptType } from '../types';
import { Alert } from '../components/Alert';

export const ReceiptVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [receiptCode, setReceiptCode] = useState(searchParams.get('code') || '');
  const [result, setResult] = useState<ReceiptType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setReceiptCode(code);
      verifyCode(code);
    }
  }, [searchParams]);

  const verifyCode = async (codeToVerify: string) => {
    if (!codeToVerify.trim()) return;
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const data = await api.verifyReceipt(codeToVerify.trim());
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Receipt not found. Please verify your reference code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCode(receiptCode);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 font-sans">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold uppercase tracking-tight text-zinc-950 font-mono">
          Receipt Verification
        </h1>
        <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 font-mono">
          Verify that your encrypted ballot is durably committed to the blockchain ledger.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white border border-zinc-300 p-6 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 font-mono text-xs">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-zinc-400" />
            </div>
            <input
              type="text"
              required
              value={receiptCode}
              onChange={(e) => setReceiptCode(e.target.value)}
              placeholder="e.g. VC-REC-A1B2C3D4"
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-300 text-xs font-mono text-zinc-950 uppercase focus:bg-white focus:outline-none focus:border-zinc-900"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2 border border-zinc-900"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin"></div>
            ) : (
              <span>Verify Inclusion</span>
            )}
          </button>
        </form>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Verification Result Card */}
      {result && (
        <div className="bg-white border-2 border-emerald-600 animate-fadeIn">
          <div className="bg-zinc-950 border-b border-zinc-800 p-4 px-6 flex items-center justify-between text-white font-mono">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider">Ballot Verified in Ledger</h3>
                <p className="text-[10px] text-zinc-400">Valid cryptographic commitment confirmed</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-zinc-900 text-emerald-400 border border-emerald-600">
              {result.status}
            </span>
          </div>

          <div className="p-6 space-y-4 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Election</span>
                <p className="text-xs font-bold text-zinc-950 mt-0.5 font-sans">{result.election_title}</p>
              </div>

              <div className="p-3 bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Inclusion Time (UTC)</span>
                <p className="text-xs text-zinc-900 mt-0.5">
                  {new Date(result.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">
                  Ballot Cryptographic Digest (SHA-256):
                </span>
                <div className="p-2.5 bg-zinc-950 text-emerald-400 font-mono text-[11px] break-all border border-zinc-800">
                  {result.ballot_hash}
                </div>
              </div>

              {result.block_hash && (
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">
                    Committed in Block #{result.block_index} Hash:
                  </span>
                  <div className="p-2.5 bg-zinc-950 text-white font-mono text-[11px] break-all border border-zinc-800">
                    {result.block_hash}
                  </div>
                </div>
              )}
            </div>

            {/* Privacy Guarantee Alert */}
            <div className="bg-zinc-100 border border-zinc-300 p-3.5 flex items-start gap-2.5 text-xs text-zinc-700">
              <Lock className="w-4 h-4 text-zinc-900 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold text-zinc-950 uppercase">Zero-Knowledge Verification: </span>
                This receipt proves your ballot was accepted and permanently anchored in the ledger. It strictly does not reveal your identity or your candidate choice to anyone inspecting this receipt.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                to="/explorer"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-900 hover:underline"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Inspect in Blockchain Explorer →</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
