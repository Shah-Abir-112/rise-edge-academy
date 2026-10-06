import {
    collection,
    doc,
    onSnapshot,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    db
} from "./firebase-config.js";

import {
    protectAdminRoute
} from "./auth.js";


let allStudents = [];


/* =========================
   HELPERS
========================= */

const $ = (id) => document.getElementById(id);

const normalize = (value) =>
    String(value ?? "").trim().toLowerCase();

const escapeHTML = (value) =>
    String(value ?? "")
        .replace(/[&<>'"]/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        }[char]));


/* =========================
   STATUS
========================= */

function getStatusClass(status) {

    const value = normalize(status);

    if (value === "active") return "status-active";
    if (value === "suspended") return "status-suspended";
    if (value === "released") return "status-released";
    if (value === "pending") return "status-pending";

    return "status-pending";
}


/* =========================
   DATE
========================= */

function formatDate(value) {

    if (!value) return "—";

    try {

        if (typeof value.toDate === "function") {
            return value.toDate().toLocaleDateString();
        }

        const date = new Date(value);

        if (isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString();

    } catch {

        return "—";
    }
}


/* =========================
   FILTER
========================= */

function getFilteredStudents() {

    const search =
        normalize($("studentSearch")?.value);

    const status =
        normalize($("statusFilter")?.value || "all");

    const className =
        $("classFilter")?.value || "all";


    return allStudents.filter(student => {

        const searchableText = normalize(`
            ${student.name || ""}
            ${student.email || ""}
            ${student.studentId || ""}
            ${student.phone || ""}
            ${student.guardianPhone || ""}
        `);


        const matchesSearch =
            !search ||
            searchableText.includes(search);


        const matchesStatus =
            status === "all" ||
            normalize(student.status) === status;


        const matchesClass =
            className === "all" ||
            String(student.className || "") === className;


        return (
            matchesSearch &&
            matchesStatus &&
            matchesClass
        );

    });

}


/* =========================
   CLASS FILTER
========================= */

function populateClassFilter() {

    const filter = $("classFilter");

    if (!filter) return;


    const currentValue = filter.value;


    const classes = [
        ...new Set(
            allStudents
                .map(student =>
                    String(student.className || "").trim()
                )
                .filter(Boolean)
        )
    ].sort();


    filter.innerHTML = `
        <option value="all">All Classes</option>
        ${
            classes.map(className => `
                <option value="${escapeHTML(className)}">
                    ${escapeHTML(className)}
                </option>
            `).join("")
        }
    `;


    if (
        currentValue === "all" ||
        classes.includes(currentValue)
    ) {
        filter.value = currentValue;
    }

}


/* =========================
   RENDER STUDENTS
========================= */

function renderStudents() {

    const body = $("studentsTableBody");

    if (!body) return;


    const students = getFilteredStudents();


    if (students.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <h3>No students found</h3>
                        <p>
                            There are currently no students
                            matching your search or filter.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        if ($("studentCount")) {
            $("studentCount").textContent = "0";
        }

        return;
    }


    if ($("studentCount")) {
        $("studentCount").textContent =
            students.length;
    }


    body.innerHTML = students.map(student => {

        const status =
            normalize(student.status) || "pending";


        return `
            <tr>

                <td>
                    <div class="student-name">
                        ${escapeHTML(student.name || "Unnamed Student")}
                    </div>

                    <div class="student-id">
                        ID:
                        ${escapeHTML(student.studentId || "Not assigned")}
                    </div>
                </td>


                <td>
                    ${escapeHTML(student.className || "—")}
                </td>


                <td>
                    ${escapeHTML(student.section || "—")}
                </td>


                <td>
                    ${escapeHTML(student.roll || "—")}
                </td>


                <td>
                    ${escapeHTML(
                        student.phone ||
                        student.studentPhone ||
                        student.guardianPhone ||
                        "—"
                    )}
                </td>


                <td>

                    <span class="status ${getStatusClass(status)}">
                        ${escapeHTML(status)}
                    </span>

                </td>


                <td>
                    ${formatDate(
                        student.admissionDate ||
                        student.createdAt
                    )}
                </td>


                <td>

                    <button
                        class="action-btn view-btn"
                        data-action="view"
                        data-id="${escapeHTML(student.uid)}"
                    >
                        View
                    </button>


                    <button
                        class="action-btn edit-btn"
                        data-action="edit"
                        data-id="${escapeHTML(student.uid)}"
                    >
                        Edit
                    </button>

                </td>

            </tr>
        `;

    }).join("");

}


/* =========================
   VIEW STUDENT
========================= */

function viewStudent(student) {

    alert(
        `Student Details\n\n` +

        `Name: ${student.name || "—"}\n` +

        `Student ID: ${student.studentId || "—"}\n` +

        `Email: ${student.email || "—"}\n` +

        `Class: ${student.className || "—"}\n` +

        `Section: ${student.section || "—"}\n` +

        `Roll: ${student.roll || "—"}\n` +

        `Status: ${student.status || "—"}\n` +

        `Phone: ${
            student.phone ||
            student.studentPhone ||
            student.guardianPhone ||
            "—"
        }`
    );

}


/* =========================
   EDIT STUDENT
========================= */

async function editStudent(student) {

    const name =
        prompt(
            "Student Name:",
            student.name || ""
        );

    if (name === null) return;


    const className =
        prompt(
            "Class:",
            student.className || ""
        );

    if (className === null) return;


    const section =
        prompt(
            "Section:",
            student.section || ""
        );

    if (section === null) return;


    const roll =
        prompt(
            "Roll:",
            student.roll || ""
        );

    if (roll === null) return;


    try {

        await updateDoc(
            doc(db, "users", student.uid),
            {
                name: name.trim(),
                className: className.trim(),
                section: section.trim(),
                roll: roll.trim(),
                updatedAt: new Date()
            }
        );


        alert("Student updated successfully.");

    } catch (error) {

        console.error(
            "STUDENT UPDATE ERROR:",
            error
        );

        alert(
            "Student update failed.\n\n" +
            error.message
        );

    }

}


/* =========================
   TABLE ACTIONS
========================= */

$("studentsTableBody")?.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                "button[data-action]"
            );

        if (!button) return;


        const uid =
            button.dataset.id;


        const student =
            allStudents.find(
                item => item.uid === uid
            );


        if (!student) return;


        const action =
            button.dataset.action;


        if (action === "view") {
            viewStudent(student);
        }


        if (action === "edit") {
            await editStudent(student);
        }

    }
);


