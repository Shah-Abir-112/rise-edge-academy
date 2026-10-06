import {
    collection,
    onSnapshot,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    db
} from "./firebase-config.js";

import {
    protectAdminRoute
} from "./auth.js";


// =====================================================
// DOM HELPER
// =====================================================

const $ = (id) => document.getElementById(id);


// =====================================================
// GLOBAL DATA
// =====================================================

let allStudents = [];

let unsubscribeStudents = null;


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
// DATE FORMAT
// =====================================================

function formatDate(value) {

    if (!value) {
        return "—";
    }

    try {

        let date;

        if (value && typeof value.toDate === "function") {

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

    } catch (error) {

        console.error(
            "Date formatting error:",
            error
        );

        return "—";

    }

}


// =====================================================
// GET CLASS
// =====================================================

function getStudentClass(student) {

    return (
        student.class ||
        student.className ||
        student.desiredClass ||
        "—"
    );

}


// =====================================================
// GET SECTION
// =====================================================

function getStudentSection(student) {

    return (
        student.section ||
        student.desiredSection ||
        "—"
    );

}


// =====================================================
// GET STATUS
// =====================================================

function getStudentStatus(student) {

    return normalize(
        student.status || "active"
    );

}


// =====================================================
// SET LOADING
// =====================================================

function showLoading() {

    const tableBody =
        $("studentsTableBody");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = `

        <tr>

            <td colspan="8">

                <div class="loading">

                    Loading students...

                </div>

            </td>

        </tr>

    `;

}


// =====================================================
// SET ERROR
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
// LOAD STUDENTS
// =====================================================

function loadStudents() {

    console.log(
        "================================="
    );

    console.log(
        "RISE EDGE ACADEMY"
    );

    console.log(
        "Student Management starting..."
    );

    console.log(
        "Reading collection: users"
    );

    console.log(
        "================================="
    );


    showLoading();


    try {

        const usersRef =
            collection(db, "users");


        unsubscribeStudents = onSnapshot(

            usersRef,

            (snapshot) => {

                console.log(
                    "Firebase users snapshot received."
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
                        "User:",
                        userDoc.id,
                        data
                    );


                    // ONLY STUDENT USERS

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
                    "================================="
                );

                console.log(
                    "Students found:",
                    allStudents.length
                );

                console.log(
                    "Student data:",
                    allStudents
                );

                console.log(
                    "================================="
                );


                populateClassFilter();

                renderStudents();

            },

            (error) => {

                console.error(
                    "================================="
                );

                console.error(
                    "FIREBASE STUDENT ERROR"
                );

                console.error(error);

                console.error(
                    "================================="
                );


                showError(
                    "Failed to load students. Check browser console for details."
                );

            }

        );

    } catch (error) {

        console.error(
            "Student loading exception:",
            error
        );


        showError(
            "Student loading failed. Check console."
        );

    }

}


// =====================================================
// POPULATE CLASS FILTER
// =====================================================

