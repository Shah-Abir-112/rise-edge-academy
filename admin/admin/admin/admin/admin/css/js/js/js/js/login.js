import { signInWithEmailAndPassword } from
"https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { auth } from "./firebase-config.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("loginMessage");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  message.textContent = "Logging in...";

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    console.log("Login successful:", result.user.email);

    message.textContent = "Login successful!";

    setTimeout(() => {
      window.location.href = "student/index.html";
    }, 500);

  } catch (error) {
    console.error(error);

    message.textContent = "Login failed: " + error.code;
  }
});
