import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { AdminPortal } from './components/admin/AdminPortal';
import { FacultyPortal } from './components/faculty/FacultyPortal';
import { StudentPortal } from './components/student/StudentPortal';

import { LoginPage } from './components/auth/LoginPage';

const AppContent: React.FC = () => {
  const { currentUser, isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1">
        {currentUser.role === 'admin' && <AdminPortal />}
        {currentUser.role === 'faculty' && <FacultyPortal />}
        {currentUser.role === 'student' && <StudentPortal />}
      </main>

      <footer className="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>Smart Attendance and Student Engagement Analytics System</span>
            <span className="hidden sm:inline"> · </span>
            <span className="text-slate-400">National Institute of Computing & Engineering</span>
          </div>
          <div className="text-[11px] text-slate-400">
            <span>Academic Session 2025–2026</span>
            <span className="mx-1">·</span>
            <span>Zero Biometric Retention Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
