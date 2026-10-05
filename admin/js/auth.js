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
} from "../../js/firebase-config.js";


/**
 * Protect Admin Route
 *
 * Only authenticated users with:
 * role = admin
 * status = active
 *
 * can access the admin panel.
 */
export function protectAdminRoute(onAuthorized) {

    onAuthStateChanged(auth, async (user) => {

        // No Firebase user
        if (!user) {
            redirectToLogin();
            return;
        }

        try {

            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            // Firestore profile doesn't exist
            if (!userSnap.exists()) {

                console.error("Admin profile not found.");

                await signOut(auth);
                redirectToLogin();

                return;
            }


            const userData = userSnap.data();

            const role = String(
                userData.role || ""
            ).trim().toLowerCase();

            const status = String(
                userData.status || ""
            ).trim().toLowerCase();


            console.log("Admin Auth Check:", {
                uid: user.uid,
                email: user.email,
                role,
                status
            });


            // Role check
            if (role !== "admin") {

                console.error("Unauthorized role:", role);

                await signOut(auth);
                redirectToLogin();

                return;
            }


            // Status check
            if (status !== "active") {

                console.error("Admin account is not active.");

                await signOut(auth);
                redirectToLogin();

                return;
            }


            // Authorized Admin
            const adminData = {
                uid: user.uid,
                email: user.email || "",
                ...userData
            };


            // Save current admin locally
            localStorage.setItem(
                "riseEdgeAdmin",
                JSON.stringify(adminData)
            );


            // Send data to admin.js
            if (typeof onAuthorized === "function") {
                onAuthorized(adminData);
            }


        } catch (error) {

            console.error(
                "ADMIN AUTH ERROR:",
                error
            );

            await signOut(auth);
            redirectToLogin();
        }

    });
}


/**
 * Redirect unauthorized users
 */
function redirectToLogin() {

    window.location.href = "../login.html";
}


/**
 * Logout Admin
 */
export async function logoutAdmin() {

    try {

        await signOut(auth);

        localStorage.removeItem(
            "riseEdgeAdmin"
        );

        localStorage.removeItem(
            "riseEdgeUser"
        );

        window.location.href = "../login.html";

    } catch (error) {

        console.error(
            "LOGOUT ERROR:",
            error
        );

        alert(
            "Logout failed. Please try again."
        );
    }
}
