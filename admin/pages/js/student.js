import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    auth,
    db
} from "../../js/firebase-config.js";


const tableBody =
    document.getElementById("studentsTableBody");

const searchInput =
    document.getElementById("studentSearch");

const statusFilter =
    document.getElementById("statusFilter");

const classFilter =
    document.getElementById("classFilter");

const studentCount =
    document.getElementById("studentCount");


let allStudents = [];


/* ================================
   AUTH CHECK
================================ */

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "../../login.html";

        return;
    }

    await loadStudents();

});


/* ================================
   LOAD STUDENTS
================================ */

async function loadStudents() {

    try {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="loading">
                        Loading students...
                    </div>
                </td>
            </tr>
        `;


        const studentsQuery = query(
            collection(db, "students"),
            orderBy("createdAt", "desc")
        );


        const snapshot =
            await getDocs(studentsQuery);


        allStudents = [];


        snapshot.forEach((docSnap) => {

            allStudents.push({
                id: docSnap.id,
                ...docSnap.data()
            });

        });


        /*
         * Some older student records may not have
         * createdAt. If so, they are still kept.
         */

        console.log(
            "Students loaded:",
            allStudents
        );


        populateClassFilter();

        renderStudents(allStudents);


    } catch (error) {

        console.error(
            "STUDENT LOAD ERROR:",
            error
        );


        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <strong>
                            Unable to load students.
                        </strong>
                        <br>
                        <small>
                            ${escapeHtml(error.message)}
                        </small>
                    </div>
                </td>
            </tr>
        `;

    }

}


/* ================================
   CLASS FILTER
================================ */

function populateClassFilter() {

    const classes = new Set();


    allStudents.forEach(student => {

        const className =
            student.class ||
            student.className ||
            "";


        if (className) {
            classes.add(String(className));
        }

    });


    classFilter.innerHTML = `
        <option value="all">
            All Classes
        </option>
    `;


    [...classes]
        .sort()
        .forEach(className => {

            const option =
                document.createElement("option");

            option.value = className;
            option.textContent = className;

            classFilter.appendChild(option);

        });

}


/* ================================
   FILTER STUDENTS
================================ */

function filterStudents() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const selectedStatus =
        statusFilter.value;


    const selectedClass =
        classFilter.value;


    const filtered =
        allStudents.filter(student => {

            const name =
                String(
                    student.name ||
                    student.studentName ||
                    ""
                ).toLowerCase();


            const id =
                String(
                    student.studentId ||
                    student.id ||
                    ""
                ).toLowerCase();


            const email =
                String(
                    student.email ||
                    ""
                ).toLowerCase();


            const phone =
                String(
                    student.phone ||
                    student.studentPhone ||
                    student.guardianPhone ||
                    ""
                ).toLowerCase();


            const status =
                String(
                    student.status ||
                    "active"
                )
                .trim()
                .toLowerCase();


            const className =
                String(
                    student.class ||
                    student.className ||
                    ""
                );


            const matchesSearch =
                !search ||
                name.includes(search) ||
                id.includes(search) ||
                email.includes(search) ||
                phone.includes(search);


            const matchesStatus =
                selectedStatus === "all" ||
                status === selectedStatus;


            const matchesClass =
                selectedClass === "all" ||
                className === selectedClass;


            return (
                matchesSearch &&
                matchesStatus &&
                matchesClass
            );

        });


    renderStudents(filtered);

}


/* ================================
   RENDER STUDENTS
================================ */

