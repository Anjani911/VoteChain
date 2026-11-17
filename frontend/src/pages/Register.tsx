import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Contact, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Alert } from '../components/Alert';

export const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    student_id: '',
    department: 'Computer Science & Engineering',
    academic_year: '3rd Year',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.registerVoter(formData);
      login(data.access_token, {
        id: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role,
        is_active: true,
        created_at: new Date().toISOString()
      });
      navigate('/voter', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please review inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-950 text-white font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-zinc-900 border border-zinc-700 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight uppercase font-mono">
          Voter Profile Registration
        </h2>
        <p className="mt-1 text-center text-xs text-zinc-400 font-mono">
          Verified Student Ledger Identity
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900 py-8 px-6 sm:px-8 border border-zinc-800">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <form className="space-y-4 font-mono text-xs" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-3.5 w-3.5 text-zinc-500" />
                </div>
                <input
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  placeholder="Alice Johnson"
                />
              </div>
            </div>

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
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  placeholder="alice@college.edu"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Student ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Contact className="h-3.5 w-3.5 text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    required
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleChange}
                    className="block w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    placeholder="CS2026-001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Academic Year
                </label>
                <select
                  name="academic_year"
                  value={formData.academic_year}
                  onChange={handleChange}
                  className="block w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Postgraduate">Postgraduate</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="block w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
              </select>
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  placeholder="Min 6 characters"
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
                  <span>Create Registered Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-zinc-800 text-center font-mono text-[11px]">
            <p className="text-zinc-500">
              Already registered?{' '}
              <Link to="/login" className="font-bold text-emerald-400 hover:underline uppercase">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
