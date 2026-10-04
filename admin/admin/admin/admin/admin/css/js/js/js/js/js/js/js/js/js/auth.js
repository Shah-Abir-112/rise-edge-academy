import { firebaseConfig } from "./firebase-config.js";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const message = document.getElementById("msg");

    if (message) {
      message.textContent =
        "Firebase authentication will be connected soon.";
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const message = document.getElementById("msg");

    if (message) {
      message.textContent =
        "Firebase registration will be connected soon.";
    }
  });
}
