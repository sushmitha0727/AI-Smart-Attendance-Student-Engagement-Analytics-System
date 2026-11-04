import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Users, Eye, EyeOff, HelpCircle, Sparkles } from 'lucide-react';

export const FacultyLogin: React.FC = () => {
  const { login } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleQuickFill = () => {
    setIdentifier('ramesh.kumar@univ.edu');
    setPassword('password123');
    setError(null);
  };

  const handleInstantDemoFaculty = () => {
    setIsLoading(true);
    setTimeout(() => {
      const res = login('ramesh.kumar@univ.edu', 'password123', true, 'faculty');
      setIsLoading(false);
      if (!res.success) {
        setError(res.message || 'Could not sign into demo faculty account.');
      }
    }, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = login(identifier, password, rememberMe, 'faculty');
      setIsLoading(false);
      if (!res.success) {
        setError(res.message || 'This account is not a Faculty account.');
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 font-sans text-slate-900">
      {/* Top Brand Bar */}
      <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
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
              Course Instructor & Department Portal · National Institute of Computing & Engineering
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <span>← Gateway</span>
          </a>
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Faculty Helpdesk</span>
          </button>
        </div>
      </header>

      {/* Main Login Form Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 mb-2">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Faculty Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Enter your Employee ID, institutional email, or username
              </p>
            </div>

            {/* Quick Demo Fill Pill */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-blue-900 font-semibold block">Demo Account</span>
                <span className="text-slate-500 text-[11px]">Dr. Ramesh Kumar (FAC301)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Fill Form
                </button>
                <button
                  type="button"
                  onClick={handleInstantDemoFaculty}
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="Instant access without typing"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Instant</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Employee ID / Email
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="e.g. ramesh.kumar@univ.edu or FAC301"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">Password</label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember this session</span>
                </label>
                <span className="text-slate-400 font-mono text-[11px]">Secure Faculty Access</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="animate-pulse">Signing in...</span>
                ) : (
                  <span>Sign In to Faculty Portal &rarr;</span>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500">
                Need to access Admin or Student portal?{' '}
                <a href="/" className="text-blue-700 hover:underline font-semibold">
                  Portal Gateway
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 text-slate-900 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Faculty IT Support</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Faculty credentials are issued by the Academic Administration Office. Contact <strong className="text-blue-700">dean.academics@smartedu.univ</strong> if you need your employee ID or password reset.
            </p>
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>Faculty Portal · Attendly AI</p>
      </footer>
    </div>
  );
};
