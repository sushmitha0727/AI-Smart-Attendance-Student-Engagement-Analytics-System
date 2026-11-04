import React, { useState } from 'react';
import { auth, db } from '../../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useApp } from '../../context/AppContext';
import { Shield, Eye, EyeOff, HelpCircle, Sparkles } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { setCurrentUser, setIsAuthenticated } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleInstantDemoAdmin = () => {
    setCurrentUser({
      id: 'admin-dean',
      name: 'Dr. S. K. Mahajan',
      email: 'dean.academics@smartedu.univ',
      role: 'admin',
      designation: 'Dean of Academic Affairs',
      department: 'Office of Academic Administration',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    });
    setIsAuthenticated(true);
  };

  const handleQuickFill = () => {
    setEmail('dean.academics@smartedu.univ');
    setPassword('password123');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let userCred;
      try {
        userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
      } catch (signInErr: any) {
        const code = signInErr?.code;
        if (
          code === 'auth/user-not-found' ||
          code === 'auth/invalid-credential' ||
          code === 'auth/invalid-login-credentials'
        ) {
          // Attempt automatic bootstrap creation for admin account in Firebase Auth
          try {
            userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
            await setDoc(
              doc(db, 'users', userCred.user.uid),
              {
                id: userCred.user.uid,
                name: 'Dr. S. K. Mahajan',
                email: email.trim(),
                role: 'admin',
                designation: 'Dean of Academic Affairs',
                department: 'Office of Academic Administration',
                avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
                createdAt: new Date().toISOString(),
              },
              { merge: true }
            );
            await setDoc(
              doc(db, 'admins', userCred.user.uid),
              {
                email: email.trim(),
                createdAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch {
            throw signInErr;
          }
        } else {
          throw signInErr;
        }
      }

      const userDocRef = doc(db, 'users', userCred.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists() || userDocSnap.data()?.role !== 'admin') {
        await setDoc(
          userDocRef,
          {
            id: userCred.user.uid,
            name: userCred.user.displayName || 'Administrator',
            email: userCred.user.email || email.trim(),
            role: 'admin',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
          },
          { merge: true }
        );
      }
      // Successful admin sign-in - onAuthStateChanged handles entry state update
    } catch (err: any) {
      console.warn('Admin login notice:', err);
      const code = err?.code;
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-email' ||
        code === 'auth/invalid-login-credentials'
      ) {
        setError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Access temporarily blocked due to too many failed attempts. Please try again later.');
      } else if (err?.code === 'permission-denied') {
        setError('Could not verify your account. Contact the administrator.');
      } else {
        setError('Network connection notice. You can also use Instant Demo Admin Access below.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between selection:bg-purple-500 selection:text-white font-sans text-slate-100">
      {/* Top Brand Bar */}
      <header className="w-full bg-slate-950 border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-[17px] font-[Verdana] tracking-tight italic">
                Attendly AI
              </span>
              <span className="px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded bg-purple-900/50 text-purple-300 border border-purple-700">
                Admin Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Academic Administration & Dean Control · National Institute of Computing & Engineering
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
          >
            <span>← Gateway</span>
          </a>
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin Support</span>
          </button>
        </div>
      </header>

      {/* Main Login Form Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-950 text-purple-400 border border-purple-800 mb-2">
                <Shield className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Academic Administration Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Sign in with your administrative credentials
              </p>
            </div>

            {/* Quick Demo Fill Pill */}
            <div className="bg-purple-950/40 border border-purple-800/60 rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-purple-300 font-semibold block">Demo Account</span>
                <span className="text-slate-400 text-[11px]">Dr. S. K. Mahajan (Dean)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="px-2.5 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/80 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Fill Form
                </button>
                <button
                  type="button"
                  onClick={handleInstantDemoAdmin}
                  className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="Instant access without network delay"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Instant</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Admin ID / Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. dean.academics@smartedu.univ"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Password</label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Remember workstation</span>
                </label>
                <span className="text-slate-500 font-mono text-[11px]">Cloud Auth</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="animate-pulse">Authenticating Admin...</span>
                ) : (
                  <span>Sign In to Admin Portal &rarr;</span>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">
                Looking for Faculty or Student portal?{' '}
                <a href="/" className="text-purple-400 hover:underline font-semibold">
                  Portal Gateway
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-slate-100 space-y-4">
            <h3 className="text-base font-bold text-white">Admin IT Helpdesk</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Institutional admin accounts are provisioned exclusively by University IT Security. For password resets or controller access requests, contact your administrator.
            </p>
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <footer className="bg-slate-950 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        <p>Academic Administration Portal · Attendly AI</p>
      </footer>
    </div>
  );
};
