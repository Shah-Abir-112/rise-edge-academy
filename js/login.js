import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  message.textContent = "Logging in...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    message.textContent = "Login successful!";
    setTimeout(() => { window.location.href = "student/index.html"; }, 500);
  } catch (error) {
    console.error(error);
    if (error.code === "auth/invalid-credential") message.textContent = "Incorrect email or password.";
    else if (error.code === "auth/invalid-email") message.textContent = "Please enter a valid email.";
    else message.textContent = error.message;
  }
});