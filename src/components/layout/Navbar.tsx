import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  Users,
  UserCheck,
  ShieldAlert,
  RotateCcw,
  ChevronDown,
  Sparkles,
  Info,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, setCurrentUser, availableUsers, resetToDefaults } = useApp();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDemoInfo, setShowDemoInfo] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'faculty':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'student':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Institution Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-900 flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base tracking-tight">
                  Smart Attendance & Engagement Analytics
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Institute System
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                National Institute of Computing & Engineering · Academic Session 2025–2026
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Demo Mode Pill */}
            <button
              type="button"
              onClick={() => setShowDemoInfo(true)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
              title="Click to view Demo Verification details"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Demo Mode</span>
              <Info className="w-3 h-3 text-amber-500 ml-0.5" />
            </button>

            {/* Reset Data Button */}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all demo data back to clean factory defaults?')) {
                  resetToDefaults();
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              title="Reset records to default sample"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Active User / Role Switcher Button */}
            <button
              type="button"
              onClick={() => setShowRoleModal(true)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer group"
            >
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-300"
              />
              <div className="text-left text-xs">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="truncate max-w-[120px] sm:max-w-[150px]">{currentUser.name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getRoleBadge(currentUser.role)}`}>
                    {currentUser.role.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span>Switch Role</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Role Switcher Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Select Portal & Demo Account</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Switch between Admin, Faculty, and Student accounts to test role-specific workflows.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
              {/* Admin Accounts */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-purple-700 flex items-center gap-1.5 mb-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Admin Portal</span>
                </div>
                <div className="space-y-1.5">
                  {availableUsers
                    .filter(u => u.role === 'admin')
                    .map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setCurrentUser(user);
                          setShowRoleModal(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                          currentUser.id === user.id
                            ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-semibold text-sm text-slate-900">{user.name}</div>
                            <div className="text-xs text-slate-500">{user.designation} · {user.department}</div>
                          </div>
                        </div>
                        {currentUser.id === user.id && (
                          <span className="text-xs font-semibold text-purple-700">Active</span>
                        )}
                      </button>
                    ))}
                </div>
              </div>

              {/* Faculty Accounts */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 flex items-center gap-1.5 mb-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Faculty Portal</span>
                </div>
                <div className="space-y-1.5">
                  {availableUsers
                    .filter(u => u.role === 'faculty')
                    .map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setCurrentUser(user);
                          setShowRoleModal(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                          currentUser.id === user.id
                            ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-semibold text-sm text-slate-900">{user.name}</div>
                            <div className="text-xs text-slate-500">
                              {user.id === 'fac-ramesh' && 'Java Programming & Data Mining (2nd Year – A)'}
                              {user.id === 'fac-anita' && 'Theory of Computation & Cryptography (2nd Year – A)'}
                              {user.id === 'fac-vikram' && 'Leadership & Soft Skills (1st Year – A & B)'}
                            </div>
                          </div>
                        </div>
                        {currentUser.id === user.id && (
                          <span className="text-xs font-semibold text-blue-700">Active</span>
                        )}
                      </button>
                    ))}
                </div>
              </div>

              {/* Student Accounts */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 mb-2">
                  <Users className="w-4 h-4" />
                  <span>Student Portal</span>
                </div>
                <div className="space-y-1.5">
                  {availableUsers
                    .filter(u => u.role === 'student')
                    .slice(0, 3)
                    .map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setCurrentUser(user);
                          setShowRoleModal(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                          currentUser.id === user.id
                            ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                              <span>{user.name}</span>
                              <span className="text-xs text-slate-500 font-mono">({user.rollNumber})</span>
                            </div>
                            <div className="text-xs text-slate-500">
                              {user.id === 'stud-aarav' && '2nd Year – A · 87.5% Attendance · High Engagement'}
                              {user.id === 'stud-priya' && '2nd Year – A · 62.5% Attendance (At Risk) · Active Recovery'}
                              {user.id === 'stud-rohan' && '2nd Year – A · 76.0% Attendance'}
                            </div>
                          </div>
                        </div>
                        {currentUser.id === user.id && (
                          <span className="text-xs font-semibold text-emerald-700">Active</span>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Mode Notice Modal */}
      {showDemoInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5">
            <h3 className="font-semibold text-slate-900 text-base mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Demo Verification & Compliance Notice</span>
            </h3>
            <div className="text-xs text-slate-600 space-y-2.5">
              <p>
                <strong>Face Liveness & 1:1 Matching:</strong> Runs in clearly labelled <em>Demo Verification Mode</em> using client-side video simulation and consented student institutional profile photo matching.
              </p>
              <p>
                <strong>Privacy Guarantee:</strong> Raw camera video is processed transiently and is <strong>never retained</strong> or uploaded to any external server.
              </p>
              <p>
                <strong>No Aadhaar Integration:</strong> The system does not claim or require Aadhaar or government biometric integration.
              </p>
              <p>
                <strong>Rotating QR Security:</strong> QR codes rotate dynamically every 5 seconds. Scans outside the scheduled 15-minute window or with stale tokens are automatically flagged or rejected.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDemoInfo(false)}
                className="px-4 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
