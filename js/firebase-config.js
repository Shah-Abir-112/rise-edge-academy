import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyA1AE8hvzGCtFYrMTs9Bl77yw910jg4Zys",
  authDomain: "rise-edge-academy-2026.firebaseapp.com",
  projectId: "rise-edge-academy-2026",
  storageBucket: "rise-edge-academy-2026.firebasestorage.app",
  messagingSenderId: "1045318775039",
  appId: "1:1045318775039:web:e879c5ab7efa53a24e5cca"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);


/*
  Keep Firebase login session in the browser.
  This allows the user to stay logged in when
  moving from login.html to the Admin Dashboard.
*/

setPersistence(
  auth,
  browserLocalPersistence
).catch(error => {
  console.error(
    "Firebase Auth persistence error:",
    error
  );
});


export default app;
