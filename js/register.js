import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";

const form = document.getElementById("registerForm");
const message = document.getElementById("message");
const accountType = document.getElementById("accountType");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const type = accountType.value;

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword =
    document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    message.textContent = "Passwords do not match.";
    return;
  }

  message.textContent = "Creating account...";

  try {

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;

    // =========================
    // STUDENT REGISTRATION
    // =========================

    if (type === "student") {

      const studentId =
        document.getElementById("studentId").value.trim();

      const className =
        document.getElementById("className").value.trim();

      const section =
        document.getElementById("section").value.trim();

      await setDoc(doc(db, "users", user.uid), {

        name: name,
        email: user.email,

        role: "student",

        studentId: studentId,

        className: className,

        section: section,

        status: "pending",

        createdAt: serverTimestamp()

      });

      message.textContent =
        "Student registration submitted! Please wait for admin approval.";
    }


    // =========================
    // TEACHER REGISTRATION
    // =========================

    else if (type === "teacher") {

      const subject =
        document.getElementById("subject").value.trim();

      const qualification =
        document.getElementById("qualification").value.trim();

      await setDoc(doc(db, "users", user.uid), {

        name: name,
        email: user.email,

        role: "teacher",

        teacherId: "",

        subject: subject,

        qualification: qualification,

        className: "",

        section: "",

        status: "pending",

        createdAt: serverTimestamp()

      });

      message.textContent =
        "Teacher registration submitted! Please wait for admin approval.";
    }


    form.reset();

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1800);


  } catch (error) {

    console.error("REGISTRATION ERROR:", error);

    if (error.code === "auth/email-already-in-use") {

      message.textContent =
        "This email is already registered.";

    } else if (error.code === "auth/weak-password") {

      message.textContent =
        "Password must be at least 6 characters.";

    } else if (error.code === "auth/invalid-email") {

      message.textContent =
        "Please enter a valid email.";

    } else {

      message.textContent =
        error.message;
    }
  }
});
