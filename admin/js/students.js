import {
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
// DATA
// =====================================================

let allStudents = [];


// =====================================================
// NORMALIZE
// =====================================================

function normalize(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase();

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =====================================================
// DATE
// =====================================================

function formatDate(value) {

    if (!value) {
        return "—";
    }

    try {

        let date;

        if (value?.toDate) {

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


// =====================================================
// CLASS
// =====================================================

function getClass(student) {

    return (
        student.class ||
        student.className ||
        student.desiredClass ||
        "—"
    );

}


// =====================================================
// SECTION
// =====================================================

function getSection(student) {

    return (
        student.section ||
        student.desiredSection ||
        "—"
    );

}


// =====================================================
// STATUS
// =====================================================

function getStatus(student) {

    return normalize(
        student.status || "active"
    );

}


// =====================================================
// LOAD STUDENTS FROM USERS
// =====================================================

function loadStudents() {

    console.log(
        "Student Management: Loading users..."
    );


    const usersRef =
        collection(db, "users");


    onSnapshot(
        usersRef,

        (snapshot) => {

            console.log(
                "Users found:",
                snapshot.size
            );


            allStudents = [];


            snapshot.forEach((userDoc) => {

                const data =
                    userDoc.data();


                // ONLY STUDENTS

                if (
                    normalize(data.role) !== "student"
                ) {

                    return;

                }


                allStudents.push({

                    uid: userDoc.id,

                    ...data

                });

            });


            console.log(
                "Students found:",
                allStudents.length
            );


            populateClassFilter();

            renderStudents();

        },

        (error) => {

            console.error(
                "Firebase users error:",
                error
            );


            showError(
                "Unable to load students. Check Firebase rules and console."
            );

        }
    );

}


// =====================================================
// CLASS FILTER
// =====================================================

function populateClassFilter() {

    const filter =
        $("classFilter");


    if (!filter) {
        return;
    }


    const classes =
        new Set();


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
                {
                    numeric: true
                }
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


        // SEARCH

        if (search) {

            const searchableText =
                normalize(
                    [
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
                    ].join(" ")
                );


            if (
                !searchableText.includes(search)
            ) {

                return false;

            }

        }


        // STATUS

        const studentStatus =
            getStatus(student);


        if (
            status !== "all" &&
            studentStatus !== status
        ) {

            return false;

        }


        // CLASS

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

    const tableBody =
        $("studentsTableBody");


    const count =
        $("studentCount");


    if (!tableBody) {
        return;
    }


    const students =
        getFilteredStudents();


    if (count) {

        count.textContent =
            students.length;

    }


    // NO STUDENTS

    if (students.length === 0) {

        tableBody.innerHTML = `

            <tr>

                <td colspan="8">

                    <div class="empty-state">

                        No students found.

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    // STUDENTS

    tableBody.innerHTML =
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
                name
                    .charAt(0)
                    .toUpperCase();


            let avatar;


            if (student.profilePicture) {

                avatar = `
                    <img
                        class="student-avatar"
                        src="${escapeHTML(student.profilePicture)}"
                        alt="Student"
                    >
                `;

            } else {

                avatar = `
                    <div class="student-avatar">
                        ${escapeHTML(firstLetter)}
                    </div>
                `;

            }


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

UID: ${student.uid || "—"}

Student ID: ${student.studentId || "—"}

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
// TOGGLE STATUS
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


    const confirmed =
        confirm(
            `Change ${student.name || "this student"} status to ${newStatus}?`
        );


    if (!confirmed) {
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


        console.log(
            "Student status updated:",
            uid,
            newStatus
        );


    } catch (error) {

        console.error(
            "Status update failed:",
            error
        );


        alert(
            "Failed to update student status."
        );

    }

}


// =====================================================
// ERROR
// =====================================================

function showError(message) {

    const tableBody =
        $("studentsTableBody");


    if (!tableBody) {
        return;
    }


    tableBody.innerHTML = `

        <tr>

            <td colspan="8">

                <div class="error-state">

                    ${escapeHTML(message)}

                </div>

            </td>

        </tr>

    `;

}


// =====================================================
// EVENTS
// =====================================================

function setupEvents() {

    const search =
        $("studentSearch");


    const status =
        $("statusFilter");


    const classFilter =
        $("classFilter");


    const tableBody =
        $("studentsTableBody");


    if (search) {

        search.addEventListener(
            "input",
            renderStudents
        );

    }


    if (status) {

        status.addEventListener(
            "change",
            renderStudents
        );

    }


    if (classFilter) {

        classFilter.addEventListener(
            "change",
            renderStudents
        );

    }


    if (tableBody) {

        tableBody.addEventListener(
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

}


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(
    auth,
    (user) => {

        if (!user) {

            console.warn(
                "No authenticated user."
            );

            return;

        }


        console.log(
            "Authenticated:",
            user.uid
        );


        setupEvents();

        loadStudents();

    }
);
