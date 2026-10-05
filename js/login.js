import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
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
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      message.textContent = "User profile not found.";
      await signOut(auth);
      return;
    }

    const userData = userDoc.data();

    const role = String(userData.role || "").trim().toLowerCase();
    const status = String(userData.status || "").trim().toLowerCase();

    console.log("UID:", user.uid);
    console.log("Role:", role);
    console.log("Status:", status);

    if (status !== "active") {
      message.textContent = "Your account is not active.";
      await signOut(auth);
      return;
    }

    localStorage.setItem(
      "riseEdgeUser",
      JSON.stringify({
        uid: user.uid,
        email: user.email,
        name: userData.name || "",
        role: role
      })
    );

    message.textContent = "Login successful!";

    setTimeout(() => {
      if (role === "student") {
        window.location.href = "student/index.html";
      } else if (role === "teacher") {
        window.location.href = "teacher/index.html";
      } else if (role === "admin") {
        window.location.href = "admin/index.html";
      } else {
        message.textContent = "Invalid user role.";
        signOut(auth);
      }
    }, 500);

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      message.textContent = "Incorrect email or password.";
    } else if (error.code === "auth/invalid-email") {
      message.textContent = "Please enter a valid email.";
    } else {
      message.textContent = error.message;
    }
  }
});
