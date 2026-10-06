import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase-config.js";


let authChecked = false;


export function protectAdminRoute(onAuthorized) {

  onAuthStateChanged(auth, async (user) => {

    // Firebase initial session check
    if (!user) {

      if (!authChecked) {
        authChecked = true;

        // Give Firebase a moment to restore the existing session
        setTimeout(() => {

          if (!auth.currentUser) {
            redirectToLogin();
          }

        }, 1000);

        return;
      }

      redirectToLogin();
      return;
    }


    authChecked = true;


    try {

      console.log("Admin Firebase UID:", user.uid);


      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);


      if (!snap.exists()) {

        console.error("Admin profile not found for UID:", user.uid);

        alert(
          "Admin profile not found in Firestore.\n\nUID: " +
          user.uid
        );

        await signOut(auth);
        redirectToLogin();
        return;
      }


      const data = snap.data();

      console.log("Admin Firestore profile:", data);


      const role = String(data.role || "")
        .trim()
        .toLowerCase();

      const status = String(data.status || "")
        .trim()
        .toLowerCase();


      console.log("Admin role:", role);
      console.log("Admin status:", status);


      if (role !== "admin") {

        alert(
          "This account is not registered as an Admin."
        );

        await signOut(auth);
        redirectToLogin();
        return;
      }


      if (status !== "active") {

        alert(
          "Admin account status is: " +
          status +
          "\n\nPlease contact the administrator."
        );

        await signOut(auth);
        redirectToLogin();
        return;
      }


      const adminData = {
        uid: user.uid,
        email: user.email || "",
        ...data
      };


      localStorage.setItem(
        "riseEdgeAdmin",
        JSON.stringify(adminData)
      );


      localStorage.setItem(
        "riseEdgeUser",
        JSON.stringify({
          uid: user.uid,
          email: user.email || "",
          name: data.name || "",
          role: role,
          status: status
        })
      );


      console.log("Admin authentication successful.");


      if (typeof onAuthorized === "function") {
        onAuthorized(adminData);
      }


    } catch (error) {

      console.error("ADMIN AUTH ERROR:", error);

      /*
        IMPORTANT:
        Do NOT automatically sign out when Firestore has a
        temporary/network/permission error.

        Otherwise the user can get stuck in a
        Login → Dashboard → Logout loop.
      */

      alert(
        "Admin verification failed.\n\n" +
        "Please check your internet connection and Firebase settings.\n\n" +
        "Error: " +
        error.message
      );

    }

  });

}


function redirectToLogin() {

  window.location.href = "../login.html";

}


export async function logoutAdmin() {

  try {

    await signOut(auth);

    localStorage.removeItem("riseEdgeAdmin");
    localStorage.removeItem("riseEdgeUser");

    window.location.href = "../login.html";

  } catch (error) {

    console.error("LOGOUT ERROR:", error);

    alert(
      "Logout failed. Please try again."
    );

  }

}
