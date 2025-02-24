import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";

// Add this before initializing Firebase
console.log('Firebase config check:', {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
});

// Add this console log to verify config
console.log('Checking Firebase config:', {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Present' : 'Missing',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Present' : 'Missing',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Present' : 'Missing'
});

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only if it hasn't been initialized already
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
} else {
  app = getApps()[0];
}

// Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize storage with CORS settings
const storage = getStorage(app);

const provider = new GoogleAuthProvider();

// Add scopes for Google provider (optional)
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Test Firestore connection
const testFirestore = async () => {
  try {
    const testDoc = doc(db, 'test', 'test');
    await setDoc(testDoc, { test: true });
    console.log('Firestore connection successful');
  } catch (error) {
    console.error('Firestore connection failed:', error);
  }
};

testFirestore();

export { auth, provider, db, storage };
