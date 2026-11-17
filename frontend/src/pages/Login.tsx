import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Alert } from '../components/Alert';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.login({ email, password });
      login(data.access_token, {
        id: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role,
        is_active: true,
        created_at: new Date().toISOString()
      });

      if (from) {
        navigate(from, { replace: true });
      } else if (data.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/voter', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (role: 'admin' | 'voter') => {
    if (role === 'admin') {
      setEmail('admin@college.edu');
      setPassword('Admin@123456');
    } else {
      setEmail('alice@college.edu');
      setPassword('Voter@123456');
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-950 text-white font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-zinc-900 border border-zinc-700 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight uppercase font-mono">
          System Authentication
        </h2>
        <p className="mt-1 text-center text-xs text-zinc-400 font-mono">
          Private Blockchain College Voting System
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900 py-8 px-6 sm:px-8 border border-zinc-800">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          {/* Demonstration Quick Fill Tabs */}
          <div className="mb-6 p-3 bg-zinc-950 border border-zinc-800 text-xs">
            <div className="text-zinc-400 font-mono font-bold uppercase text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Demo Quick Fill:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDemoCredentials('voter')}
                className="py-2 px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition text-left"
              >
                <div className="font-bold text-xs uppercase tracking-wider text-emerald-400">Voter: Alice</div>
                <div className="text-[10px] text-zinc-400 font-mono truncate">alice@college.edu</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('admin')}
                className="py-2 px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition text-left"
              >
                <div className="font-bold text-xs uppercase tracking-wider text-amber-400">Admin</div>
                <div className="text-[10px] text-zinc-400 font-mono truncate">admin@college.edu</div>
              </button>
            </div>
          </div>

          <form className="space-y-4 font-mono text-xs" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                College Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-3.5 w-3.5 text-zinc-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  placeholder="alice@college.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Password (Argon2id)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-3.5 w-3.5 text-zinc-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider border border-emerald-500 transition-colors disabled:opacity-50 mt-6"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin"></div>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-zinc-800 text-center font-mono text-[11px]">
            <p className="text-zinc-500">
              New student voter?{' '}
              <Link to="/register" className="font-bold text-emerald-400 hover:underline uppercase">
                Register Profile
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