function renderStudents(students) {

    studentCount.textContent =
        students.length;


    if (!students.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">

                    <div class="empty-state">

                        <div style="font-size:35px;">
                            👨‍🎓
                        </div>

                        <strong>
                            No students found
                        </strong>

                        <br>

                        <small>
                            Approved students will appear here.
                        </small>

                    </div>

                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML =
        students.map(student => {

            const name =
                student.name ||
                student.studentName ||
                "Unnamed Student";


            const studentId =
                student.studentId ||
                student.id ||
                "—";


            const className =
                student.class ||
                student.className ||
                "—";


            const section =
                student.section ||
                "—";


            const roll =
                student.roll ||
                "—";


            const phone =
                student.phone ||
                student.studentPhone ||
                student.guardianPhone ||
                "—";


            const status =
                String(
                    student.status ||
                    "active"
                )
                .trim()
                .toLowerCase();


            const admissionDate =
                formatDate(
                    student.admissionDate ||
                    student.createdAt
                );


            return `

                <tr>

                    <td>

                        <div class="student-name">
                            ${escapeHtml(name)}
                        </div>

                        <div class="student-id">
                            ID: ${escapeHtml(studentId)}
                        </div>

                    </td>


                    <td>
                        ${escapeHtml(className)}
                    </td>


                    <td>
                        ${escapeHtml(section)}
                    </td>


                    <td>
                        ${escapeHtml(String(roll))}
                    </td>


                    <td>
                        ${escapeHtml(phone)}
                    </td>


                    <td>
                        ${getStatusBadge(status)}
                    </td>


                    <td>
                        ${escapeHtml(admissionDate)}
                    </td>


                    <td>

                        <button
                            class="action-btn view-btn"
                            data-id="${escapeHtml(student.id)}"
                        >
                            View
                        </button>

                        <button
                            class="action-btn edit-btn"
                            data-id="${escapeHtml(student.id)}"
                        >
                            Edit
                        </button>

                    </td>

                </tr>

            `;

        })
        .join("");


    attachActionButtons();

}


/* ================================
   ACTION BUTTONS
================================ */

function attachActionButtons() {

    document
        .querySelectorAll(".view-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const student =
                        allStudents.find(
                            item =>
                                item.id ===
                                button.dataset.id
                        );


                    if (student) {
                        showStudentDetails(student);
                    }

                }
            );

        });


    document
        .querySelectorAll(".edit-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const student =
                        allStudents.find(
                            item =>
                                item.id ===
                                button.dataset.id
                        );


                    if (student) {
                        editStudent(student);
                    }

                }
            );

        });

}


/* ================================
   VIEW STUDENT
================================ */

function showStudentDetails(student) {

    const name =
        student.name ||
        student.studentName ||
        "Student";


    alert(
        "Student Profile\n\n" +

        "Name: " +
        name +

        "\nStudent ID: " +
        (student.studentId || student.id || "—") +

        "\nClass: " +
        (student.class || student.className || "—") +

        "\nSection: " +
        (student.section || "—") +

        "\nRoll: " +
        (student.roll || "—") +

        "\nPhone: " +
        (
            student.phone ||
            student.studentPhone ||
            student.guardianPhone ||
            "—"
        ) +

        "\nStatus: " +
        (student.status || "active")
    );

}


/* ================================
   EDIT STUDENT
================================ */

function editStudent(student) {

    /*
     * Full student editor will be added in the
     * next Student Management expansion.
     */

    alert(
        "Student editor is ready to be connected.\n\n" +
        "Student: " +
        (
            student.name ||
            student.studentName ||
            "Student"
        )
    );

}


/* ================================
   STATUS BADGE
================================ */

function getStatusBadge(status) {

    let label =
        status.charAt(0).toUpperCase() +
        status.slice(1);


    let className =
        "status-active";


    if (status === "suspended") {
        className = "status-suspended";
    }

    if (status === "released") {
        className = "status-released";
    }

    if (status === "pending") {
        className = "status-pending";
    }


    return `
        <span class="status ${className}">
            ${escapeHtml(label)}
        </span>
    `;

}


/* ================================
   DATE FORMAT
================================ */

function formatDate(value) {

    if (!value) {
        return "—";
    }


    try {

        if (
            typeof value === "object" &&
            typeof value.toDate === "function"
        ) {

            return value
                .toDate()
                .toLocaleDateString();

        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(value);

        }


        return date.toLocaleDateString();

    } catch {

        return String(value);

    }

}


/* ================================
   ESCAPE HTML
================================ */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* ================================
   FILTER EVENTS
================================ */

searchInput.addEventListener(
    "input",
    filterStudents
);


statusFilter.addEventListener(
    "change",
    filterStudents
);


classFilter.addEventListener(
    "change",
    filterStudents
);
