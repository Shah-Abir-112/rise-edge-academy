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
// DOM HELPER
// =====================================================

const $ = (id) => document.getElementById(id);


// =====================================================
// GLOBAL DATA
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
// DATE FORMAT
// =====================================================

function formatDate(timestamp) {

    if (!timestamp) {
        return "—";
    }

    try {

        let date;

        if (timestamp?.toDate) {
            date = timestamp.toDate();
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            date = new Date(timestamp);
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

        return "—";
    }
}


// =====================================================
// GET STUDENT CLASS
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
// GET STUDENT SECTION
// =====================================================

function getStudentSection(student) {

    return (
        student.section ||
        student.desiredSection ||
        "—"
    );
}


// =====================================================
// GET STUDENT STATUS
// =====================================================

function getStudentStatus(student) {

    return normalize(student.status || "active");
}


// =====================================================
// LOAD STUDENTS
// =====================================================

function loadStudents() {

    console.log("Students Management: Loading students...");

    const studentsRef = collection(db, "students");

    onSnapshot(
        studentsRef,

        (snapshot) => {

            console.log(
                "Students Management: Students received:",
                snapshot.size
            );

            allStudents = [];

            snapshot.forEach((studentDoc) => {

                const data = studentDoc.data();

                allStudents.push({

                    id: studentDoc.id,

                    ...data

                });

            });


            console.log(
                "Students Management: allStudents =",
                allStudents
            );


            populateClassFilter();

            renderStudents();

        },

        (error) => {

            console.error(
                "Students Management Firebase Error:",
                error
            );

            showError(
                "Unable to load students. Check Firebase permissions and console."
            );

        }
    );
}


// =====================================================
// POPULATE CLASS FILTER
// =====================================================

function populateClassFilter() {

    const classFilter = $("classFilter");

    if (!classFilter) {
        return;
    }


    const classes = new Set();


    allStudents.forEach((student) => {

        const className = getStudentClass(student);

        if (className && className !== "—") {

            classes.add(String(className));

        }

    });


    const currentValue = classFilter.value;


    classFilter.innerHTML = `
        <option value="all">All Classes</option>
    `;


    Array.from(classes)
        .sort((a, b) =>
            a.localeCompare(b, undefined, {
                numeric: true
            })
        )
        .forEach((className) => {

            const option = document.createElement("option");

            option.value = className;

            option.textContent = `Class ${className}`;

            classFilter.appendChild(option);

        });


    if (
        Array.from(classFilter.options)
            .some(option => option.value === currentValue)
    ) {

        classFilter.value = currentValue;

    }

}


// =====================================================
// FILTER STUDENTS
// =====================================================

function getFilteredStudents() {

    const searchInput = $("studentSearch");

    const statusFilter = $("statusFilter");

    const classFilter = $("classFilter");


    const search = normalize(
        searchInput?.value
    );


    const status = normalize(
        statusFilter?.value || "all"
    );


    const selectedClass =
        classFilter?.value || "all";


    return allStudents.filter((student) => {

        // -----------------------------
        // SEARCH
        // -----------------------------

        const searchableText = normalize(
            [
                student.name,
                student.studentId,
                student.phone,
                student.email,
                student.fatherName,
                student.motherName,
                getStudentClass(student),
                getStudentSection(student)
            ].join(" ")
        );


        if (
            search &&
            !searchableText.includes(search)
        ) {

            return false;

        }


        // -----------------------------
        // STATUS
        // -----------------------------

        const studentStatus =
            getStudentStatus(student);


        if (
            status !== "all" &&
            studentStatus !== status
        ) {

            return false;

        }


        // -----------------------------
        // CLASS
        // -----------------------------

        const studentClass =
            String(getStudentClass(student));


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
// RENDER STUDENTS
// =====================================================

function renderStudents() {

    const tableBody =
        $("studentsTableBody");

    const studentCount =
        $("studentCount");


    if (!tableBody) {

        console.error(
            "studentsTableBody not found in HTML."
        );

        return;

    }


    const students =
        getFilteredStudents();


    if (studentCount) {

        studentCount.textContent =
            students.length;

    }


    // -----------------------------
    // NO STUDENTS
    // -----------------------------

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


    // -----------------------------
    // STUDENT ROWS
    // -----------------------------

    tableBody.innerHTML = students
        .map((student) => {

            const name =
                student.name || "Unnamed Student";


            const studentId =
                student.studentId ||
                student.id ||
                "—";


            const className =
                getStudentClass(student);


            const section =
                getStudentSection(student);


            const roll =
                student.roll || "—";


            const phone =
                student.phone ||
                student.guardianPhone ||
                "—";


            const status =
                getStudentStatus(student);


            const admissionDate =
                formatDate(
                    student.admissionDate
                );


            const profilePicture =
                student.profilePicture;


            const firstLetter =
                name
                    .charAt(0)
                    .toUpperCase();


            const avatar = profilePicture
                ? `
                    <img
                        class="student-avatar"
                        src="${escapeHTML(profilePicture)}"
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
                            data-id="${escapeHTML(student.id)}"
                        >
                            View
                        </button>

                        <button
                            class="action-btn status-btn"
                            data-action="toggle-status"
                            data-id="${escapeHTML(student.id)}"
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

        })
        .join("");

}


// =====================================================
// SHOW ERROR
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
// VIEW STUDENT
// =====================================================

function viewStudent(studentId) {

    const student =
        allStudents.find(
            item => item.id === studentId
        );


    if (!student) {

        alert("Student not found.");

        return;

    }


    const details = `

Student ID: ${student.studentId || student.id || "—"}

Name: ${student.name || "—"}

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

Admission Date: ${formatDate(student.admissionDate)}

    `;


    alert(details);

}


// =====================================================
// TOGGLE STUDENT STATUS
// =====================================================

async function toggleStudentStatus(studentId) {

    const student =
        allStudents.find(
            item => item.id === studentId
        );


    if (!student) {

        alert("Student not found.");

        return;

    }


    const currentStatus =
        getStudentStatus(student);


    let newStatus;


    if (currentStatus === "active") {

        newStatus = "released";

    } else {

        newStatus = "active";

    }


    const studentName =
        student.name || "this student";


    const confirmed =
        confirm(
            `Are you sure you want to change ${studentName}'s status to ${newStatus}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        await updateDoc(
            doc(db, "students", studentId),
            {
                status: newStatus,
                updatedAt: new Date()
            }
        );


        console.log(
            `Student ${studentId} status changed to ${newStatus}`
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
// TABLE ACTIONS
// =====================================================

function handleTableAction(event) {

    const button =
        event.target.closest("button[data-action]");


    if (!button) {
        return;
    }


    const action =
        button.dataset.action;


    const studentId =
        button.dataset.id;


    if (action === "view") {

        viewStudent(studentId);

    }


    if (action === "toggle-status") {

        toggleStudentStatus(studentId);

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
            "input",
            renderStudents
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
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
            handleTableAction
        );

    }

}


// =====================================================
// AUTH CHECK
// =====================================================

onAuthStateChanged(
    auth,
    (user) => {

        if (!user) {

            console.warn(
                "No authenticated admin user."
            );

            return;

        }


        console.log(
            "Authenticated user:",
            user.uid
        );


        setupEventListeners();

        loadStudents();

    }
);
