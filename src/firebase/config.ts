import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfigData from '../../firebase-applet-config.json';

export const firebaseConfig = firebaseConfigData;

// Initialize Firebase App
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Initialize Cloud Firestore with custom database ID if specified
const dbId = firebaseConfig.firestoreDatabaseId;
export const db: Firestore = dbId && dbId !== '(default)'
  ? getFirestore(app, dbId)
  : getFirestore(app);

// Initialize Firebase Storage
export const storage: FirebaseStorage = getStorage(app);

/**
 * Validates connection to Cloud Firestore server
 */
export async function testFirestoreConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  try {
    // Attempt to read from connection test doc directly from server
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    return {
      connected: true,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    // If doc doesn't exist or permission-denied on test doc, it means we reached the Firestore server!
    if (
      error?.code === 'not-found' ||
      error?.code === 'permission-denied' ||
      (error?.message && !error.message.includes('the client is offline'))
    ) {
      return {
        connected: true,
        latencyMs,
      };
    }
    return {
      connected: false,
      latencyMs,
      error: error?.message || 'Client is offline or unable to connect to Firestore server',
    };
  }
}
