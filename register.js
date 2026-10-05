import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const form = document.getElementById("registerForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    message.textContent = "Passwords do not match.";
    return;
  }

  message.textContent = "Creating account...";

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    message.textContent = "Account created successfully!";
    setTimeout(() => { window.location.href = "login.html"; }, 1000);
  } catch (error) {
    console.error(error);
    if (error.code === "auth/email-already-in-use") message.textContent = "This email is already registered.";
    else if (error.code === "auth/weak-password") message.textContent = "Password must be at least 6 characters.";
    else message.textContent = error.message;
  }
});