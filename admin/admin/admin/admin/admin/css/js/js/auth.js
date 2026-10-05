import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { auth } from "./firebase-config.js";


// =====================
// REGISTER
// =====================

export async function registerUser(email, password) {
  try {
    const userCredential =
      await createUserWithEmailAndPassword(auth, email, password);

    alert("Registration successful! 🎉");

    window.location.href = "login.html";

    return userCredential.user;

  } catch (error) {

    console.error(error);

    if (error.code === "auth/email-already-in-use") {
      alert("This email is already registered.");
    } else if (error.code === "auth/weak-password") {
      alert("Password must be at least 6 characters.");
    } else if (error.code === "auth/invalid-email") {
      alert("Please enter a valid email.");
    } else {
      alert(error.message);
    }

  }
}


// =====================
// LOGIN
// =====================

export async function loginUser(email, password) {
  try {

    const userCredential =
      await signInWithEmailAndPassword(auth, email, password);

    alert("Login successful! 🎉");

    window.location.href = "student/index.html";

    return userCredential.user;

  } catch (error) {

    console.error(error);

    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      alert("Email or password is incorrect.");
    } else {
      alert(error.message);
    }

  }
}


// =====================
// LOGOUT
// =====================

export async function logoutUser() {

  try {

    await signOut(auth);

    window.location.href = "../login.html";

  } catch (error) {

    console.error(error);
    alert("Logout failed.");

  }

}
