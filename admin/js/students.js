import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    db,
    auth
} from "./firebase-config.js";


/* =====================================================
   STATE
===================================================== */

let allStudents = [];

let loadingTimer = null;

let unsubscribeStudents = null;

let repairingStudentIds = false;


/* =====================================================
   DOM HELPER
===================================================== */

const $ = (id) =>
    document.getElementById(id);


/* =====================================================
   HELPERS
===================================================== */

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


        if (
            value &&
            typeof value.toDate === "function"
        ) {

            date = value.toDate();

        } else {

            date = new Date(value);

        }


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "—";

        }


        return date.toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    } catch {

        return "—";

    }

}


/* =====================================================
   DATA HELPERS
===================================================== */

function getClass(student) {

    return (
        student.className ||
        student.class ||
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


function getRoll(student) {

    return (
        student.roll ||
        "—"
    );

}


function getPhone(student) {

    return (
        student.phone ||
        student.studentPhone ||
        student.guardianPhone ||
        "—"
    );

}


function getStatus(student) {

    return normalize(
        student.status || "active"
    );

}


function extractStudentIdNumber(value) {

    const match =
        String(value ?? "")
            .trim()
            .match(/(?:REA[-\s]*)?(\d+)/i);

    if (!match) {
        return null;
    }

    const number = Number(match[1]);

    return Number.isInteger(number) && number >= 1001
        ? number
        : null;
}


function canonicalStudentId(value) {

    const number = extractStudentIdNumber(value);

    return number
        ? `REA-${number}`
        : "Not Assigned";

}


function getStudentId(student) {

    return canonicalStudentId(
        student.studentId
    );

}


/* =====================================================
   LOADING
===================================================== */

function showLoading() {

    const body =
        $("studentsTableBody");


    if (!body) {
        return;
    }


    body.innerHTML = `

        <tr>

            <td colspan="9">

                <div class="loading-state">

                    <div class="loader"></div>

                    <h3>
                        Loading students...
                    </h3>

                    <p>
                        Connecting to Firebase.
                    </p>

                </div>

            </td>

        </tr>

    `;

}


function clearLoadingTimer() {

    if (loadingTimer) {

        clearTimeout(
            loadingTimer
        );

        loadingTimer = null;

    }

}


function showError(message) {

    const body =
        $("studentsTableBody");


    if (!body) {
        return;
    }


    body.innerHTML = `

        <tr>

            <td colspan="9">

                <div class="error-state">

                    <h3>
                        Unable to load students
                    </h3>

                    <p>
                        ${escapeHTML(message)}
                    </p>

                </div>

            </td>

        </tr>

    `;

}


/* =====================================================
   STUDENT ID SYSTEM
===================================================== */

async function generateNextStudentId(usedIds = new Set()) {

    const counterRef =
        doc(
            db,
            "counters",
            "studentId"
        );

    const observedMax =
        Math.max(
            1000,
            ...Array.from(usedIds)
                .map(id => extractStudentIdNumber(id) || 1000)
        );

    return runTransaction(
        db,
        async transaction => {

            const counterSnapshot =
                await transaction.get(counterRef);

            const storedLastId =
                counterSnapshot.exists()
                    ? Number(
                        counterSnapshot.data().lastId
                    )
                    : 1000;

            const lastId =
                Math.max(
                    1000,
                    Number.isInteger(storedLastId)
                        ? storedLastId
                        : 1000,
                    observedMax
                );

            const nextId =
                lastId + 1;

            transaction.set(
                counterRef,
                {
                    lastId: nextId,
                    updatedAt: serverTimestamp()
                },
                { merge: true }
            );

            return `REA-${nextId}`;

        }
    );
}


async function repairStudentIds(students) {

    if (repairingStudentIds || !students.length) {
        return;
    }

    const used = new Set();
    const updates = [];

    // Keep the oldest/first valid owner of an ID.
    const ordered = [...students].sort((a, b) => {
        const aTime =
            a.createdAt?.toMillis?.() ||
            new Date(a.createdAt || 0).getTime() || 0;
        const bTime =
            b.createdAt?.toMillis?.() ||
            new Date(b.createdAt || 0).getTime() || 0;
        return aTime - bTime || String(a.uid).localeCompare(String(b.uid));
    });

    for (const student of ordered) {

        const rawId =
            String(student.studentId || "").trim();

        const canonical =
            canonicalStudentId(rawId);

        if (canonical !== "Not Assigned" && !used.has(canonical)) {

            used.add(canonical);

            if (rawId !== canonical) {
                updates.push({
                    uid: student.uid,
                    studentId: canonical
                });
            }

            continue;
        }

        const nextId =
            await generateNextStudentId(used);

        used.add(nextId);

        updates.push({
            uid: student.uid,
            studentId: nextId
        });

    }

    if (!updates.length) {
        return;
    }

    repairingStudentIds = true;

    try {

        for (const item of updates) {

            await updateDoc(
                doc(db, "users", item.uid),
                {
                    studentId: item.studentId,
                    studentIdUpdatedAt: serverTimestamp()
                }
            );

        }

        console.log(
            "Student ID repair complete:",
            updates
        );

    } catch (error) {

        console.error(
            "Student ID repair failed:",
            error
        );

    } finally {
        repairingStudentIds = false;
    }
}


/* =====================================================
   LOAD STUDENTS
===================================================== */

function loadStudents() {

    console.log(
        "================================"
    );

    console.log(
        "RISE EDGE ACADEMY"
    );

    console.log(
        "STUDENT MANAGEMENT"
    );

    console.log(
        "Collection: users"
    );

    console.log(
        "Filtering role: student"
    );

    console.log(
        "================================"
    );


    showLoading();


    clearLoadingTimer();


    loadingTimer =
        setTimeout(
            () => {

                showError(
                    "Firebase did not respond within 10 seconds."
                );

            },
            10000
        );


    try {

        const usersRef =
            collection(
                db,
                "users"
            );


        if (unsubscribeStudents) {

            unsubscribeStudents();

        }


        unsubscribeStudents =
            onSnapshot(

                usersRef,

                (snapshot) => {

                    clearLoadingTimer();


                    console.log(
                        "USERS SNAPSHOT:",
                        snapshot.size
                    );


                    allStudents = [];


                    snapshot.forEach(
                        (userDoc) => {

                            const data =
                                userDoc.data();


                            console.log(
                                "USER:",
                                userDoc.id,
                                data
                            );


                            const role =
                                normalize(
                                    data.role
                                );


                            if (
                                role === "student"
                            ) {

                                allStudents.push({

                                    uid:
                                        userDoc.id,

                                    ...data

                                });

                            }

                        }
                    );


                    /*
                     * Sort by Student ID
                     */

                    allStudents.sort(
                        (a, b) => {

                            const idA =
                                parseInt(
                                    a.studentId
                                ) || 999999999;


                            const idB =
                                parseInt(
                                    b.studentId
                                ) || 999999999;


                            return idA - idB;

                        }
                    );


                    console.log(
                        "TOTAL STUDENTS:",
                        allStudents.length
                    );

                    // Repair missing, numeric, or duplicate IDs once.
                    repairStudentIds(allStudents).catch(
                        error => console.error(
                            "Student ID repair error:",
                            error
                        )
                    );

                    populateClassFilter();

                    renderStudents();

                },


                (error) => {

                    clearLoadingTimer();


                    console.error(
                        "FIRESTORE ERROR:",
                        error
                    );


                    showError(
                        error.message ||
                        "Unknown Firebase error."
                    );

                }

            );

    } catch (error) {

        clearLoadingTimer();


        console.error(
            "STUDENT LOAD ERROR:",
            error
        );


        showError(
            error.message ||
            "Unable to load students."
        );

    }

}


/* =====================================================
   CLASS FILTER
===================================================== */

function populateClassFilter() {

    const filter =
        $("classFilter");


    if (!filter) {
        return;
    }


    const previousValue =
        filter.value;


    const classes =
        new Set();


    allStudents.forEach(
        (student) => {

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

        }
    );


    filter.innerHTML = `

        <option value="all">
            All Classes
        </option>

    `;


    Array.from(classes)
        .sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    undefined,
                    {
                        numeric: true
                    }
                )
        )
        .forEach(
            (className) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    className;


                option.textContent =
                    `Class ${className}`;


                filter.appendChild(
                    option
                );

            }
        );


    if (
        Array.from(
            filter.options
        ).some(
            option =>
                option.value ===
                previousValue
        )
    ) {

        filter.value =
            previousValue;

    }

}


