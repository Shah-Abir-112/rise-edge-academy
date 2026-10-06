import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
doc,
getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
auth,
db,
authPersistenceReady
} from "./firebase-config.js";

export function protectAdminRoute(onAuthorized) {

/*
IMPORTANT:
Wait for Firebase Auth persistence to be
fully initialized before checking auth state.
*/

authPersistenceReady
.then(() => {

  onAuthStateChanged(
    auth,
    async (user) => {

      console.log(
        "AUTH STATE:",
        user
      );


      // No Firebase user
      if (!user) {

        showAuthMessage(
          "No Firebase login session found. Please login again."
        );

        setTimeout(() => {

          window.location.href =
            "../login.html";

        }, 2500);

        return;
      }


      try {

        console.log(
          "Firebase UID:",
          user.uid
        );

        console.log(
          "Firebase Email:",
          user.email
        );


        // Get admin profile
        const userRef =
          doc(
            db,
            "users",
            user.uid
          );


        const snap =
          await getDoc(userRef);


        // Firestore profile does not exist
        if (!snap.exists()) {

          showAuthMessage(
            "ERROR: Admin Firestore profile was not found.\n\n" +
            "Firebase UID:\n" +
            user.uid
          );

          console.error(
            "No users document for UID:",
            user.uid
          );

          return;
        }


        const data =
          snap.data();


        console.log(
          "Firestore Admin Data:",
          data
        );


        const role =
          String(
            data.role || ""
          )
            .trim()
            .toLowerCase();


        const status =
          String(
            data.status || ""
          )
            .trim()
            .toLowerCase();


        console.log(
          "Detected Role:",
          role
        );

        console.log(
          "Detected Status:",
          status
        );


        // Wrong role
        if (role !== "admin") {

          showAuthMessage(
            "ERROR: This Firebase account is not an Admin.\n\n" +
            "Detected role: " +
            (data.role || "EMPTY") +
            "\n\n" +
            "UID:\n" +
            user.uid
          );

          return;
        }


        // Wrong status
        if (status !== "active") {

          showAuthMessage(
            "ERROR: Admin account is not active.\n\n" +
            "Detected status: " +
            (data.status || "EMPTY")
          );

          return;
        }


        /*
          Everything is correct.
        */

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


        console.log(
          "ADMIN AUTHENTICATION SUCCESSFUL"
        );


        if (
          typeof onAuthorized ===
          "function"
        ) {

          onAuthorized(
            adminData
          );

        }

      } catch (error) {

        console.error(
          "ADMIN AUTH ERROR:",
          error
        );


        showAuthMessage(
          "ADMIN VERIFICATION ERROR\n\n" +
          error.message
        );

      }

    }
  );

})
.catch(error => {

  console.error(
    "AUTH PERSISTENCE INITIALIZATION ERROR:",
    error
  );


  showAuthMessage(
    "Firebase Authentication could not initialize.\n\n" +
    error.message
  );

});

}

/*
Shows authentication problems directly
on the Admin Dashboard.
*/

function showAuthMessage(message) {

console.error(
message
);

let box =
document.getElementById(
"adminAuthDebug"
);

if (!box) {

box =
  document.createElement(
    "div"
  );


box.id =
  "adminAuthDebug";


box.style.position =
  "fixed";

box.style.top =
  "15px";

box.style.left =
  "15px";

box.style.right =
  "15px";

box.style.zIndex =
  "99999";

box.style.background =
  "#fff";

box.style.border =
  "2px solid #dc2626";

box.style.borderRadius =
  "12px";

box.style.padding =
  "16px";

box.style.color =
  "#991b1b";

box.style.fontFamily =
  "Arial, sans-serif";

box.style.fontSize =
  "14px";

box.style.lineHeight =
  "1.6";

box.style.whiteSpace =
  "pre-wrap";

box.style.boxShadow =
  "0 8px 30px rgba(0,0,0,.2)";


document.body.appendChild(
  box
);

}

box.textContent =
message;

}

/*
Manual Admin Logout
*/

export async function logoutAdmin() {

try {

const {
  signOut
} = await import(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"
);


await signOut(
  auth
);


localStorage.removeItem(
  "riseEdgeAdmin"
);


localStorage.removeItem(
  "riseEdgeUser"
);


window.location.href =
  "../login.html";

} catch (error) {

console.error(
  "LOGOUT ERROR:",
  error
);


alert(
  "Logout failed:\n\n" +
  error.message
);

}

    }
