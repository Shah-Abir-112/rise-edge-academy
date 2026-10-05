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
    // 1. Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    console.log("AUTH UID:", user.uid);
    console.log("AUTH EMAIL:", user.email);

    // 2. Firestore user document
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      message.textContent = "User profile not found.";
      await signOut(auth);
      return;
    }

    const data = userSnap.data();

    const role = String(data.role || "").trim().toLowerCase();
    const status = String(data.status || "").trim().toLowerCase();

    console.log("FIRESTORE DATA:", data);
    console.log("ROLE:", role);
    console.log("STATUS:", status);

    // 3. Check status
    if (status !== "active") {
      message.textContent = `Account status: "${status}". Please contact admin.`;
      await signOut(auth);
      return;
    }

    // 4. Save login information
    localStorage.setItem(
      "riseEdgeUser",
      JSON.stringify({
        uid: user.uid,
        email: user.email,
        name: data.name || "",
        role: role,
        status: status
      })
    );

    message.textContent = "Login successful!";

    // 5. Role-based redirect
    setTimeout(() => {
      if (role === "admin") {
        window.location.href = "admin/index.html";
      } else if (role === "teacher") {
        window.location.href = "teacher/index.html";
      } else if (role === "student") {
        window.location.href = "student/index.html";
      } else {
        message.textContent = `Invalid role: ${role}`;
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
