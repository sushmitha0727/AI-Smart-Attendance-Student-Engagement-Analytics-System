import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, useApp } from '../context/AppContext';
import { StudentLogin } from '../components/student/StudentLogin';
import { StudentPortal } from '../components/student/StudentPortal';
import { GraduationCap, LogOut } from 'lucide-react';
import '../index.css';

const StudentAppContent: React.FC = () => {
  const { currentUser, isAuthenticated, logout } = useApp();
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && currentUser.role !== 'student') {
      setRoleError('This account is not a Student account.');
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
        <StudentLogin />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Student Navbar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#162b78] text-[17px] font-[Verdana] tracking-tight italic">
                Attendly AI
              </span>
              <span className="px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Student Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Enrolled Student Dashboard · Biometric & QR Attendance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-700 font-medium">{currentUser.name}</span>
            <span className="text-emerald-800 font-bold uppercase text-[10px]">{currentUser.rollNumber}</span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Sign Out of Student Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1">
        <StudentPortal />
      </main>

      <footer className="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>Student Portal · Attendly AI</span>
            <span className="hidden sm:inline"> · </span>
            <span className="text-slate-400">National Institute of Computing & Engineering</span>
          </div>
          <div className="text-[11px] text-slate-400">
            <span>Academic Session 2025–2026 · Demo – not production biometric verification</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function StudentApp() {
  return (
    <AppProvider>
      <StudentAppContent />
    </AppProvider>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<StudentApp />);
}
