import {
    console.log("🔥 STUDENTS.JS STARTED");

console.log("🔥 DB:", db);
console.log("🔥 AUTH:", auth);
    collection,
    onSnapshot,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    db,
    auth
} from "./firebase-config.js";


// =====================================================
// DOM
// =====================================================

const $ = (id) => document.getElementById(id);


// =====================================================
// GLOBAL
// =====================================================

let allStudents = [];
let unsubscribeStudents = null;
let loadingTimer = null;


// =====================================================
// HELPERS
// =====================================================

function normalize(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatDate(value) {

    if (!value) {
        return "—";
    }

    try {

        let date;

        if (typeof value.toDate === "function") {
            date = value.toDate();
        } else {
            date = new Date(value);
        }

        if (isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

    } catch {
        return "—";
    }
}


function getClass(student) {
    return (
        student.class ||
        student.className ||
        student.desiredClass ||
        "—"
    );
}


function getSection(student) {
    return (
        student.section ||
        student.desiredSection ||
        "—"
    );
}


function getStatus(student) {
    return normalize(student.status || "active");
}


// =====================================================
// UI
// =====================================================

function showLoading() {

    const body = $("studentsTableBody");

    if (!body) {
        return;
    }

    body.innerHTML = `
        <tr>
            <td colspan="8">
                <div class="loading">
                    Loading students...
                </div>
            </td>
        </tr>
    `;
}


function showError(message) {

    const body = $("studentsTableBody");

    if (!body) {
        return;
    }

    body.innerHTML = `
        <tr>
            <td colspan="8">
                <div class="error-state">
                    ${escapeHTML(message)}
                </div>
            </td>
        </tr>
    `;
}


function clearLoadingTimer() {

    if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = null;
    }

}


// =====================================================
// LOAD STUDENTS
// =====================================================

function loadStudents() {

    console.log("================================");
    console.log("STUDENT MANAGEMENT");
    console.log("Starting Firebase listener...");
    console.log("Collection: users");
    console.log("================================");


    showLoading();


    // If Firebase does not answer within 10 seconds,
    // don't leave the page stuck forever.

    loadingTimer = setTimeout(() => {

        console.error(
            "Firebase did not return a snapshot within 10 seconds."
        );

        showError(
            "Firebase is not responding. Check internet connection, Firestore, Firebase configuration and browser console."
        );

    }, 10000);


    try {

        const usersRef = collection(
            db,
            "users"
        );


        console.log(
            "users collection reference created."
        );


        unsubscribeStudents = onSnapshot(

            usersRef,

            (snapshot) => {

                clearLoadingTimer();


                console.log(
                    "FIREBASE SNAPSHOT RECEIVED"
                );

                console.log(
                    "Total users:",
                    snapshot.size
                );


                allStudents = [];


                snapshot.forEach((userDoc) => {

                    const data =
                        userDoc.data();


                    console.log(
                        "USER DOCUMENT:",
                        userDoc.id,
                        data
                    );


                    if (
                        normalize(data.role) === "student"
                    ) {

                        allStudents.push({

                            uid: userDoc.id,

                            ...data

                        });

                    }

                });


                console.log(
                    "TOTAL STUDENTS:",
                    allStudents.length
                );


                populateClassFilter();

                renderStudents();

            },

            (error) => {

                clearLoadingTimer();


                console.error(
                    "FIREBASE FIRESTORE ERROR:"
                );

                console.error(error);


                showError(
                    `Firebase Error: ${
                        error.message ||
                        "Unknown Firestore error"
                    }`
                );

            }

        );

    } catch (error) {

        clearLoadingTimer();


        console.error(
            "LOAD STUDENTS EXCEPTION:",
            error
        );


        showError(
            `JavaScript/Firebase Error: ${
                error.message ||
                "Unknown error"
            }`
        );

    }

}


// =====================================================
// CLASS FILTER
// =====================================================

function populateClassFilter() {

    const filter = $("classFilter");

    if (!filter) {
        return;
    }


    const currentValue =
        filter.value;


    const classes = new Set();


    allStudents.forEach((student) => {

        const className =
            getClass(student);


        if (
            className &&
            className !== "—"
        ) {

            classes.add(
                String(className)
            );

        }

    });


    filter.innerHTML = `
        <option value="all">
            All Classes
        </option>
    `;


    Array.from(classes)
        .sort((a, b) =>
            a.localeCompare(
                b,
                undefined,
                { numeric: true }
            )
        )
        .forEach((className) => {

            const option =
                document.createElement("option");

            option.value =
                className;

            option.textContent =
                `Class ${className}`;

            filter.appendChild(option);

        });


    if (
        Array.from(filter.options)
            .some(
                option =>
                    option.value === currentValue
            )
    ) {

        filter.value =
            currentValue;

    }

}


// =====================================================
// FILTER
// =====================================================

function getFilteredStudents() {

    const search =
        normalize(
            $("studentSearch")?.value
        );


    const status =
        normalize(
            $("statusFilter")?.value || "all"
        );


    const selectedClass =
        $("classFilter")?.value || "all";


    return allStudents.filter((student) => {

        if (search) {

            const text =
                normalize([
                    student.name,
                    student.uid,
                    student.studentId,
                    student.phone,
                    student.email,
                    student.fatherName,
                    student.motherName,
                    student.guardianName,
                    getClass(student),
                    getSection(student)
                ].join(" "));


            if (!text.includes(search)) {
                return false;
            }

        }


        const studentStatus =
            getStatus(student);


        if (
            status !== "all" &&
            studentStatus !== status
        ) {

            return false;

        }


        const studentClass =
            String(getClass(student));


        if (
            selectedClass !== "all" &&
            studentClass !== selectedClass
        ) {

            return false;

        }


        return true;

    });

}


// =====================================================
// RENDER
// =====================================================

function renderStudents() {

    const body =
        $("studentsTableBody");


    const count =
        $("studentCount");


    if (!body) {
        return;
    }


    const students =
        getFilteredStudents();


    if (count) {
        count.textContent =
            students.length;
    }


    if (students.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        ${
                            allStudents.length === 0
                                ? "No student users found."
                                : "No students match your search."
                        }
                    </div>
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        students.map((student) => {

            const name =
                student.name ||
                "Unnamed Student";


            const uid =
                student.uid ||
                "—";


            const studentId =
                student.studentId ||
                uid;


            const className =
                getClass(student);


            const section =
                getSection(student);


            const roll =
                student.roll ||
                "—";


            const phone =
                student.phone ||
                student.guardianPhone ||
                "—";


            const status =
                getStatus(student);


            const admissionDate =
                formatDate(
                    student.admissionDate ||
                    student.createdAt
                );


            const firstLetter =
                name.charAt(0).toUpperCase();


            const avatar =
                student.profilePicture

                    ? `
                        <img
                            class="student-avatar"
                            src="${escapeHTML(
                                student.profilePicture
                            )}"
                            alt="Student"
                        >
                    `

                    : `
                        <div class="student-avatar">
                            ${escapeHTML(firstLetter)}
                        </div>
                    `;


            return `
                <tr>

                    <td>
                        <div class="student-info">

                            ${avatar}

                            <div>

                                <div class="student-name">
                                    ${escapeHTML(name)}
                                </div>

                                <div class="student-id">
                                    ${escapeHTML(studentId)}
                                </div>

                            </div>

                        </div>
                    </td>

                    <td>
                        ${escapeHTML(className)}
                    </td>

                    <td>
                        ${escapeHTML(section)}
                    </td>

                    <td>
                        ${escapeHTML(roll)}
                    </td>

                    <td>
                        ${escapeHTML(phone)}
                    </td>

                    <td>
                        <span class="
                            status-badge
                            status-${escapeHTML(status)}
                        ">
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(admissionDate)}
                    </td>

                    <td>

                        <button
                            class="action-btn view-btn"
                            data-action="view"
                            data-uid="${escapeHTML(uid)}"
                        >
                            View
                        </button>

                        <button
                            class="action-btn status-btn"
                            data-action="toggle"
                            data-uid="${escapeHTML(uid)}"
                        >
                            ${
                                status === "active"
                                    ? "Release"
                                    : "Activate"
                            }
                        </button>

                    </td>

                </tr>
            `;

        }).join("");

}


// =====================================================
// VIEW
// =====================================================

function viewStudent(uid) {

    const student =
        allStudents.find(
            item => item.uid === uid
        );


    if (!student) {

        alert("Student not found.");

        return;

    }


    alert(`
Student Details

Name: ${student.name || "—"}

Student ID: ${student.studentId || "—"}

UID: ${student.uid || "—"}

Class: ${getClass(student)}

Section: ${getSection(student)}

Roll: ${student.roll || "—"}

Phone: ${student.phone || "—"}

Email: ${student.email || "—"}

Father: ${student.fatherName || "—"}

Mother: ${student.motherName || "—"}

Guardian: ${student.guardianName || "—"}

Guardian Phone: ${student.guardianPhone || "—"}

Address: ${student.address || "—"}

Status: ${student.status || "—"}
    `);

}


// =====================================================
// STATUS
// =====================================================

async function toggleStatus(uid) {

    const student =
        allStudents.find(
            item => item.uid === uid
        );


    if (!student) {

        alert("Student not found.");

        return;

    }


    const currentStatus =
        getStatus(student);


    const newStatus =
        currentStatus === "active"
            ? "released"
            : "active";


    if (
        !confirm(
            `Change ${student.name || "this student"} status to ${newStatus}?`
        )
    ) {

        return;

    }


    try {

        await updateDoc(
            doc(db, "users", uid),
            {
                status: newStatus,
                updatedAt: new Date()
            }
        );


    } catch (error) {

        console.error(
            "Status update error:",
            error
        );


        alert(
            `Failed: ${error.message}`
        );

    }

}


// =====================================================
// EVENTS
// =====================================================

function setupEvents() {

    $("studentSearch")?.addEventListener(
        "input",
        renderStudents
    );


    $("statusFilter")?.addEventListener(
        "change",
        renderStudents
    );


    $("classFilter")?.addEventListener(
        "change",
        renderStudents
    );


    $("studentsTableBody")?.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "button[data-action]"
                );


            if (!button) {
                return;
            }


            const action =
                button.dataset.action;


            const uid =
                button.dataset.uid;


            if (action === "view") {

                viewStudent(uid);

            }


            if (action === "toggle") {

                toggleStatus(uid);

            }

        }
    );

}


// =====================================================
// START
// =====================================================

console.log(
    "Rise Edge Academy Students JS loaded."
);


onAuthStateChanged(
    auth,
    (user) => {

        console.log(
            "Auth state:",
            user ? user.uid : "NO USER"
        );


        if (!user) {

            showError(
                "You are not logged in."
            );

            return;

        }


        setupEvents();

        loadStudents();

    }
);
