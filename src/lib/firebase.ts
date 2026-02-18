import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCcMEoxSYo2TnEBqiJe1Y8oQ8yIlGIalqc",
  authDomain: "fariasfrotas.firebaseapp.com",
  projectId: "fariasfrotas",
  storageBucket: "fariasfrotas.firebasestorage.app",
  messagingSenderId: "877636535840",
  appId: "1:877636535840:web:ccef978323073d65291e45"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
