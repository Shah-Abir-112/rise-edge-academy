import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    addDoc,
    collection
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    firebaseConfig
} from "./config.js";


/* =========================================================
   FIREBASE INITIALIZATION
========================================================= */

const app =
    getApps().length
        ? getApp()
        : initializeApp(
            firebaseConfig
        );


export const auth =
    getAuth(app);


export const db =
    getFirestore(app);


export const authReady =
    setPersistence(
        auth,
        browserLocalPersistence
    );


const SESSION =
    "riseEdgeUser";


/* =========================================================
   GET USER PROFILE
========================================================= */

async function profile(uid) {

    const snapshot =
        await getDoc(
            doc(
                db,
                "users",
                uid
            )
        );


    if (
        !snapshot.exists()
    ) {
        return null;
    }


    return snapshot.data();
}


/* =========================================================
   LOGIN ROUTING
========================================================= */

async function route() {

    const user =
        auth.currentUser;


    if (!user) {
        return;
    }


    const data =
        await profile(
            user.uid
        );


    if (!data) {

        alert(
            "Your Firebase account exists, but your academy profile was not found."
        );

        await signOut(
            auth
        );

        return;
    }


    const role =
        String(
            data.role || ""
        )
            .trim()
            .toLowerCase();


    const status =
        String(
            data.status ||
            "active"
        )
            .trim()
            .toLowerCase();


    /*
     * Admin can login even if
     * old status field was missing.
     */

    if (
        role !== "admin" &&
        status !== "active"
    ) {

        alert(
            `Account status: ${
                data.status ||
                "pending"
            }. Please contact admin.`
        );


        await signOut(
            auth
        );


        return;
    }


    /*
     * Save session
     */

    localStorage.setItem(
        SESSION,
        JSON.stringify(
            {
                uid:
                    user.uid,

                email:
                    user.email ||
                    "",

                ...(data || {}),

                role
            }
        )
    );


    /*
     * Route according to role
     */

    if (
        role === "admin"
    ) {

        location.href =
            "admin/index.html";

        return;
    }


    if (
        role === "teacher"
    ) {

        location.href =
            "teacher/index.html";

        return;
    }


    if (
        role === "student"
    ) {

        location.href =
            "student/index.html";

        return;
    }


    alert(
        "Your account role is not configured correctly. Please contact admin."
    );


    await signOut(
        auth
    );
}


/* =========================================================
   LOGIN FORM
========================================================= */

const loginForm =
    document.getElementById(
        "loginForm"
    );


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const button =
                loginForm.querySelector(
                    "button"
                );


            if (button) {
                button.disabled =
                    true;
            }


            try {

                await authReady;


                const email =
                    document
                        .getElementById(
                            "email"
                        )
                        .value
                        .trim();


                const password =
                    document
                        .getElementById(
                            "password"
                        )
                        .value;


                if (!email) {

                    throw new Error(
                        "Please enter your email."
                    );
                }


                if (!password) {

                    throw new Error(
                        "Please enter your password."
                    );
                }


                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


                await route();


            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                alert(
                    String(
                        error.message ||
                        error
                    ).replace(
                        "Firebase: ",
                        ""
                    )
                );

            } finally {

                if (button) {
                    button.disabled =
                        false;
                }
            }
        }
    );
}


/* =========================================================
   REGISTER FORM
========================================================= */

const registerForm =
    document.getElementById(
        "registerForm"
    );


if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const button =
                registerForm.querySelector(
                    "button"
                );


            if (button) {
                button.disabled =
                    true;
            }


            try {

                await authReady;


                /*
                 * Basic fields
                 */

                const name =
                    document
                        .getElementById(
                            "name"
                        )
                        .value
                        .trim();


                const email =
                    document
                        .getElementById(
                            "email"
                        )
                        .value
                        .trim()
                        .toLowerCase();


                const password =
                    document
                        .getElementById(
                            "password"
                        )
                        .value;


                const role =
                    document
                        .getElementById(
                            "role"
                        )
                        .value
                        .trim()
                        .toLowerCase();


                /*
                 * Validation
                 */

                if (!name) {

                    throw new Error(
                        "Please enter your full name."
                    );
                }


                if (!email) {

                    throw new Error(
                        "Please enter your email."
                    );
                }


                if (!password) {

                    throw new Error(
                        "Please enter a password."
                    );
                }


                if (
                    role !== "student" &&
                    role !== "teacher"
                ) {

                    throw new Error(
                        "Please select Student or Teacher."
                    );
                }


                /*
                 * CREATE FIREBASE AUTH USER
                 */

                const credential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const uid =
                    credential.user.uid;


                /*
                 * CREATE USER PROFILE
                 */

                const userData = {

                    uid,

                    name,

                    email,

                    role,

                    status: "pending",

                    accountStatus:
                        "pending",

                    admissionStatus:
                        "pending",

                    applicationStatus:
                        "pending",

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp(),

                    /*
                     * Basic profile fields
                     * are intentionally empty.
                     *
                     * User can complete them
                     * later from Profile.
                     */

                    phone: "",

                    profilePicture: "",

                    dateOfBirth: "",

                    gender: "",

                    address: "",

                    additionalInformation: ""

                };


                await setDoc(
                    doc(
                        db,
                        "users",
                        uid
                    ),
                    userData
                );


                /*
                 * CREATE ADMISSION RECORD
                 *
                 * This is the important part.
                 *
                 * Admin Admissions now has
                 * a dedicated record too.
                 */

                await addDoc(
                    collection(
                        db,
                        "admissions"
                    ),
                    {

                        uid,

                        userUid:
                            uid,

                        email,

                        applicantName:
                            name,

                        role,

                        status:
                            "pending",

                        applicationStatus:
                            "pending",

                        admissionStatus:
                            "pending",

                        createdAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp(),

                        /*
                         * Keep empty fields
                         * ready for later profile
                         * completion.
                         */

                        phone: "",

                        dateOfBirth: "",

                        gender: "",

                        address: "",

                        desiredClass: "",

                        desiredSection: "",

                        guardianName: "",

                        guardianPhone: "",

                        qualification: "",

                        experience: "",

                        specialization: "",

                        adminNote: ""
                    }
                );


                alert(
                    "Account created successfully. Your application is now pending admin approval."
                );


                await signOut(
                    auth
                );


                location.href =
                    "login.html";


            } catch (error) {

                console.error(
                    "Registration error:",
                    error
                );


                alert(
                    String(
                        error.message ||
                        error
                    ).replace(
                        "Firebase: ",
                        ""
                    )
                );


            } finally {

                if (button) {
                    button.disabled =
                        false;
                }
            }
        }
    );
}


/* =========================================================
   SESSION
========================================================= */

export function getSession() {

    try {

        return JSON.parse(
            localStorage.getItem(
                SESSION
            ) || "null"
        );

    } catch {

        return null;
    }
}


/* =========================================================
   LOGOUT
========================================================= */

export async function logout() {

    localStorage.removeItem(
        SESSION
    );


    await signOut(
        auth
    );


    location.href =
        "../login.html";
}


/* =========================================================
   EXPORT AUTH STATE
========================================================= */

export {
    onAuthStateChanged
};
