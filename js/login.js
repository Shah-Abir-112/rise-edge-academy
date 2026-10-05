import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  message.textContent = "Logging in...";

  try {
    // Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    // Get user's profile from Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      message.textContent = "User profile not found.";
      await auth.signOut();
      return;
    }

    const userData = userDoc.data();

    // Check account status
    if (userData.status !== "active") {
      message.textContent = "Your account is not active.";
      await auth.signOut();
      return;
    }

    // Save basic user information
    localStorage.setItem(
      "riseEdgeUser",
      JSON.stringify({
        uid: user.uid,
        email: user.email,
        name: userData.name,
        role: userData.role
      })
    );

    message.textContent = "Login successful!";

    // Role-based redirect
    setTimeout(() => {
      if (userData.role === "student") {
        window.location.href = "student/index.html";
      } 
      else if (userData.role === "teacher") {
        window.location.href = "teacher/index.html";
      } 
      else if (userData.role === "admin") {
        window.location.href = "admin/index.html";
      } 
      else {
        message.textContent = "Invalid user role.";
        auth.signOut();
      }
    }, 500);

  } catch (error) {
    console.error(error);

    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      message.textContent = "Incorrect email or password.";
    } 
    else if (error.code === "auth/invalid-email") {
      message.textContent = "Please enter a valid email.";
    } 
    else {
      message.textContent = error.message;
    }
  }
});
