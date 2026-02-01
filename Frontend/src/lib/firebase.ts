// Frontend/src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// PASTE YOUR CONFIG HERE
const firebaseConfig = {
  apiKey: "AIzaSyCYMVxIYgAB_hqXqNM3MLRVrIeRT6thCG0",
  authDomain: "prepped-ai-3cde1.firebaseapp.com",
  projectId: "prepped-ai-3cde1",
  storageBucket: "prepped-ai-3cde1.firebasestorage.app",
  messagingSenderId: "47577111368",
  appId: "1:47577111368:web:ef62543728bf492bdd317d",
  measurementId: "G-SPZ85GB4Z4"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();