/* =====================================================
   FILTER
===================================================== */

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

            const searchableText =
                normalize(
                    [
                        student.name,
                        student.email,
                        student.studentId,
                        student.uid,
                        student.phone,
                        student.studentPhone,
                        student.guardianPhone,
                        student.fatherName,
                        student.motherName,
                        student.guardianName,
                        getClass(student),
                        getSection(student),
                        getRoll(student)
                    ].join(" ")
                );


            const matchesSearch =
                !search ||
                searchableText.includes(
                    search
                );


            const studentStatus =
                getStatus(student);


            const matchesStatus =
                status === "all" ||
                studentStatus === status;


            const matchesClass =
                selectedClass === "all" ||
                String(
                    getClass(student)
                ) ===
                    String(
                        selectedClass
                    );


            return (
                matchesSearch &&
                matchesStatus &&
                matchesClass
            );

        }
    );

}


/* =====================================================
   STATUS CLASS
===================================================== */

function statusClass(status) {

    if (
        status === "active"
    ) {

        return "active";

    }


    if (
        status === "pending"
    ) {

        return "pending";

    }


    if (
        status === "released"
    ) {

        return "released";

    }


    return "inactive";

}


/* =====================================================
   RENDER
===================================================== */

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
        count.textContent = students.length;
    }

    updateStudentStats();

    if (
        students.length === 0
    ) {

        body.innerHTML = `

            <tr>

                <td colspan="9">

                    <div class="empty-state">

                        <h3>
                            ${
                                allStudents.length === 0
                                    ? "No students found"
                                    : "No matching students"
                            }
                        </h3>

                        <p>
                            ${
                                allStudents.length === 0
                                    ? "There are no student users in the users collection."
                                    : "Try changing your search or filters."
                            }
                        </p>

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    body.innerHTML =
        students
            .map(
                (student) =>
                    createStudentRow(
                        student
                    )
            )
            .join("");

}




/* =====================================================
   QUICK STATS
===================================================== */

function updateStudentStats() {

    const total = allStudents.length;

    const active = allStudents.filter(
        student => getStatus(student) === "active"
    ).length;

    const pending = allStudents.filter(
        student => getStatus(student) === "pending"
    ).length;

    const ids = allStudents
        .map(student => extractStudentIdNumber(student.studentId))
        .filter(Number.isFinite);

    const latestId = ids.length ? Math.max(...ids) : null;

    const totalEl = $("totalStudentCount");
    const activeEl = $("activeStudentCount");
    const pendingEl = $("pendingStudentCount");
    const latestEl = $("latestStudentId");

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (pendingEl) pendingEl.textContent = pending;
    if (latestEl) latestEl.textContent = latestId ? `REA-${latestId}` : "—";
}

/* =====================================================
   STUDENT ROW
===================================================== */

function createStudentRow(student) {

    const name =
        student.name ||
        "Unnamed Student";


    const email =
        student.email ||
        "No email";


    const uid =
        student.uid ||
        "";


    const studentId =
        getStudentId(student);


    const className =
        getClass(student);


    const section =
        getSection(student);


    const roll =
        getRoll(student);


    const phone =
        getPhone(student);


    const status =
        getStatus(student);


    const statusText =
        status || "active";


    const admissionDate =
        formatDate(
            student.admissionDate ||
            student.createdAt
        );


    const firstLetter =
        name
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "S";


    let avatar;


    if (
        student.profilePicture
    ) {

        avatar = `

            <img
                src="${escapeHTML(
                    student.profilePicture
                )}"
                alt="Student"
                class="student-avatar"
            >

        `;

    } else {

        avatar = `

            <div class="student-avatar">

                ${escapeHTML(
                    firstLetter
                )}

            </div>

        `;

    }


    return `

        <tr>

            <!-- STUDENT -->

            <td>

                <div class="student-cell">

                    ${avatar}

                    <div>

                        <div class="student-name">
                            ${escapeHTML(name)}
                        </div>

                        <div class="student-email">
                            ${escapeHTML(email)}
                        </div>

                    </div>

                </div>

            </td>


            <!-- STUDENT ID -->

            <td>

                <span class="student-id">

                    ${escapeHTML(
                        studentId
                    )}

                </span>

            </td>


            <!-- CLASS -->

            <td>

                <span class="class-badge">

                    ${escapeHTML(
                        className
                    )}

                </span>

            </td>


            <!-- SECTION -->

            <td>

                ${escapeHTML(
                    section
                )}

            </td>


            <!-- ROLL -->

            <td>

                ${escapeHTML(
                    roll
                )}

            </td>


            <!-- PHONE -->

            <td>

                ${escapeHTML(
                    phone
                )}

            </td>


            <!-- STATUS -->

            <td>

                <span
                    class="
                        student-status
                        ${statusClass(status)}
                    "
                >

                    ${escapeHTML(
                        statusText
                    )}

                </span>

            </td>


            <!-- ADMISSION DATE -->

            <td>

                ${escapeHTML(
                    admissionDate
                )}

            </td>


            <!-- ACTION -->

            <td>

                <div class="student-actions">

                    <button
                        type="button"
                        class="
                            student-action-btn
                            view
                        "
                        data-action="view"
                        data-uid="${escapeHTML(uid)}"
                    >
                        View
                    </button>


                    <button
                        type="button"
                        class="
                            student-action-btn
                            ${
                                status === "active"
                                    ? "release"
                                    : "activate"
                            }
                        "
                        data-action="toggle"
                        data-uid="${escapeHTML(uid)}"
                    >

                        ${
                            status === "active"
                                ? "Release"
                                : "Activate"
                        }

                    </button>

                </div>

            </td>

        </tr>

    `;

}


/* =====================================================
   VIEW STUDENT
===================================================== */

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


    const modal =
        $("studentModal");


    const profile =
        $("studentModalProfile");


    const body =
        $("studentModalBody");


    if (
        !modal ||
        !profile ||
        !body
    ) {

        console.error(
            "Student modal elements missing."
        );

        return;

    }


    const name =
        student.name ||
        "Unnamed Student";


    const studentId =
        getStudentId(student);


    const status =
        getStatus(student);


    const firstLetter =
        name
            .charAt(0)
            .toUpperCase() ||
        "S";


    const avatar =
        student.profilePicture

            ? `

                <img
                    src="${escapeHTML(
                        student.profilePicture
                    )}"
                    alt="Student"
                    class="modal-profile-image"
                >

            `

            : `

                <div class="modal-profile-image">

                    ${escapeHTML(
                        firstLetter
                    )}

                </div>

            `;


    /* =================================================
       PROFILE
    ================================================= */

    profile.innerHTML = `

        ${avatar}

        <div>

            <h2 class="modal-profile-name">

                ${escapeHTML(name)}

            </h2>


            <div class="modal-profile-id">

                Student ID:
                <strong>
                    ${escapeHTML(studentId)}
                </strong>

            </div>

        </div>

    `;


    /* =================================================
       BODY
    ================================================= */

    body.innerHTML = `

        <!-- ACADEMIC -->

        <section class="student-detail-section">

            <h3>
                Academic Information
            </h3>


            <div class="student-detail-grid">

                ${detailItem(
                    "Student ID",
                    studentId
                )}

                ${detailItem(
                    "Class",
                    getClass(student)
                )}

                ${detailItem(
                    "Section",
                    getSection(student)
                )}

                ${detailItem(
                    "Roll",
                    getRoll(student)
                )}

                ${detailItem(
                    "Academic Session",
                    student.academicSession ||
                    "—"
                )}

                ${detailItem(
                    "Status",
                    status || "active",
                    false,
                    true
                )}

            </div>

        </section>


        <!-- PERSONAL -->

        <section class="student-detail-section">

            <h3>
                Personal Information
            </h3>


            <div class="student-detail-grid">

                ${detailItem(
                    "Full Name",
                    name
                )}

                ${detailItem(
                    "Date of Birth",
                    student.dateOfBirth ||
                    student.dob ||
                    "—"
                )}

                ${detailItem(
                    "Email",
                    student.email ||
                    "—"
                )}

                ${detailItem(
                    "Phone",
                    getPhone(student)
                )}

            </div>

        </section>


        <!-- FAMILY -->

        <section class="student-detail-section">

            <h3>
                Family / Guardian
            </h3>


            <div class="student-detail-grid">

                ${detailItem(
                    "Father",
                    student.fatherName ||
                    "—"
                )}

                ${detailItem(
                    "Mother",
                    student.motherName ||
                    "—"
                )}

                ${detailItem(
                    "Guardian",
                    student.guardianName ||
                    "—"
                )}

                ${detailItem(
                    "Guardian Phone",
                    student.guardianPhone ||
                    "—"
                )}

            </div>

        </section>


        <!-- ADDRESS -->

        <section class="student-detail-section">

            <h3>
                Address
            </h3>


            <div class="student-detail-grid">

                ${detailItem(
                    "Address",
                    student.address ||
                    "—",
                    true
                )}

            </div>

        </section>


        <!-- ACCOUNT -->

        <section class="student-detail-section">

            <h3>
                Account Information
            </h3>


            <div class="student-detail-grid">

                ${detailItem(
                    "Firebase UID",
                    student.uid ||
                    "—",
                    true
                )}

                ${detailItem(
                    "Fee Status",
                    student.feeStatus ||
                    "—"
                )}

                ${detailItem(
                    "Admission Date",
                    formatDate(
                        student.admissionDate
                    )
                )}

                ${detailItem(
                    "Created",
                    formatDate(
                        student.createdAt
                    )
                )}

            </div>

        </section>

    `;


    modal.classList.add(
        "active"
    );


    document.body.style.overflow =
        "hidden";

}


/* =====================================================
   DETAIL ITEM
===================================================== */

function detailItem(
    label,
    value,
    full = false,
    isStatus = false
) {

    const safeValue =
        escapeHTML(
            String(
                value ?? "—"
            )
        );


    if (isStatus) {

        const status =
            normalize(value);


        return `

            <div
                class="
                    student-detail-item
                    ${full ? "full" : ""}
                "
            >

                <span class="student-detail-label">

                    ${escapeHTML(label)}

                </span>


                <div>

                    <span
                        class="
                            modal-status
                            ${statusClass(status)}
                        "
                    >

                        ${safeValue}

                    </span>

                </div>

            </div>

        `;

    }


    return `

        <div
            class="
                student-detail-item
                ${full ? "full" : ""}
            "
        >

            <span class="student-detail-label">

                ${escapeHTML(label)}

            </span>


            <div class="student-detail-value">

                ${safeValue}

            </div>

        </div>

    `;

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeStudentModal() {

    const modal =
        $("studentModal");


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "active"
    );


    document.body.style.overflow =
        "";

}


/* =====================================================
   TOGGLE STATUS
===================================================== */

async function toggleStatus(uid) {

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
        getStatus(student);


    const newStatus =
        currentStatus === "active"
            ? "released"
            : "active";


    const name =
        student.name ||
        "this student";


    const confirmed =
        confirm(
            `Change ${name}'s status to ${newStatus}?`
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

                status:
                    newStatus,

                updatedAt:
                    new Date()

            }
        );


    } catch (error) {

        console.error(
            "STATUS UPDATE ERROR:",
            error
        );


        alert(
            `Failed to update status.\n\n${
                error.message
            }`
        );

    }

}


