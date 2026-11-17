import React, { useState, useEffect } from 'react';
import { Layers, CheckCircle2, AlertTriangle, Search, ChevronDown, ChevronRight, Hash, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { Block, ChainValidation, BlockchainStats } from '../types';
import { Alert } from '../components/Alert';

export const BlockchainExplorer: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [stats, setStats] = useState<BlockchainStats | null>(null);
  const [validation, setValidation] = useState<ChainValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [expandedBlockIndex, setExpandedBlockIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChainData();
  }, []);

  const loadChainData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [chainData, statsData, valData] = await Promise.all([
        api.getChain(),
        api.getBlockchainStats(),
        api.validateChain()
      ]);
      setBlocks(chainData);
      setStats(statsData);
      setValidation(valData);
    } catch (err: any) {
      setError(err.message || 'Failed to load blockchain ledger data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    setValidating(true);
    try {
      const valData = await api.validateChain();
      setValidation(valData);
    } catch (err: any) {
      setError(err.message || 'Audit execution failed.');
    } finally {
      setValidating(false);
    }
  };

  const toggleBlockExpand = async (blockIndex: number) => {
    if (expandedBlockIndex === blockIndex) {
      setExpandedBlockIndex(null);
    } else {
      setExpandedBlockIndex(blockIndex);
      try {
        const detail = await api.getBlock(blockIndex);
        setBlocks(prev => prev.map(b => b.block_index === blockIndex ? { ...b, transactions: detail.transactions } : b));
      } catch (e) {
        console.error('Failed to fetch block details:', e);
      }
    }
  };

  const filteredBlocks = blocks.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      b.block_index.toString() === q ||
      b.block_hash.toLowerCase().includes(q) ||
      b.previous_hash.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1 font-mono">
            <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 bg-zinc-950 px-2 py-0.5 border border-zinc-800">
              Private Hash-Linked Ledger
            </span>
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-zinc-950 font-sans">
            Blockchain Explorer & Audit
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5 font-mono">
            Direct inspection of SHA-256 blocks, cryptographic links, and data commitments.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={handleRunAudit}
            disabled={validating}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider border border-zinc-900 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${validating ? 'animate-spin' : ''}`} />
            <span>{validating ? 'Verifying Hashes...' : 'Run Cryptographic Audit'}</span>
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Validation Status Banner */}
      {validation && (
        <div
          className={`p-5 mb-8 border-2 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono ${
            validation.is_valid
              ? 'bg-zinc-950 border-emerald-500 text-white'
              : 'bg-rose-950 border-rose-500 text-white'
          }`}
        >
          <div className="flex items-start gap-3.5">
            {validation.is_valid ? (
              <div className="w-9 h-9 bg-zinc-900 border border-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            ) : (
              <div className="w-9 h-9 bg-zinc-900 border border-rose-500 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  {validation.is_valid ? 'Chain Integrity: Valid & Unbroken' : 'Ledger Tamper Detected!'}
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                    validation.is_valid
                      ? 'bg-zinc-900 text-emerald-400 border-emerald-500'
                      : 'bg-zinc-900 text-rose-400 border-rose-500'
                  }`}
                >
                  {validation.total_blocks} Blocks Validated
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                {validation.is_valid
                  ? 'All block sequence indices, previous-hash cryptographic links, SHA-256 block digests, and data commitments match exact recalculation.'
                  : `${validation.errors.length} integrity violations detected across block records.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold font-mono self-start md:self-auto border-t md:border-t-0 md:border-l border-zinc-800 pt-3 md:pt-0 md:pl-6">
            <div>
              <span className="block text-[10px] uppercase text-zinc-500">Blocks</span>
              <span className="text-emerald-400">{stats?.total_blocks || 0}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-zinc-500">Transactions</span>
              <span className="text-white">{stats?.total_transactions || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white border border-zinc-300 p-4 mb-6 flex flex-col sm:flex-row gap-2 font-mono text-xs">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-zinc-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by block index (0, 1...) or hash substring..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-300 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 rounded-none font-mono text-xs"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-950 font-bold uppercase"
          >
            [Clear]
          </button>
        )}
      </div>

      {/* Blocks Timeline / Explorer View */}
      {loading ? (
        <div className="p-16 text-center font-mono">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs text-zinc-500 mt-2 uppercase tracking-wider">Loading chain...</p>
        </div>
      ) : filteredBlocks.length === 0 ? (
        <div className="bg-white p-12 text-center border border-zinc-300 text-xs text-zinc-500 font-mono">
          No matching blocks found for "{searchQuery}".
        </div>
      ) : (
        <div className="space-y-3 font-mono">
          {filteredBlocks.map((block) => {
            const isGenesis = block.block_index === 0;
            const isExpanded = expandedBlockIndex === block.block_index;

            return (
              <div
                key={block.id}
                className="bg-white border border-zinc-300 hover:border-zinc-900 transition-colors"
              >
                <div
                  onClick={() => toggleBlockExpand(block.block_index)}
                  className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 flex items-center justify-center font-bold text-xs flex-shrink-0 border ${
                        isGenesis
                          ? 'bg-zinc-950 text-emerald-400 border-zinc-950'
                          : 'bg-zinc-100 text-zinc-950 border-zinc-300'
                      }`}
                    >
                      #{block.block_index}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-950">
                          {isGenesis ? 'Genesis Block' : `Block #${block.block_index}`}
                        </span>
                        {isGenesis && (
                          <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-900 text-emerald-400 px-1.5 py-0.2 border border-zinc-800">
                            Epoch
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-500">
                          {new Date(block.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-mono">
                        <Hash className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="truncate max-w-[260px] sm:max-w-md">{block.block_hash}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-between sm:justify-end text-xs">
                    <span className="font-bold px-2 py-0.5 bg-zinc-100 text-zinc-800 border border-zinc-300">
                      {block.transaction_count ?? (block.transactions?.length || 0)} Tx
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 bg-zinc-950 text-white border-t border-zinc-800 text-xs space-y-4 font-mono">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Previous Block Hash:</span>
                        <div className="p-2.5 bg-zinc-900 text-zinc-300 font-mono text-[11px] break-all border border-zinc-800">
                          {block.previous_hash}
                        </div>
                      </div>

                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Data Hash (Transactions Root):</span>
                        <div className="p-2.5 bg-zinc-900 text-emerald-400 font-mono text-[11px] break-all border border-zinc-800">
                          {block.data_hash}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Block Hash (Canonical SHA-256):</span>
                      <div className="p-2.5 bg-zinc-900 text-white font-mono text-[11px] break-all border border-zinc-800">
                        {block.block_hash}
                      </div>
                    </div>

                    {/* Transactions inside this block */}
                    <div className="pt-2">
                      <h4 className="font-bold uppercase tracking-wider text-zinc-400 text-[11px] mb-2">Committed Transactions ({block.transactions?.length || 0})</h4>
                      {(!block.transactions || block.transactions.length === 0) ? (
                        <p className="text-zinc-600 text-xs italic">Genesis block contains no voter transactions.</p>
                      ) : (
                        <div className="space-y-2">
                          {block.transactions.map((tx) => (
                            <div key={tx.id} className="p-3 bg-zinc-900 border border-zinc-800 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono text-[11px] text-emerald-400 font-bold truncate max-w-xs">
                                  Tx: {tx.transaction_hash}
                                </span>
                                <span className="text-[10px] text-zinc-500">
                                  {new Date(tx.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-400">
                                Ballot Reference: <span className="font-mono text-zinc-200">{tx.ballot_id}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
