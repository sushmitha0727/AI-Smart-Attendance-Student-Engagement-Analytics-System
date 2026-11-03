import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  KeyRound,
} from 'lucide-react';
import { Role } from '../../types';

interface DemoAccountPreset {
  role: Role;
  label: string;
  sublabel: string;
  identifier: string;
  password: string;
  avatarUrl: string;
  name: string;
}

const DEMO_PRESETS: DemoAccountPreset[] = [
  {
    role: 'admin',
    label: 'Institution Admin',
    sublabel: 'Dean of Academic Affairs',
    identifier: 'dean.academics@smartedu.univ',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    name: 'Dr. S. K. Mahajan',
  },
  {
    role: 'faculty',
    label: 'Course Faculty',
    sublabel: 'Associate Professor (CSE)',
    identifier: 'ramesh.kumar@univ.edu',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    name: 'Dr. Ramesh Kumar',
  },
  {
    role: 'student',
    label: 'Enrolled Student',
    sublabel: 'Roll No: 2024CS01 (Semester 3)',
    identifier: '2024CS01',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    name: 'Aarav Sharma',
  },
];

export const LoginPage: React.FC = () => {
  const { login } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activePresetRole, setActivePresetRole] = useState<Role | null>(null);

  const handlePresetSelect = (preset: DemoAccountPreset, autoSubmit: boolean = false) => {
    setIdentifier(preset.identifier);
    setPassword(preset.password);
    setActivePresetRole(preset.role);
    setError(null);

    if (autoSubmit) {
      setIsLoading(true);
      setTimeout(() => {
        const result = login(preset.identifier, preset.password, rememberMe);
        setIsLoading(false);
        if (!result.success) {
          setError(result.message || 'Login failed.');
        }
      }, 350);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = login(identifier, password, rememberMe);
      setIsLoading(false);
      if (!res.success) {
        setError(res.message || 'Invalid User ID or password.');
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* Top Simple Brand Bar */}
      <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-900 flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#162b78] text-[17px] font-[Verdana] tracking-tight italic">
                Attendly AI
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Institute System
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              National Institute of Computing & Engineering · Academic Session 2025–2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">IT Helpdesk</span>
          </button>
        </div>
      </header>

      {/* Main Login Form Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
            {/* Title & Subtitle */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Sign in to your account
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Enter your institutional User ID, Roll Number, or Email
              </p>
            </div>

            {/* Strict IAM Policy Badge: Admin Creates ID, Users Only Log In */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5 text-left">
              <ShieldCheck className="w-4 h-4 text-[#162b78] shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-600 leading-normal">
                <span className="font-bold text-slate-900 block">Institutional Access Policy</span>
                Only Institute Administrators can create and issue IDs. Students and faculty can only log in with university-assigned credentials.
              </div>
            </div>

            {/* Role Quick Selector */}
            <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 flex text-xs font-semibold">
              <button
                type="button"
                onClick={() => handlePresetSelect(DEMO_PRESETS[0], false)}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  activePresetRole === 'admin'
                    ? 'bg-white text-purple-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect(DEMO_PRESETS[1], false)}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  activePresetRole === 'faculty'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Faculty
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect(DEMO_PRESETS[2], false)}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  activePresetRole === 'student'
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Student
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User ID Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  User ID / Roll Number / Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setActivePresetRole(null);
                    }}
                    placeholder="e.g. 2024CS01, ramesh.kumar@univ.edu, or admin"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-600">Remember this workstation</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">Demo: password123</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#162b78] hover:bg-[#10205c] active:bg-[#0c1845] text-white text-sm font-semibold rounded-lg shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick One-Click Demo Logins */}
            <div className="pt-4 border-t border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5 text-center">
                Instant One-Click Demo Access
              </span>
              <div className="space-y-2">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    key={preset.role}
                    type="button"
                    onClick={() => handlePresetSelect(preset, true)}
                    className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={preset.avatarUrl}
                        alt={preset.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 flex items-center gap-1.5">
                          <span>{preset.name}</span>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              preset.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : preset.role === 'faculty'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {preset.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{preset.sublabel}</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      Enter &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {/* Institutional IAM Account Policy Callout */}
            <div className="pt-3 border-t border-slate-100 text-center space-y-1">
              <div className="text-xs text-slate-500">
                <span>Looking to create an account? </span>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-indigo-700 font-semibold hover:underline cursor-pointer"
                >
                  Admin Authority Only
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Students and Faculty are restricted to login only. IDs are issued exclusively by the Academic Administration Office.
              </p>
            </div>
          </div>

          {/* Security & System Compliance Callout */}
          <div className="mt-5 text-center space-y-2">
            <div className="inline-flex items-center gap-2 text-xs text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Role-Based Access Control (RBAC) Enforced</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Zero Raw Biometric Storage · Dynamic Rotating QR Verification
            </p>
          </div>
        </div>
      </main>

      {/* Helpdesk Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span>Institutional IT Helpdesk & Access Policy</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                <strong className="block mb-0.5">Strict ID Creation Policy:</strong>
                Individual students and faculty cannot self-register. Only verified <strong>Institute Administrators</strong> can create User IDs, generate Roll Numbers, and provision credentials.
              </div>
              <p>
                <strong>Students:</strong> Your User ID is your Institute Roll Number (e.g. <span className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">2024CS01</span>). Default demo password is <span className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">password123</span>.
              </p>
              <p>
                <strong>Faculty & Staff:</strong> Sign in with your official university email (e.g. <span className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">ramesh.kumar@univ.edu</span>) or Faculty Code.
              </p>
              <p>
                <strong>Admins:</strong> Use the Dean of Academic Affairs account (<span className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">dean.academics@smartedu.univ</span>) to access the ID & User Provisioning center.
              </p>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                <span className="font-semibold block mb-0.5">Need a password reset or new ID?</span>
                Contact campus computing services at <span className="font-mono">support@nice.edu</span> or visit the Office of Academic Affairs (Room 101, Main Block).
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Help
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>Attendly AI · Smart Attendance & Engagement Analytics</span>
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