/* =====================================================
   EVENTS
===================================================== */

function setupEvents() {

    $("studentSearch")
        ?.addEventListener(
            "input",
            renderStudents
        );


    $("statusFilter")
        ?.addEventListener(
            "change",
            renderStudents
        );


    $("classFilter")
        ?.addEventListener(
            "change",
            renderStudents
        );


    $("studentsTableBody")
        ?.addEventListener(
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


                if (!uid) {
                    return;
                }


                if (
                    action === "view"
                ) {

                    viewStudent(uid);

                }


                if (
                    action === "toggle"
                ) {

                    toggleStatus(uid);

                }

            }
        );


    $("closeStudentModal")
        ?.addEventListener(
            "click",
            closeStudentModal
        );


    $("closeStudentModalFooter")
        ?.addEventListener(
            "click",
            closeStudentModal
        );


    $("studentModal")
        ?.addEventListener(
            "click",
            (event) => {

                if (
                    event.target.id ===
                    "studentModal"
                ) {

                    closeStudentModal();

                }

            }
        );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape"
            ) {

                closeStudentModal();

            }

        }
    );

}


/* =====================================================
   START
===================================================== */

console.log(
    "Rise Edge Academy Student Management loaded."
);


setupEvents();


onAuthStateChanged(
    auth,
    (user) => {

        console.log(
            "AUTH:",
            user
                ? user.uid
                : "NO USER"
        );


        if (!user) {

            showError(
                "You are not logged in."
            );

            return;

        }


        loadStudents();

    }
);
