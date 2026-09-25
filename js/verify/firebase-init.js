/* verify.html — Firebase (Firestore) ইনিশিয়ালাইজেশন */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBMfeFWtyE-raexNO8DkpyXBQFvE3yNIRU",
  authDomain: "rupshajf.firebaseapp.com",
  projectId: "rupshajf",
  storageBucket: "rupshajf.firebasestorage.app",
  messagingSenderId: "878760730320",
  appId: "1:878760730320:web:39ef84c2b447e24df5c8d5",
  measurementId: "G-BF5ZPK7NZS"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
