import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Layers, FileCheck2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-zinc-950 text-white border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:border-emerald-500 transition-colors">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white uppercase font-mono">
                  VoteChain
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 bg-zinc-900 text-emerald-400 border border-zinc-800">
                  Private Ledger
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1 font-mono text-xs uppercase tracking-wider">
            {user?.role === 'voter' && (
              <Link
                to="/voter"
                className={`px-3 py-1.5 border transition-colors ${
                  isActive('/voter')
                    ? 'bg-zinc-800 text-white border-zinc-600 font-bold'
                    : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-900'
                }`}
              >
                Elections
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 border transition-colors ${
                  isActive('/admin')
                    ? 'bg-zinc-800 text-white border-zinc-600 font-bold'
                    : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-900'
                }`}
              >
                Admin Panel
              </Link>
            )}

            <Link
              to="/explorer"
              className={`flex items-center gap-1.5 px-3 py-1.5 border transition-colors ${
                isActive('/explorer')
                  ? 'bg-zinc-800 text-white border-zinc-600 font-bold'
                  : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Explorer
            </Link>

            <Link
              to="/verify-receipt"
              className={`flex items-center gap-1.5 px-3 py-1.5 border transition-colors ${
                isActive('/verify-receipt')
                  ? 'bg-zinc-800 text-white border-zinc-600 font-bold'
                  : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-900'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
              Check Receipt
            </Link>
          </div>

          {/* Right Action / Profile */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 font-mono">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-zinc-200">{user.name}</span>
                  <div className="flex items-center gap-1.5 justify-end text-[10px]">
                    <span className="text-zinc-400 uppercase tracking-wider">{user.role}</span>
                    {user.voter_profile && (
                      <span className="bg-zinc-900 text-emerald-400 px-1 border border-zinc-800">
                        {user.voter_profile.student_id}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:text-rose-400 hover:bg-zinc-900 border border-zinc-800 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-zinc-900 border border-transparent transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-zinc-950 bg-white hover:bg-zinc-200 font-bold transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
