import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, useApp } from '../context/AppContext';
import { FacultyLogin } from '../components/faculty/FacultyLogin';
import { FacultyPortal } from '../components/faculty/FacultyPortal';
import { Users, LogOut } from 'lucide-react';
import '../index.css';

const FacultyAppContent: React.FC = () => {
  const { currentUser, isAuthenticated, logout } = useApp();
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && currentUser.role !== 'faculty') {
      setRoleError('This account is not a Faculty account.');
      logout();
    }
  }, [isAuthenticated, currentUser, logout]);

  if (!isAuthenticated) {
    return (
      <div>
        {roleError && (
          <div className="bg-rose-50 text-rose-800 p-3 text-center text-xs font-medium border-b border-rose-200">
            {roleError}
          </div>
        )}
        <FacultyLogin />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Faculty Navbar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#162b78] text-[17px] font-[Verdana] tracking-tight italic">
                Attendly AI
              </span>
              <span className="px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded bg-blue-50 text-blue-700 border border-blue-200">
                Faculty Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Course Instructor & Department Workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Return to Institutional Gateway"
          >
            <span>← Gateway</span>
          </a>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-slate-700 font-medium">{currentUser.name}</span>
            <span className="text-blue-700 font-bold uppercase text-[10px]">FACULTY</span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Sign Out of Faculty Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1">
        <FacultyPortal />
      </main>

      <footer className="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>Faculty Portal · Attendly AI</span>
            <span className="hidden sm:inline"> · </span>
            <span className="text-slate-400">National Institute of Computing & Engineering</span>
          </div>
          <div className="text-[11px] text-slate-400">
            <span>Academic Session 2025–2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function FacultyApp() {
  return (
    <AppProvider>
      <FacultyAppContent />
    </AppProvider>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<FacultyApp />);
}
