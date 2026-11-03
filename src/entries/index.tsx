import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';

const GatewayApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans">
      {/* Top Header */}
      <header className="w-full bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0.011.665 6.16 3.422L12 21l-6.16-3.422a12.083 12.083 0.011-.665L12 14z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xl font-[Verdana] tracking-tight italic">
                Attendly AI
              </span>
              <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                Institutional Gateway
              </span>
            </div>
            <p className="text-xs text-slate-400">
              National Institute of Computing & Engineering · Academic Session 2025–2026
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Cloud Firestore & Auth Active
          </span>
        </div>
      </header>

      {/* Hero / Portal Cards Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 flex flex-col justify-center space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 text-xs font-semibold">
            <span>Multi-Role Academic & Attendance Platform</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Select Your Portal
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Attendly AI is structured into three dedicated portals with secure role gating, Cloud Firestore persistence, dynamic rotating QR attendance, and biometric verification.
          </p>
        </div>

        {/* 3 Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Admin Portal Card */}
          <a
            href="/admin.html"
            className="group bg-slate-950 border border-slate-800 hover:border-purple-600 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-purple-950/30 flex flex-col justify-between space-y-6 cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center group-hover:scale-110 transition-transform font-bold text-lg">
                👑
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                  Admin Exclusive
                </span>
                <h2 className="text-xl font-bold text-white mt-2 group-hover:text-purple-300 transition-colors">
                  Admin Portal
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Dean & Controller Administration. Manage institutional CSV data imports/exports, student/faculty ID provisioning, and academic hierarchy.
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-purple-400 group-hover:text-purple-300">
              <span>Open Admin Portal</span>
              <span>&rarr;</span>
            </div>
          </a>

          {/* Faculty Portal Card */}
          <a
            href="/faculty.html"
            className="group bg-slate-950 border border-slate-800 hover:border-blue-600 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-950/30 flex flex-col justify-between space-y-6 cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center group-hover:scale-110 transition-transform font-bold text-lg">
                📚
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                  Faculty Access
                </span>
                <h2 className="text-xl font-bold text-white mt-2 group-hover:text-blue-300 transition-colors">
                  Faculty Portal
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Course Instructor & Professor Workspace. Launch live attendance sessions, grade assignments, review quiz attempts, and evaluate student participation.
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-blue-400 group-hover:text-blue-300">
              <span>Open Faculty Portal</span>
              <span>&rarr;</span>
            </div>
          </a>

          {/* Student Portal Card */}
          <a
            href="/student.html"
            className="group bg-slate-950 border border-slate-800 hover:border-emerald-600 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/30 flex flex-col justify-between space-y-6 cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center group-hover:scale-110 transition-transform font-bold text-lg">
                🎓
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Student Enrolled
                </span>
                <h2 className="text-xl font-bold text-white mt-2 group-hover:text-emerald-300 transition-colors">
                  Student Portal
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Student Dashboard. Scan dynamic QR codes with face verification, track subject-wise attendance, submit assignments, and view engagement analytics.
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
              <span>Open Student Portal</span>
              <span>&rarr;</span>
            </div>
          </a>
        </div>

        {/* README / Local Development Guide */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <h3 className="font-bold text-white text-sm">Local Development & Deployment Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
            <div className="space-y-2">
              <h4 className="font-semibold text-white">Running Portals Locally</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono">
                <li>Gateway Landing: <code className="text-indigo-300">http://localhost:3000/</code></li>
                <li>Admin Portal: <code className="text-purple-300">http://localhost:3000/admin.html</code></li>
                <li>Faculty Portal: <code className="text-blue-300">http://localhost:3000/faculty.html</code></li>
                <li>Student Portal: <code className="text-emerald-300">http://localhost:3000/student.html</code></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-white">Production Deployment Note</h4>
              <p className="text-slate-400">
                <strong className="text-indigo-300">TODO:</strong> Once Cloud Firestore is the single source of truth across all sessions, each portal HTML entry (`admin.html`, `faculty.html`, `student.html`) can be deployed to its own dedicated institutional subdomain or independent URL.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-950 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>Attendly AI Portal Gateway · National Institute of Computing & Engineering · Academic Session 2025–2026</p>
      </footer>
    </div>
  );
};

export default GatewayApp;

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<GatewayApp />);
}
