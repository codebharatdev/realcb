// Utility functions for safely importing Firebase in API routes
// This prevents build-time errors when Firebase is not configured

let firebaseDb: any = null;
let firestoreFunctions: any = null;

export async function getFirebaseForAPI() {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    return { db: null, firestore: null };
  }

  if (!firebaseDb) {
    try {
      // Import Firebase modules dynamically
      const { initializeApp, getApps } = await import('firebase/app');
      const { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
      
      // Initialize Firebase if not already done
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      // Check if all required config values are present
      const hasValidConfig = firebaseConfig.apiKey && 
                            firebaseConfig.authDomain && 
                            firebaseConfig.projectId && 
                            firebaseConfig.storageBucket && 
                            firebaseConfig.messagingSenderId && 
                            firebaseConfig.appId;

      if (hasValidConfig) {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        firebaseDb = getFirestore(app);
        firestoreFunctions = {
          doc,
          getDoc,
          setDoc,
          updateDoc,
          deleteDoc,
          collection,
          addDoc,
          getDocs,
          query,
          where,
          orderBy,
          limit
        };
      } else {
        console.error('Firebase configuration incomplete');
        return { db: null, firestore: null };
      }
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
