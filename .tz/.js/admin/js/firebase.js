/* admin panel — Firebase (Auth + Firestore) ইনিশিয়ালাইজেশন
   একই Firebase প্রজেক্ট (member-selection) ব্যবহার করা হচ্ছে যেটা verify.html ও registration.js ব্যবহার করে */
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, writeBatch, deleteField
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  createUserWithEmailAndPassword, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBMfeFWtyE-raexNO8DkpyXBQFvE3yNIRU",
  authDomain: "rupshajf.firebaseapp.com",
  projectId: "rupshajf",
  storageBucket: "rupshajf.firebasestorage.app",
  messagingSenderId: "878760730320",
  appId: "1:878760730320:web:39ef84c2b447e24df5c8d5",
  measurementId: "G-BF5ZPK7NZS"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export {
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, orderBy,
  serverTimestamp, writeBatch, deleteField,
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  /* সদস্যের লগইন অ্যাকাউন্ট তৈরির জন্য (আলাদা "সেকেন্ডারি" অ্যাপ দিয়ে — অ্যাডমিনের লগইন অক্ষত থাকে) */
  initializeApp, deleteApp, getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail
};
