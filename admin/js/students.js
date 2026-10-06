import {
    collection,
    doc,
    onSnapshot,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { db } from "./firebase-config.js";
import { protectAdminRoute } from "./auth.js";

let allStudents = [];
let currentStudent = null;


// ===============================
// HELPERS
// ===============================

const $ = (id) => document.getElementById(id);

const escapeHTML = (value) => {
    return String(value ?? "").replace(
        /[&<>'"]/g,
        (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        }[char])
    );
};

const normalize = (value) => {
    return String(value ?? "")
        .trim()
        .toLowerCase();
};


function formatDate(value) {

    if (!value) return "—";

    try {

        if (typeof value.toDate === "function") {
            return value.toDate().toLocaleString();
        }

        const date = new Date(value);

        if (isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString();

    } catch {

        return "—";
    }
}


function statusClass(status) {

    const value = normalize(status);

    if (
        value === "active" ||
        value === "pending" ||
        value === "suspended" ||
        value === "released"
    ) {
        return `status-${value}`;
    }

    return "status-unknown";
}


// ===============================
// FILTER STUDENTS
// ===============================

function filteredStudents() {

    const search =
        normalize($("studentSearch")?.value);

    const status =
        $("statusFilter")?.value || "all";

    const className =
        $("classFilter")?.value || "all";


    return allStudents.filter((student) => {

        const searchableText =
            normalize(`
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
            String(student.class || "") === className;


        return (
            matchesSearch &&
            matchesStatus &&
            matchesClass
        );

    });
}


// ===============================
// POPULATE CLASS FILTER
// ===============================

function populateClassFilter() {

    const classFilter =
        $("classFilter");

    if (!classFilter) return;


    const currentValue =
        classFilter.value;


    const classes = [
        ...new Set(
            allStudents
                .map(student =>
                    String(student.class || "").trim()
                )
                .filter(Boolean)
        )
    ].sort();


    classFilter.innerHTML =
        `<option value="all">All Classes</option>` +
        classes
            .map(
                value =>
                    `<option value="${escapeHTML(value)}">
                        ${escapeHTML(value)}
                    </option>`
            )
            .join("");


    if (
        classes.includes(currentValue)
    ) {
        classFilter.value =
            currentValue;
    }
}


// ===============================
// RENDER STUDENTS
// ===============================

function renderStudents() {

    const body =
        $("studentsTableBody");

    if (!body) return;


    const students =
        filteredStudents();


    const count =
        $("studentCount");

    if (count) {
        count.textContent =
            students.length;
    }


    if (!students.length) {

        body.innerHTML = `
            <tr>
                <td colspan="8">

                    <div class="empty-state">

                        <div style="font-size:40px;margin-bottom:10px;">
                            👨‍🎓
                        </div>

                        <strong>No students found</strong>

                        <p>
                            There are no students matching your search or filters.
                        </p>

                    </div>

                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        students.map(student => {

            const status =
                normalize(student.status);


            let actionButtons = `
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
            `;


            if (status !== "active") {

                actionButtons += `
                    <button
                        class="action-btn"
                        data-action="activate"
                        data-id="${escapeHTML(student.uid)}"
                    >
                        Activate
                    </button>
                `;
            }


            if (status !== "released") {

                actionButtons += `
                    <button
                        class="action-btn"
                        data-action="release"
                        data-id="${escapeHTML(student.uid)}"
                    >
                        Release
                    </button>
                `;
            }


            return `
                <tr>

                    <td>

                        <div class="student-name">
                            ${escapeHTML(
                                student.name ||
                                "Unnamed Student"
                            )}
                        </div>

                        <div class="student-id">
                            ${escapeHTML(
                                student.studentId ||
                                student.uid
                            )}
                        </div>

                    </td>


                    <td>
                        ${escapeHTML(
                            student.class || "—"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            student.section || "—"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            student.roll || "—"
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            student.phone ||
                            student.guardianPhone ||
                            "—"
                        )}
                    </td>


                    <td>

                        <span class="status ${statusClass(student.status)}">

                            ${escapeHTML(
                                student.status ||
                                "Unknown"
                            )}

                        </span>

                    </td>


                    <td>
                        ${escapeHTML(
                            formatDate(
                                student.admissionDate
                            )
                        )}
                    </td>


                    <td>

                        <div class="actions">
                            ${actionButtons}
                        </div>

                    </td>

                </tr>
            `;

        }).join("");
}


// ===============================
// STUDENT DETAILS
// ===============================

function openDetails(student, edit = false) {

    currentStudent =
        student;


    const modalTitle =
        $("modalTitle");

    const box =
        $("studentDetails");


    if (!modalTitle || !box) {
        console.error(
            "Student modal elements missing from HTML."
        );
        return;
    }


    modalTitle.textContent =
        edit
            ? "Edit Student"
            : "Student Details";


    if (edit) {

        box.innerHTML = `

            <form id="editStudentForm">

                <label>
                    Name
                    <input
                        id="editName"
                        value="${escapeHTML(student.name)}"
                        required
                    >
                </label>


                <label>
                    Student ID
                    <input
                        id="editStudentId"
                        value="${escapeHTML(student.studentId)}"
                    >
                </label>


                <label>
                    Email
                    <input
                        value="${escapeHTML(student.email)}"
                        disabled
                    >
                </label>


                <label>
                    Phone
                    <input
                        id="editPhone"
                        value="${escapeHTML(student.phone)}"
                    >
                </label>


                <label>
                    Class
                    <input
                        id="editClass"
                        value="${escapeHTML(student.class)}"
                    >
                </label>


                <label>
                    Section
                    <input
                        id="editSection"
                        value="${escapeHTML(student.section)}"
                    >
                </label>


                <label>
                    Roll
                    <input
                        id="editRoll"
                        value="${escapeHTML(student.roll)}"
                    >
                </label>


                <label>
                    Status

                    <select id="editStatus">

                        <option value="active">
                            Active
                        </option>

                        <option value="suspended">
                            Suspended
                        </option>

                        <option value="released">
                            Released
                        </option>

                    </select>

                </label>


                <div
                    class="form-actions"
                    style="grid-column:1/-1"
                >

                    <button
                        type="button"
                        class="action-btn"
                        id="cancelEdit"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="action-btn edit-btn"
                    >
                        Save Changes
                    </button>

                </div>

            </form>
        `;


        $("editStatus").value =
            normalize(student.status) ||
            "active";


        $("editStudentForm")
            .addEventListener(
                "submit",
                saveStudent
            );


        $("cancelEdit")
            .addEventListener(
                "click",
                () => openDetails(
                    currentStudent,
                    false
                )
            );

    } else {

        box.innerHTML = `

            <div class="details-grid">

                <div>
                    <span>Name</span>
                    <strong>
                        ${escapeHTML(
                            student.name || "—"
                        )}
                    </strong>
                </div>


                <div>
                    <span>Email</span>
                    <strong>
                        ${escapeHTML(
                            student.email || "—"
                        )}
                    </strong>
                </div>


                <div>
                    <span>Student ID</span>
                    <strong>
                        ${escapeHTML(
                            student.studentId ||
                            "—"
                        )}
                    </strong>
                </div>


                <div>
                    <span>Phone</span>
                    <strong>
                        ${escapeHTML(
                            student.phone || "—"
                        )}
                    </strong>
                </div>


                <div>
                    <span>Class</span>
                    <strong>
                        ${escapeHTML(
                            student.class || "—"
                        )}
                    </strong>
                </div>


                <div>
                    <span>Section</span>
                    <strong>
                        ${escapeHTML(
                            student.section || "—"
                        )}
                    </strong>
                </div>


                <div>
                    <span>Roll</span>
                    <strong>
                        ${escapeHTML(
                            student.roll || "—"
                        )}
                    </strong>
                </div>


                <div>
                    <span>Status</span>
                    <strong>
                        ${escapeHTML(
                            student.status || "—"
                        )}
                    </strong>
                </div>


                <div>
                    <span>Admission Date</span>
                    <strong>
                        ${escapeHTML(
                            formatDate(
                                student.admissionDate
                            )
                        )}
                    </strong>
                </div>


                <div>
                    <span>Academic Session</span>
                    <strong>
                        ${escapeHTML(
                            student.academicSession ||
                            "—"
                        )}
                    </strong>
                </div>

            </div>
        `;
    }


    $("studentModal")
        ?.classList
        .add("show");
}


// ===============================
// SAVE STUDENT
// ===============================

async function saveStudent(event) {

    event.preventDefault();


    if (!currentStudent) return;


    try {

        await updateDoc(
            doc(
                db,
                "students",
                currentStudent.uid
            ),
            {

                name:
                    $("editName")
                        .value
                        .trim(),

                studentId:
                    $("editStudentId")
                        .value
                        .trim(),

                phone:
                    $("editPhone")
                        .value
                        .trim(),

                class:
                    $("editClass")
                        .value
                        .trim(),

                section:
                    $("editSection")
                        .value
                        .trim(),

                roll:
                    $("editRoll")
                        .value
                        .trim(),

                status:
                    $("editStatus")
                        .value

            }
        );


        alert(
            "Student updated successfully."
        );


        $("studentModal")
            ?.classList
            .remove("show");

    } catch (error) {

        console.error(
            "Student update error:",
            error
        );

        alert(
            "Update failed: " +
            error.message
        );
    }
}


// ===============================
// CHANGE STATUS
// ===============================

async function changeStatus(
    uid,
    status
) {

    const student =
        allStudents.find(
            item => item.uid === uid
        );


    if (!student) return;


    const action =
        status === "active"
            ? "activate"
            : "release";


    if (
        !confirm(
            `Are you sure you want to ${action} ${
                student.name ||
                "this student"
            }?`
        )
    ) {
        return;
    }


    try {

        await updateDoc(
            doc(
                db,
                "students",
                uid
            ),
            {
                status
            }
        );

    } catch (error) {

        console.error(
            "Status update error:",
            error
        );


        alert(
            "Status update failed: " +
            error.message
        );
    }
}


// ===============================
// TABLE ACTIONS
// ===============================

$("studentsTableBody")
    ?.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "button[data-action]"
                );


            if (!button) return;


            const student =
                allStudents.find(
                    item =>
                        item.uid ===
                        button.dataset.id
                );


            if (!student) return;


            const action =
                button.dataset.action;


            if (action === "view") {
                openDetails(
                    student,
                    false
                );
            }


            if (action === "edit") {
                openDetails(
                    student,
                    true
                );
            }


            if (action === "activate") {
                changeStatus(
                    student.uid,
                    "active"
                );
            }


            if (action === "release") {
                changeStatus(
                    student.uid,
                    "released"
                );
            }

        }
    );


// ===============================
// FILTER EVENTS
// ===============================

[
    "studentSearch",
    "statusFilter",
    "classFilter"
].forEach(id => {

    $(id)?.addEventListener(
        "input",
        renderStudents
    );

    $(id)?.addEventListener(
        "change",
        renderStudents
    );

});


// ===============================
// MODAL CLOSE
// ===============================

$("closeStudentModal")
    ?.addEventListener(
        "click",
        () => {

            $("studentModal")
                ?.classList
                .remove("show");

        }
    );


$("studentModal")
    ?.addEventListener(
        "click",
        event => {

            if (
                event.target.id ===
                "studentModal"
            ) {

                $("studentModal")
                    .classList
                    .remove("show");

            }

        }
    );


// ===============================
// FIREBASE STUDENT LISTENER
// ===============================

protectAdminRoute(() => {

    console.log(
        "Student management: Firebase listener started."
    );


    // IMPORTANT:
    // Approved students are stored
    // inside "students" collection.
    onSnapshot(
        collection(db, "students"),

        snapshot => {

            allStudents = [];


            snapshot.forEach(
                documentSnapshot => {

                    const data =
                        documentSnapshot.data();


                    allStudents.push({

                        uid:
                            documentSnapshot.id,

                        ...data

                    });

                }
            );


            allStudents.sort(
                (a, b) =>
                    normalize(a.name)
                        .localeCompare(
                            normalize(b.name)
                        )
            );


            console.log(
                "Students loaded:",
                allStudents.length,
                allStudents
            );


            populateClassFilter();

            renderStudents();

        },


        error => {

            console.error(
                "Students listener error:",
                error
            );


            $("studentsTableBody").innerHTML = `

                <tr>

                    <td colspan="8">

                        <div class="empty-state">

                            <strong>
                                Unable to load students
                            </strong>

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
    );

});