/* =========================
   SEARCH + FILTER
========================= */

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


/* =========================
   FIREBASE
========================= */

protectAdminRoute(() => {

    console.log(
        "STUDENT PAGE: Admin verified."
    );


    const usersRef =
        collection(db, "users");


    onSnapshot(
        usersRef,

        (snapshot) => {

            console.log(
                "USERS SNAPSHOT:",
                snapshot.size
            );


            allStudents = [];


            snapshot.forEach(
                (documentSnapshot) => {

                    const data =
                        documentSnapshot.data();


                    console.log(
                        "USER:",
                        documentSnapshot.id,
                        data
                    );


                    /*
                     * Only students
                     */

                    if (
                        normalize(data.role) ===
                        "student"
                    ) {

                        allStudents.push({

                            uid:
                                documentSnapshot.id,

                            ...data

                        });

                    }

                }
            );


            console.log(
                "TOTAL STUDENTS:",
                allStudents.length
            );


            allStudents.sort(
                (a, b) =>
                    normalize(a.name)
                        .localeCompare(
                            normalize(b.name)
                        )
            );


            populateClassFilter();

            renderStudents();

        },


        (error) => {

            console.error(
                "FIREBASE STUDENT LIST ERROR:",
                error
            );


            const body =
                $("studentsTableBody");


            if (body) {

                body.innerHTML = `
                    <tr>
                        <td colspan="8">

                            <div class="empty-state">

                                <h3>
                                    Unable to load students
                                </h3>

                                <p>
                                    ${escapeHTML(
                                        error.message
                                    )}
                                </p>

                            </div>

                        </td>
                    </tr>
                `;

            }

        }

    );

});