function populateClassFilter() {

    const filter =
        $("classFilter");


    if (!filter) {

        console.warn(
            "classFilter not found."
        );

        return;

    }


    const currentValue =
        filter.value;


    const classes =
        new Set();


    allStudents.forEach((student) => {

        const className =
            getStudentClass(student);


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
// FILTER STUDENTS
// =====================================================

function getFilteredStudents() {

    const search =
        normalize(
            $("studentSearch")?.value
        );


    const status =
        normalize(
            $("statusFilter")?.value ||
            "all"
        );


    const selectedClass =
        $("classFilter")?.value ||
        "all";


    return allStudents.filter(
        (student) => {


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

                            getStudentClass(student),

                            getStudentSection(student)

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
                getStudentStatus(student);


            if (
                status !== "all" &&
                studentStatus !== status
            ) {

                return false;

            }


            // CLASS

            const studentClass =
                String(
                    getStudentClass(student)
                );


            if (
                selectedClass !== "all" &&
                studentClass !== selectedClass
            ) {

                return false;

            }


            return true;

        }
    );

}


// =====================================================
// RENDER STUDENTS
// =====================================================

function renderStudents() {

    const tableBody =
        $("studentsTableBody");


    const studentCount =
        $("studentCount");


    if (!tableBody) {

        console.error(
            "studentsTableBody not found."
        );

        return;

    }


    const students =
        getFilteredStudents();


    if (studentCount) {

        studentCount.textContent =
            students.length;

    }


    // NO STUDENTS

    if (students.length === 0) {

        tableBody.innerHTML = `

            <tr>

                <td colspan="8">

                    <div class="empty-state">

                        ${
                            allStudents.length === 0
                                ? "No student users found."
                                : "No students match your search/filter."
                        }

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    // STUDENT ROWS

    tableBody.innerHTML =
        students.map(
            (student) => {


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
                    getStudentClass(student);


                const section =
                    getStudentSection(student);


                const roll =
                    student.roll ||
                    "—";


                const phone =
                    student.phone ||
                    student.guardianPhone ||
                    "—";


                const status =
                    getStudentStatus(student);


                const admissionDate =
                    formatDate(
                        student.admissionDate ||
                        student.createdAt
                    );


                const firstLetter =
                    name
                        .charAt(0)
                        .toUpperCase();


                let avatarHTML;


                if (student.profilePicture) {

                    avatarHTML = `

                        <img
                            class="student-avatar"
                            src="${escapeHTML(
                                student.profilePicture
                            )}"
                            alt="Student"
                        >

                    `;

                } else {

                    avatarHTML = `

                        <div class="student-avatar">

                            ${escapeHTML(
                                firstLetter
                            )}

                        </div>

                    `;

                }


                return `

                    <tr>

                        <td>

                            <div class="student-info">

                                ${avatarHTML}

                                <div>

                                    <div class="student-name">

                                        ${escapeHTML(
                                            name
                                        )}

                                    </div>

                                    <div class="student-id">

                                        ${escapeHTML(
                                            studentId
                                        )}

                                    </div>

                                </div>

                            </div>

                        </td>


                        <td>

                            ${escapeHTML(
                                className
                            )}

                        </td>


                        <td>

                            ${escapeHTML(
                                section
                            )}

                        </td>


                        <td>

                            ${escapeHTML(
                                roll
                            )}

                        </td>


                        <td>

                            ${escapeHTML(
                                phone
                            )}

                        </td>


                        <td>

                            <span
                                class="
                                    status-badge
                                    status-${escapeHTML(
                                        status
                                    )}
                                "
                            >

                                ${escapeHTML(
                                    status
                                )}

                            </span>

                        </td>


                        <td>

                            ${escapeHTML(
                                admissionDate
                            )}

                        </td>


                        <td>

                            <button
                                class="action-btn view-btn"
                                data-action="view"
                                data-uid="${escapeHTML(
                                    uid
                                )}"
                            >

                                View

                            </button>


                            <button
                                class="action-btn status-btn"
                                data-action="toggle"
                                data-uid="${escapeHTML(
                                    uid
                                )}"
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

            }
        ).join("");

}


// =====================================================
// VIEW STUDENT
// =====================================================

function viewStudent(uid) {

    const student =
        allStudents.find(
            item =>
                item.uid === uid
        );


    if (!student) {

        alert(
            "Student not found."
        );

        return;

    }


    alert(`

Student Details

Name: ${student.name || "—"}

Student ID: ${student.studentId || "—"}

UID: ${student.uid || "—"}

Class: ${getStudentClass(student)}

Section: ${getStudentSection(student)}

Roll: ${student.roll || "—"}

Phone: ${student.phone || "—"}

Email: ${student.email || "—"}

Father: ${student.fatherName || "—"}

Mother: ${student.motherName || "—"}

Guardian: ${student.guardianName || "—"}

Guardian Phone: ${student.guardianPhone || "—"}

Address: ${student.address || "—"}

Academic Session: ${student.academicSession || "—"}

Status: ${student.status || "—"}

Admission Date: ${
    formatDate(
        student.admissionDate ||
        student.createdAt
    )
}

    `);

}


// =====================================================
// TOGGLE STATUS
// =====================================================

async function toggleStudentStatus(uid) {

    const student =
        allStudents.find(
            item =>
                item.uid === uid
        );


    if (!student) {

        alert(
            "Student not found."
        );

        return;

    }


    const currentStatus =
        getStudentStatus(student);


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

            doc(
                db,
                "users",
                uid
            ),

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
            "Status update error:",
            error
        );


        alert(
            "Failed to update student status."
        );

    }

}


// =====================================================
// EVENT LISTENERS
// =====================================================

function setupEventListeners() {

    const search =
        $("studentSearch");


    const statusFilter =
        $("statusFilter");


    const classFilter =
        $("classFilter");


    const tableBody =
        $("studentsTableBody");


    if (search) {

        search.addEventListener(
           
