import {
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    db
} from "../../js/firebase-config.js";


let allStudents = [];


/* =========================
   DOM
========================= */

const tableBody =
    document.getElementById(
        "studentsTableBody"
    );

const searchInput =
    document.getElementById(
        "studentSearch"
    );

const statusFilter =
    document.getElementById(
        "statusFilter"
    );

const modal =
    document.getElementById(
        "studentModal"
    );

const modalDetails =
    document.getElementById(
        "studentDetails"
    );

const closeModal =
    document.getElementById(
        "closeStudentModal"
    );


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================
   LOAD STUDENTS
========================= */

function listenToStudents() {

    const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student")
    );


    onSnapshot(
        studentsQuery,

        (snapshot) => {

            allStudents = [];

            snapshot.forEach((docSnap) => {

                allStudents.push({
                    uid: docSnap.id,
                    ...docSnap.data()
                });

            });


            updateStatistics();

            renderStudents();

        },

        (error) => {

            console.error(
                "Students error:",
                error
            );

            if (tableBody) {

                tableBody.innerHTML = `
                    <tr>
                        <td
                            colspan="7"
                            class="empty-table"
                        >
                            Unable to load students.
                        </td>
                    </tr>
                `;

            }

        }
    );
}


/* =========================
   STATISTICS
========================= */

function updateStatistics() {

    const total =
        allStudents.length;

    const active =
        allStudents.filter(
            student =>
                String(
                    student.status || ""
                ).toLowerCase() === "active"
        ).length;

    const released =
        allStudents.filter(
            student =>
                String(
                    student.status || ""
                ).toLowerCase() === "released"
        ).length;


    setText(
        "studentTotal",
        total
    );

    setText(
        "studentActive",
        active
    );

    setText(
        "studentReleased",
        released
    );
}


/* =========================
   SET TEXT
========================= */

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


/* =========================
   FILTER STUDENTS
========================= */

function getFilteredStudents() {

    const search =
        String(
            searchInput?.value || ""
        )
        .trim()
        .toLowerCase();


    const status =
        String(
            statusFilter?.value || "all"
        )
        .toLowerCase();


    return allStudents.filter(
        (student) => {

            const name =
                String(
                    student.name || ""
                ).toLowerCase();

            const email =
                String(
                    student.email || ""
                ).toLowerCase();

            const studentId =
                String(
                    student.studentId || ""
                ).toLowerCase();


            const studentStatus =
                String(
                    student.status || ""
                ).toLowerCase();


            const matchesSearch =
                !search ||
                name.includes(search) ||
                email.includes(search) ||
                studentId.includes(search);


            const matchesStatus =
                status === "all" ||
                studentStatus === status;


            return (
                matchesSearch &&
                matchesStatus
            );

        }
    );
}


/* =========================
   RENDER TABLE
========================= */

function renderStudents() {

    if (!tableBody) {
        return;
    }


    const students =
        getFilteredStudents();


    if (students.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-table"
                >
                    No students found.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML =
        students.map(
            (student) => {

                const name =
                    escapeHTML(
                        student.name ||
                        "Unnamed Student"
                    );

                const email =
                    escapeHTML(
                        student.email ||
                        "—"
                    );

                const studentId =
                    escapeHTML(
                        student.studentId ||
                        "—"
                    );

                const className =
                    escapeHTML(
                        student.className ||
                        "—"
                    );

                const section =
                    escapeHTML(
                        student.section ||
                        "—"
                    );

                const status =
                    String(
                        student.status ||
                        "unknown"
                    ).toLowerCase();


                let statusClass =
                    "status-pending";


                if (status === "active") {
                    statusClass =
                        "status-active";
                }

                if (status === "released") {
                    statusClass =
                        "status-released";
                }


                const statusText =
                    status.charAt(0)
                        .toUpperCase() +
                    status.slice(1);


                return `
                    <tr>

                        <td>
                            <strong>
                                ${name}
                            </strong>
                        </td>

                        <td>
                            ${email}
                        </td>

                        <td>
                            ${studentId}
                        </td>

                        <td>
                            ${className}
                        </td>

                        <td>
                            ${section}
                        </td>

                        <td>
                            <span
                                class="status-badge ${statusClass}"
                            >
                                ${statusText}
                            </span>
                        </td>

                        <td>
                            <button
                                class="view-btn"
                                data-uid="${escapeHTML(student.uid)}"
                            >
                                View
                            </button>
                        </td>

                    </tr>
                `;

            }
        ).join("");


    /* View buttons */

    const viewButtons =
        document.querySelectorAll(
            ".view-btn"
        );


    viewButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const uid =
                        button.dataset.uid;

                    openStudentDetails(uid);

                }
            );

        }
    );
}


/* =========================
   STUDENT DETAILS
========================= */

function openStudentDetails(uid) {

    const student =
        allStudents.find(
            item => item.uid === uid
        );


    if (!student) {
        return;
    }


    const name =
        escapeHTML(
            student.name ||
            "Unnamed Student"
        );

    const email =
        escapeHTML(
            student.email ||
            "—"
        );

    const studentId =
        escapeHTML(
            student.studentId ||
            "—"
        );

    const className =
        escapeHTML(
            student.className ||
            "—"
        );

    const section =
        escapeHTML(
            student.section ||
            "—"
        );

    const status =
        escapeHTML(
            student.status ||
            "—"
        );


    modalDetails.innerHTML = `

        <div style="
            display:flex;
            flex-direction:column;
            gap:0;
        ">

            <div class="profile-row">
                <span>Name</span>
                <strong>${name}</strong>
            </div>

            <div class="profile-row">
                <span>Email</span>
                <strong>${email}</strong>
            </div>

            <div class="profile-row">
                <span>Student ID</span>
                <strong>${studentId}</strong>
            </div>

            <div class="profile-row">
                <span>Class</span>
                <strong>${className}</strong>
            </div>

            <div class="profile-row">
                <span>Section</span>
                <strong>${section}</strong>
            </div>

            <div class="profile-row">
                <span>Status</span>
                <strong>${status}</strong>
            </div>

        </div>
    `;


    modal.style.display = "flex";
}


/* =========================
   CLOSE MODAL
========================= */

if (closeModal) {

    closeModal.addEventListener(
        "click",
        () => {

            modal.style.display =
                "none";

        }
    );

}


/* Close by clicking outside */

if (modal) {

    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modal
            ) {

                modal.style.display =
                    "none";

            }

        }
    );

}


/* =========================
   SEARCH
========================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        renderStudents
    );

}


/* =========================
   STATUS FILTER
========================= */

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        renderStudents
    );

}


/* =========================
   START
========================= */

listenToStudents();
