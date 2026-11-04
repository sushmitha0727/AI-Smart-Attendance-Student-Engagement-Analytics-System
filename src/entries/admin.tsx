import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { AppProvider, useApp } from '../context/AppContext';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminPortal } from '../components/admin/AdminPortal';
import { Shield, LogOut, Loader2 } from 'lucide-react';
import { loadFaceApiModels } from '../utils/faceVerification';
import '../index.css';

const AdminAppContent: React.FC = () => {
  const { setCurrentUser, setIsAuthenticated, currentUser, isAuthenticated, logout: contextLogout } = useApp();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    loadFaceApiModels().catch(err => console.log('Background face-api model preload notice:', err));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsCheckingAuth(true);
      setAuthError(null);
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists() && userDocSnap.data()?.role === 'admin') {
            const data = userDocSnap.data();
            setCurrentUser({
              id: firebaseUser.uid,
              name: data.name || firebaseUser.displayName || 'Administrator',
              email: data.email || firebaseUser.email || '',
              role: 'admin',
              avatarUrl: data.avatarUrl || '',
            });
            setIsAuthenticated(true);
          } else {
            await signOut(auth);
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (err: any) {
        console.error('Admin auth state verification error:', err);
        if (err?.code === 'permission-denied') {
          setAuthError('Could not verify your account. Contact the administrator.');
        } else {
          setAuthError('Network connection error. Please check your internet connection.');
        }
        await signOut(auth).catch(() => {});
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [setCurrentUser, setIsAuthenticated]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      contextLogout();
    } catch (e) {
      console.error('Sign out error:', e);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 gap-3 font-sans">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <p className="text-xs text-slate-400">Verifying administrative credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div>
        {authError && (
          <div className="bg-rose-950 text-rose-200 p-3 text-center text-xs font-medium border-b border-rose-800">
            {authError}
          </div>
        )}
        <AdminLogin />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-950 border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40">
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
              Academic Administration & Dean Control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">{currentUser.name}</span>
            <span className="text-purple-400 font-bold uppercase text-[10px]">ADMIN</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Sign Out of Admin Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1">
        <AdminPortal />
      </main>

      <footer className="bg-slate-950 border-t border-slate-800 py-5 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>Academic Administration Portal · Attendly AI</span>
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

export default function AdminApp() {
  return (
    <AppProvider>
      <AdminAppContent />
    </AppProvider>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<AdminApp />);
}
