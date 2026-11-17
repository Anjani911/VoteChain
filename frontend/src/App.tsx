import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VoterDashboard } from './pages/VoterDashboard';
import { CastVote } from './pages/CastVote';
import { ReceiptVerificationPage } from './pages/ReceiptVerification';
import { AdminDashboard } from './pages/AdminDashboard';
import { ElectionDetailAdmin } from './pages/ElectionDetailAdmin';
import { BlockchainExplorer } from './pages/BlockchainExplorer';
import { ResultsView } from './pages/ResultsView';

const HomeRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 font-mono text-xs text-white">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/voter" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-zinc-100 font-sans text-zinc-900">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<HomeRedirect />} />

              {/* Public authentication & audit routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-receipt" element={<ReceiptVerificationPage />} />
              <Route path="/explorer" element={<BlockchainExplorer />} />
              <Route path="/results/:electionId" element={<ResultsView />} />

              {/* Voter protected routes */}
              <Route
                path="/voter"
                element={
                  <ProtectedRoute allowedRole="voter">
                    <VoterDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vote/:electionId"
                element={
                  <ProtectedRoute allowedRole="voter">
                    <CastVote />
                  </ProtectedRoute>
                }
              />

              {/* Admin protected routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/elections/:electionId"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <ElectionDetailAdmin />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          <footer className="bg-zinc-950 border-t border-zinc-800 text-zinc-500 py-6 text-center font-mono text-xs">
            <p className="uppercase tracking-wider">VoteChain • Secure Blockchain Voting System Prototype</p>
            <p className="text-[11px] text-zinc-600 mt-1">Built with React, TypeScript, FastAPI, PostgreSQL & Custom Python Blockchain</p>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
