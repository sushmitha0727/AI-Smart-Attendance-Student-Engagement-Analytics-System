import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../firebase/config';
import { User, Role } from '../types';

/**
 * Resolves an identifier (email, roll number, student ID, employee ID) to an institutional email
 */
export async function resolveEmailFromIdentifier(identifier: string): Promise<string> {
  const trimmed = identifier.trim();

  // If already an email, return as-is
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }

  // Common institutional aliases
  if (trimmed.toLowerCase() === 'admin') {
    return 'admin@attendly.edu';
  }

  try {
    // 1. Search in users collection by rollNumber
    const rollQuery = query(
      collection(db, 'users'),
      where('rollNumber', '==', trimmed),
      limit(1)
    );
    const rollSnap = await getDocs(rollQuery);
    if (!rollSnap.empty) {
      return rollSnap.docs[0].data().email;
    }

    // 2. Search in students collection by studentId
    const studentQuery = query(
      collection(db, 'students'),
      where('studentId', '==', trimmed),
      limit(1)
    );
    const studentSnap = await getDocs(studentQuery);
    if (!studentSnap.empty) {
      return studentSnap.docs[0].data().email;
    }

    // 3. Search in faculty collection by facultyId
    const facultyQuery = query(
      collection(db, 'faculty'),
      where('facultyId', '==', trimmed),
      limit(1)
    );
    const facultySnap = await getDocs(facultyQuery);
    if (!facultySnap.empty) {
      return facultySnap.docs[0].data().email;
    }

    // 4. Search in users collection by employeeId
    const empQuery = query(
      collection(db, 'users'),
      where('employeeId', '==', trimmed),
      limit(1)
    );
    const empSnap = await getDocs(empQuery);
    if (!empSnap.empty) {
      return empSnap.docs[0].data().email;
    }
  } catch (error) {
    console.warn('Error querying Firestore for user identifier:', error);
  }

  // Fallback to convention
  const cleanId = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanId}@student.univ.edu`;
}

/**
 * Firebase Authentication: Sign in with email or institutional ID and password
 */
export async function loginWithFirebase(
  idOrEmail: string,
  password: string
): Promise<{ firebaseUser: FirebaseUser; email: string }> {
  const email = await resolveEmailFromIdentifier(idOrEmail);
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return {
    firebaseUser: userCredential.user,
    email,
  };
}

/**
 * Firebase Authentication: Sign out current user
 */
export async function logoutFromFirebase(): Promise<void> {
  await signOut(auth);
}

/**
 * Admin provision helper: creates Firebase Auth account for student or faculty
 * Uses a temporary secondary app instance so the logged-in administrator is NOT signed out.
 */
export async function provisionFirebaseAuthAccount(
  email: string,
  temporaryPassword = 'password123'
): Promise<string> {
  const tempAppName = `Provisioner_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const secondaryApp = initializeApp(firebaseConfig, tempAppName);
  try {
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, temporaryPassword);
    const uid = cred.user.uid;
    await signOut(secondaryAuth);
    return uid;
  } catch (error: any) {
    // If account already exists in Auth, that's fine
    if (error?.code === 'auth/email-already-in-use') {
      return 'existing-auth-user';
    }
    console.warn('Firebase Auth provisioning notice:', error?.message);
    return 'offline-user-uid';
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch (e) {
      // ignore
    }
  }
}
