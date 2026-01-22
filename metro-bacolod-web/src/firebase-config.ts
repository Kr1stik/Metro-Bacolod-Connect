// src/firebase-config.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDfg3Dnr-YS0PbLa6gzutaA-xbGWJijlwM",
  authDomain: "metro-bacolod-connect.firebaseapp.com",
  projectId: "metro-bacolod-connect",
  storageBucket: "metro-bacolod-connect.firebasestorage.app",
  messagingSenderId: "691134114686",
  appId: "1:691134114686:web:679290269b1795abfba12f",
  measurementId: "G-2WX8G2G32C"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);