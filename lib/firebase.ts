import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth, onAuthStateChanged, type User  } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (client-side only)
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let googleProvider: GoogleAuthProvider | undefined;

if (typeof window !== "undefined") {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  googleProvider = new GoogleAuthProvider();


  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.log("Multiple tabs open, persistence enabled in first tab only");
    } else if (err.code === "unimplemented") {
      console.log("Browser does not support persistence");
    }
  });
}

export { app, auth, db, storage, googleProvider };
export function getAuthClient(): Auth {
  if (!auth) {
    throw new Error("Auth not initialized (are you calling this on the server?)");
  }
  return auth;
}

export function waitForUser(): Promise<User | null> {
  const a = getAuthClient();

  // if already available, return immediately
  if (a.currentUser) return Promise.resolve(a.currentUser);

  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(a, (user) => {
      unsub();
      resolve(user);
    });
  });
}