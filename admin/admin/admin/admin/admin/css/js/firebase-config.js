import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import { getAuth } from
"https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


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

export default app;
