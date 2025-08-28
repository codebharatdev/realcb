// Utility functions for safely importing Firebase in API routes
// This prevents build-time errors when Firebase is not configured

let firebaseDb: any = null;
let firestoreFunctions: any = null;

export function getFirebaseForAPI() {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    return { db: null, firestore: null };
  }

  if (!firebaseDb) {
    try {
      const firebase = require('./firebase');
      const firestore = require('firebase/firestore');
      firebaseDb = firebase.db;
      firestoreFunctions = firestore;
    } catch (error) {
      console.error('Failed to initialize Firebase for API:', error);
      return { db: null, firestore: null };
    }
  }

  return { db: firebaseDb, firestore: firestoreFunctions };
}

export function isFirebaseAvailable() {
  return !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
}
