import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    addDoc,
    query,
    orderBy,
    serverTimestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


/* =========================================================
   RISE EDGE ACADEMY
   ADMIN ADMISSIONS
   Handles:
   1. admissions collection
   2. pending users collection
   3. student applications
   4. teacher applications
   5. approve / reject / correction
   ========================================================= */


/* -----------------------------
   GLOBAL STATE
----------------------------- */

const $ = (id) => document.getElementById(id);

let applications = [];
let selected = null;
let pendingAction = null;
let adminUser = null;


/* -----------------------------
   HELPERS
----------------------------- */

function esc(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char])
    );
}


function normalize(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}


function statusOf(value) {
    return normalize(value || "pending");
}


function roleOf(value) {
    const role = normalize(value);

    if (role === "teacher") return "teacher";
    if (role === "student") return "student";
    if (role === "admin") return "admin";

    return role;
}


function nameOf(app) {
    return (
        app.applicantName ||
        app.name ||
        app.studentName ||
        app.teacherName ||
        "Unknown Applicant"
    );
}


function classOf(app) {
    return (
        app.desiredClass ||
        app.className ||
        app.class ||
        app.course ||
        "—"
    );
}


function guardianOf(app) {
    return (
        app.guardianName ||
        app.guardian ||
        app.fatherName ||
        app.motherName ||
        "—"
    );
}


function emailOf(app) {
    return app.email || "";
}


function phoneOf(app) {
    return (
        app.guardianPhone ||
        app.phone ||
        app.studentPhone ||
        app.teacherPhone ||
        ""
    );
}


function idOf(app) {
    return (
        app.applicationId ||
        app.admissionId ||
        app.userId ||
        app.id ||
        "—"
    );
}


function formatDate(value) {

    if (!value) return "—";

    if (value?.seconds) {
        return new Date(
            value.seconds * 1000
        ).toLocaleDateString();
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString();
}


function displayStatus(status) {

    const value = statusOf(status);

    if (
        value === "new" ||
        value === "pending" ||
        value === "pending review"
    ) {
        return "Pending";
    }

    if (
        value === "correction" ||
        value === "correction required"
    ) {
        return "Correction Required";
    }

    if (value === "approved") {
        return "Approved";
    }

    if (value === "rejected") {
        return "Rejected";
    }

    return value
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}


function statusClass(status) {

    const value = statusOf(status);

    if (
        value === "pending" ||
        value === "new" ||
        value === "pending review"
    ) {
        return "pending";
    }

    if (
        value === "correction" ||
        value === "correction required"
    ) {
        return "correction";
    }

    if (value === "approved") {
        return "approved";
    }

    if (value === "rejected") {
        return "rejected";
    }

    return "default";
}


function isPending(app) {

    const status = statusOf(app.status);

    return (
        status === "pending" ||
        status === "new" ||
        status === "pending review"
    );
}


function isCorrection(app) {

    const status = statusOf(app.status);

    return (
        status === "correction" ||
        status === "correction required"
    );
}


function isApproved(app) {

    return statusOf(app.status) === "approved";
}


function isRejected(app) {

    return statusOf(app.status) === "rejected";
}


/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

async function verifyAdmin(user) {

    const snap = await getDoc(
        doc(db, "users", user.uid)
    );

    if (!snap.exists()) {
        throw new Error(
            "Admin Firestore profile not found."
        );
    }

    const data = snap.data();

    const role = roleOf(data.role);
    const status = normalize(data.status);

    if (role !== "admin") {
        throw new Error(
            "This account is not an admin account."
        );
    }

    if (status !== "active") {
        throw new Error(
            "Admin account is not active."
        );
    }

    adminUser = {
        uid: user.uid,
        email: user.email || "",
        ...data
    };

    if ($("userName")) {
        $("userName").textContent =
            data.name ||
            user.email ||
            "Admin";
    }

    if ($("userAvatar")) {
        const name =
            data.name ||
            user.email ||
            "A";

        $("userAvatar").textContent =
            name.trim().charAt(0).toUpperCase();
    }
}


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        location.href = "../../login.html";
        return;
    }

    try {

        await verifyAdmin(user);

        await loadApplications();

    } catch (error) {

        console.error(
            "Admin authentication error:",
            error
        );

        showError(
            error.message ||
            "Unable to verify admin account."
        );
    }
});


/* =========================================================
   LOAD APPLICATIONS
========================================================= */

async function loadApplications() {

    setLoading(true);

    try {

        /*
         * SOURCE 1
         * admissions collection
         */

        const admissionApplications =
            await loadAdmissionCollection();


        /*
         * SOURCE 2
         * users collection
         *
         * Registration creates:
         *
         * users/{uid}
         *
         * with:
         *
         * role = student / teacher
         * status = pending
         */

        const pendingUsers =
            await loadPendingUsers();


        /*
         * MERGE BOTH SOURCES
         */

        applications =
            mergeApplications(
                admissionApplications,
                pendingUsers
            );


        console.log(
            "ADMIN ADMISSIONS:",
            applications
        );


        populateClassFilter();

        updateStats();

        render();

        setLoading(false);

    } catch (error) {

        console.error(
            "Admission loading error:",
            error
        );

        setLoading(false);

        showError(
            error.message ||
            "Unable to load admissions."
        );
    }
}


/* =========================================================
   LOAD admissions COLLECTION
========================================================= */

async function loadAdmissionCollection() {

    try {

        let snapshot;

        /*
         * Try ordered query first.
         */

        try {

            snapshot = await getDocs(
                query(
                    collection(db, "admissions"),
                    orderBy("createdAt", "desc")
                )
            );

        } catch (error) {

            /*
             * If orderBy fails because createdAt/index/data
             * is missing, load collection normally.
             */

            console.warn(
                "Ordered admissions query failed. Using normal query.",
                error
            );

            snapshot = await getDocs(
                collection(db, "admissions")
            );
        }


        return snapshot.docs.map((document) => {

            const data = document.data();

            return {
                id: document.id,
                source: "admissions",
                ...data
            };

        });

    } catch (error) {

        console.warn(
            "Admissions collection could not be read:",
            error
        );

        /*
         * Do not kill entire Admin Admissions page.
         *
         * We can still load pending users.
         */

        return [];
    }
}


/* =========================================================
   LOAD PENDING USERS
========================================================= */

async function loadPendingUsers() {

    try {

        /*
         * IMPORTANT:
         *
         * Do NOT use:
         *
         * where("status","==","pending")
         *
         * because old documents may have:
         *
         * "Pending"
         * " pending "
         * "PENDING"
         *
         * and role may vary.
         *
         * So we read users and normalize locally.
         */

        const snapshot = await getDocs(
            collection(db, "users")
        );


        const pending = [];

        snapshot.forEach((document) => {

            const data = document.data();

            const role =
                roleOf(data.role);

            const status =
                normalize(data.status);


            /*
             * Only Student and Teacher.
             */

            if (
                role !== "student" &&
                role !== "teacher"
            ) {
                return;
            }


            /*
             * Pending accounts only.
             */

            if (
                status !== "pending" &&
                status !== "new" &&
                status !== "pending review" &&
                status !== "correction" &&
                status !== "correction required"
            ) {
                return;
            }


            pending.push({

                /*
                 * Synthetic ID
                 * for users without admission document.
                 */

                id: `user_${document.id}`,

                /*
                 * REAL Firebase user UID
                 */

                uid: document.id,

                /*
                 * Source
                 */

                source: "users",

                /*
                 * Mark account type
                 */

                applicantType: role,

                /*
                 * Keep all Firebase fields
                 */

                ...data

            });

        });


        return pending;

    } catch (error) {

        console.error(
            "Pending users could not be loaded:",
            error
        );

        throw new Error(
            "Could not read pending users from Firebase. Check Firestore Rules."
        );
    }
}


/* =========================================================
   MERGE DUPLICATES
========================================================= */

function mergeApplications(
    admissions,
    pendingUsers
) {

    const result = [];

    const usedUIDs = new Set();

    const usedEmails = new Set();


    /*
     * First add admission documents.
     */

    for (const admission of admissions) {

        const uid = String(
            admission.uid ||
            admission.userUid ||
            admission.userId ||
            admission.authUid ||
            admission.studentUid ||
            admission.teacherUid ||
            ""
        ).trim();


        const email =
            normalize(admission.email);


        if (uid) {
            usedUIDs.add(uid);
        }

        if (email) {
            usedEmails.add(email);
        }


        result.push(admission);
    }


    /*
     * Then add pending users
     * only if not already represented
     * by an admission.
     */

    for (const user of pendingUsers) {

        const uid =
            String(user.uid || "").trim();

        const email =
            normalize(user.email);


        if (
            (uid && usedUIDs.has(uid)) ||
            (email && usedEmails.has(email))
        ) {
            continue;
        }


        result.push(user);
    }


    return result.sort(
        (a, b) => {

            const aTime =
                getTime(a.createdAt);

            const bTime =
                getTime(b.createdAt);

            return bTime - aTime;
        }
    );
}


function getTime(value) {

    if (!value) {
        return 0;
    }

    if (value?.seconds) {
        return value.seconds * 1000;
    }

    const time =
        new Date(value).getTime();

    return Number.isNaN(time)
        ? 0
        : time;
}


/* =========================================================
   UI LOADING
========================================================= */

function setLoading(on) {

    $("loadingState")
        ?.classList
        .toggle("hidden", !on);

    if (on) {

        $("tableContainer")
            ?.classList
            .add("hidden");

        $("emptyState")
            ?.classList
            .add("hidden");

        $("errorState")
            ?.classList
            .add("hidden");
    }
}


function showError(message) {

    $("loadingState")
        ?.classList
        .add("hidden");

    $("tableContainer")
        ?.classList
        .add("hidden");

    $("emptyState")
        ?.classList
        .add("hidden");

    $("errorState")
        ?.classList
        .remove("hidden");

    if ($("errorMessage")) {
        $("errorMessage").textContent =
            message;
    }
}


/* =========================================================
   CLASS FILTER
========================================================= */

function populateClassFilter() {

    const select =
        $("classFilter");

    if (!select) {
        return;
    }

    const current =
        select.value;


    const values = [
        ...new Set(
            applications
                .map(classOf)
                .filter(
                    value =>
                        value &&
                        value !== "—"
                )
        )
    ].sort();


    select.innerHTML =
        `
        <option value="all">
            All Classes
        </option>
        ` +
        values
            .map(
                value =>
                    `
                    <option value="${esc(value)}">
                        ${esc(value)}
                    </option>
                    `
            )
            .join("");


    if (values.includes(current)) {
        select.value = current;
    }
}


/* =========================================================
   STATS
========================================================= */

function updateStats() {

    const stats = {
        pending: 0,
        correction: 0,
        approved: 0,
        rejected: 0
    };


    for (const application of applications) {

        if (isPending(application)) {
            stats.pending++;
        }

        else if (isCorrection(application)) {
            stats.correction++;
        }

        else if (isApproved(application)) {
            stats.approved++;
        }

        else if (isRejected(application)) {
            stats.rejected++;
        }
    }


    if ($("pendingCount")) {
        $("pendingCount").textContent =
            stats.pending;
    }

    if ($("correctionCount")) {
        $("correctionCount").textContent =
            stats.correction;
    }

    if ($("approvedCount")) {
        $("approvedCount").textContent =
            stats.approved;
    }

    if ($("rejectedCount")) {
        $("rejectedCount").textContent =
            stats.rejected;
    }
}


/* =========================================================
   FILTER
========================================================= */

function filteredApplications() {

    const search =
        normalize(
            $("searchInput")?.value
        );

    const statusFilter =
        $("statusFilter")?.value ||
        "all";

    const classFilter =
        $("classFilter")?.value ||
        "all";


    return applications.filter(
        (application) => {

            const status =
                statusOf(
                    application.status
                );


            const searchableText = [

                nameOf(application),

                emailOf(application),

                phoneOf(application),

                idOf(application),

                application.uid,

                application.studentId,

                application.teacherId,

                application.applicationId

            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            let statusMatch = true;


            if (
                statusFilter ===
                "pending"
            ) {

                statusMatch =
                    isPending(application);
            }

            else if (
                statusFilter ===
                "correction"
            ) {

                statusMatch =
                    isCorrection(application);
            }

            else if (
                statusFilter ===
                "approved"
            ) {

                statusMatch =
                    isApproved(application);
            }

            else if (
                statusFilter ===
                "rejected"
            ) {

                statusMatch =
                    isRejected(application);
            }


            const searchMatch =
                !search ||
                searchableText.includes(
                    search
                );


            const classMatch =
                classFilter === "all" ||
                classOf(application) ===
                    classFilter;


            return (
                searchMatch &&
                statusMatch &&
                classMatch
            );
        }
    );
}


/* =========================================================
   RENDER TABLE
========================================================= */

function render() {

    const list =
        filteredApplications();


    if ($("resultText")) {

        $("resultText").textContent =
            `${list.length} application${
                list.length === 1
                    ? ""
                    : "s"
            } found`;
    }


    if (!list.length) {

        $("tableContainer")
            ?.classList
            .add("hidden");

        $("emptyState")
            ?.classList
            .remove("hidden");

        return;
    }


    $("emptyState")
        ?.classList
        .add("hidden");

    $("tableContainer")
        ?.classList
        .remove("hidden");


    if (!$("applicationsBody")) {
        return;
    }


    $("applicationsBody").innerHTML =
        list
            .map(
                (application) => {

                    const role =
                        roleOf(
                            application.role ||
                            application.applicantType
                        );


                    const typeLabel =
                        role === "teacher"
                            ? "Teacher"
                            : "Student";


                    const typeClass =
                        role === "teacher"
                            ? "teacher"
                            : "student";


                    return `

                    <tr>

                        <td>

                            <div class="applicant-cell">

                                <div class="applicant-avatar">

                                    ${esc(
                                        nameOf(
                                            application
                                        )
                                            .charAt(0)
                                            .toUpperCase()
                                    )}

                                </div>

                                <div>

                                    <div class="applicant-name">

                                        ${esc(
                                            nameOf(
                                                application
                                            )
                                        )}

                                    </div>

                                    <div class="applicant-email">

                                        ${esc(
                                            emailOf(
                                                application
                                            )
                                        )}

                                    </div>

                                </div>

                            </div>

                        </td>


                        <td>

                            <span class="application-id">

                                ${esc(
                                    idOf(
                                        application
                                    )
                                )}

                            </span>

                        </td>


                        <td>

                            <span class="role-badge ${typeClass}">

                                ${typeLabel}

                            </span>

                        </td>


                        <td>

                            ${esc(
                                classOf(
                                    application
                                )
                            )}

                        </td>


                        <td>

                            ${esc(
                                phoneOf(
                                    application
                                ) ||
                                "—"
                            )}

                        </td>


                        <td>

                            ${esc(
                                formatDate(
                                    application.createdAt ||
                                    application.applicationDate
                                )
                            )}

                        </td>


                        <td>

                            <span class="status status-${statusClass(
                                application.status
                            )}">

                                ${esc(
                                    displayStatus(
                                        application.status
                                    )
                                )}

                            </span>

                        </td>


                        <td>

                            <button
                                type="button"
                                class="small-btn view-btn"
                                data-id="${esc(
                                    application.id
                                )}"
                            >
                                View
                            </button>

                        </td>

                    </tr>

                    `;
                }
            )
            .join("");


    document
        .querySelectorAll(".view-btn")
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () =>
                        openDetails(
                            button.dataset.id
                        )
                );

            }
        );
}


/* =========================================================
   DETAILS
========================================================= */

function openDetails(id) {

    selected =
        applications.find(
            application =>
                application.id === id
        );


    if (!selected) {
        return;
    }


    const role =
        roleOf(
            selected.role ||
            selected.applicantType
        );


    if ($("modalApplicantName")) {

        $("modalApplicantName").textContent =
            nameOf(selected);
    }


    const fields = [

        [
            "Application ID",
            idOf(selected)
        ],

        [
            "Account Type",
            role === "teacher"
                ? "Teacher"
                : role === "student"
                    ? "Student"
                    : "Unknown"
        ],

        [
            "Status",
            displayStatus(
                selected.status
            )
        ],

        [
            "Applicant Name",
            nameOf(selected)
        ],

        [
            "Email",
            emailOf(selected)
        ],

        [
            "Phone",
            phoneOf(selected)
        ],

        [
            "Date of Birth",
            selected.dateOfBirth ||
            selected.dob
        ],

        [
            "Gender",
            selected.gender
        ],

        [
            "Guardian Name",
            guardianOf(selected)
        ],

        [
            "Guardian Phone",
            selected.guardianPhone
        ],

        [
            "Desired Class",
            classOf(selected)
        ],

        [
            "Section",
            selected.desiredSection ||
            selected.section
        ],

        [
            "Qualification",
            selected.qualification
        ],

        [
            "Experience",
            selected.experience
        ],

        [
            "Specialization",
            selected.specialization ||
            selected.subject
        ],

        [
            "Address",
            selected.address
        ],

        [
            "Application Date",
            formatDate(
                selected.createdAt ||
                selected.applicationDate
            )
        ],

        [
            "Admin Note",
            selected.adminNote
        ]

    ];


    if ($("applicationDetails")) {

        $("applicationDetails").innerHTML =

            `
            <div class="detail-grid">

                ${fields
                    .map(
                        ([label, value]) =>
                            `
                            <div class="detail-item ${
                                label === "Address" ||
                                label === "Admin Note"
                                    ? "full"
                                    : ""
                            }">

                                <span class="detail-label">

                                    ${esc(label)}

                                </span>

                                <div class="detail-value">

                                    ${esc(
                                        value ||
                                        "—"
                                    )}

                                </div>

                            </div>
                            `
                    )
                    .join("")}

            </div>
            `;
    }


    /*
     * Disable action buttons
     * only when already approved/rejected.
     */

    const locked =
        isApproved(selected) ||
        isRejected(selected);


    if ($("approveBtn")) {
        $("approveBtn").disabled =
            locked;
    }

    if ($("rejectBtn")) {
        $("rejectBtn").disabled =
            locked;
    }

    if ($("correctionBtn")) {
        $("correctionBtn").disabled =
            locked;
    }


    /*
     * Change approve button text
     * depending on applicant type.
     */

    if ($("approveBtn")) {

        $("approveBtn").textContent =
            role === "teacher"
                ? "Approve Teacher"
                : "Approve Student";
    }


    $("detailsModal")
        ?.classList
        .remove("hidden");
}


function closeDetails() {

    $("detailsModal")
        ?.classList
        .add("hidden");

    selected = null;
}


/* =========================================================
   ACTION CONFIRMATION
========================================================= */

function ask(action) {

    if (!selected) {
        return;
    }


    pendingAction = action;


    const role =
        roleOf(
            selected.role ||
            selected.applicantType
        );


    let title = "";
    let text = "";
    let buttonText = "";


    if (action === "approve") {

        title =
            role === "teacher"
                ? "Approve Teacher?"
                : "Approve Student?";

        text =
            role === "teacher"
                ? "This will activate the teacher account."
                : "This will activate the student account.";

        buttonText =
            role === "teacher"
                ? "Approve Teacher"
                : "Approve Student";
    }


    if (action === "reject") {

        title =
            "Reject Application?";

        text =
            "The application will be marked as rejected.";

        buttonText =
            "Reject";
    }


    if (action === "correction") {

        title =
            "Request Correction?";

        text =
            "The applicant will be asked to correct the submitted information.";

        buttonText =
            "Request Correction";
    }


    if ($("confirmTitle")) {
        $("confirmTitle").textContent =
            title;
    }

    if ($("confirmText")) {
        $("confirmText").textContent =
            text;
    }

    if ($("confirmActionBtn")) {
        $("confirmActionBtn").textContent =
            buttonText;
    }

    if ($("actionNote")) {
        $("actionNote").value = "";
    }


    $("confirmModal")
        ?.classList
        .remove("hidden");
}


/* =========================================================
   CONFIRM ACTION
========================================================= */

async function confirmAction() {

    if (
        !pendingAction ||
        !selected
    ) {
        return;
    }


    const button =
        $("confirmActionBtn");


    if (button) {
        button.disabled = true;
    }


    try {

        if (
            pendingAction ===
            "approve"
        ) {

            await approveApplication(
                selected
            );

        }

        else {

            await updateApplicationStatus(
                selected,
                pendingAction ===
                    "reject"
                    ? "rejected"
                    : "correction",
                $("actionNote")
                    ?.value
                    ?.trim() || ""
            );
        }


        $("confirmModal")
            ?.classList
            .add("hidden");


        closeDetails();


        await loadApplications();


        toast(
            pendingAction ===
                "approve"
                ? "Application approved successfully."
                : "Application status updated successfully."
        );


    } catch (error) {

        console.error(
            "Admission action error:",
            error
        );

        toast(
            error.message ||
            "Action failed."
        );

    } finally {

        if (button) {
            button.disabled = false;
        }

        pendingAction = null;
    }
}


/* =========================================================
   FIND USER
========================================================= */

async function findUser(application) {

    /*
     * First try UID.
     */

    const uid =
        application.uid ||
        application.userUid ||
        application.userId ||
        application.authUid ||
        application.studentUid ||
        application.teacherUid;


    if (uid) {

        const snap =
            await getDoc(
                doc(
                    db,
                    "users",
                    uid
                )
            );


        if (snap.exists()) {

            return {
                uid: snap.id,
                data: snap.data()
            };
        }
    }


    /*
     * If UID is not available,
     * search users by email.
     */

    const email =
        normalize(
            emailOf(application)
        );


    if (!email) {
        return null;
    }


    const snapshot =
        await getDocs(
            collection(db, "users")
        );


    const matches =
        snapshot.docs.filter(
            document =>
                normalize(
                    document.data().email
                ) === email
        );


    if (!matches.length) {
        return null;
    }


    const preferred =
        matches.find(
            document =>
                roleOf(
                    document.data().role
                ) ===
                roleOf(
                    application.role ||
                    application.applicantType
                )
        ) ||
        matches[0];


    return {
        uid: preferred.id,
        data: preferred.data()
    };
}


/* =========================================================
   ID HELPERS
========================================================= */

function numberFromId(value) {

    const match =
        String(value || "")
            .match(
                /(?:REA[-\s]*)?(\d+)/i
            );


    if (
        match &&
        Number(match[1]) >= 1001
    ) {
        return Number(match[1]);
    }


    return null;
}


async function nextStudentId() {

    const counterRef =
        doc(
            db,
            "counters",
            "studentId"
        );


    const users =
        await getDocs(
            collection(db, "users")
        );


    let observed = 1000;


    users.forEach(
        document => {

            const number =
                numberFromId(
                    document.data()
                        .studentId
                );


            if (number) {
                observed =
                    Math.max(
                        observed,
                        number
                    );
            }
        }
    );


    return runTransaction(
        db,
        async transaction => {

            const snapshot =
                await transaction.get(
                    counterRef
                );


            const stored =
                snapshot.exists()
                    ? Number(
                        snapshot.data()
                            .lastId
                    ) || 1000
                    : 1000;


            const next =
                Math.max(
                    stored,
                    observed
                ) + 1;


            transaction.set(
                counterRef,
                {
                    lastId: next,
                    updatedAt:
                        serverTimestamp()
                },
                {
                    merge: true
                }
            );


            return `REA-${next}`;
        }
    );
}


async function nextTeacherId() {

    const counterRef =
        doc(
            db,
            "counters",
            "teacherId"
        );


    const users =
        await getDocs(
            collection(db, "users")
        );


    let observed = 0;


    users.forEach(
        document => {

            const data =
                document.data();


            const teacherId =
                String(
                    data.teacherId || ""
                );


            const match =
                teacherId.match(
                    /(?:REA-T[-\s]*)?(\d+)/i
                );


            if (match) {

                observed =
                    Math.max(
                        observed,
                        Number(match[1])
                    );
            }
        }
    );


    return runTransaction(
        db,
        async transaction => {

            const snapshot =
                await transaction.get(
                    counterRef
                );


            const stored =
                snapshot.exists()
                    ? Number(
                        snapshot.data()
                            .lastId
                    ) || 0
                    : 0;


            const next =
                Math.max(
                    stored,
                    observed
                ) + 1;


            transaction.set(
                counterRef,
                {
                    lastId: next,
                    updatedAt:
                        serverTimestamp()
                },
                {
                    merge: true
                }
            );


            return `REA-T-${next}`;
        }
    );
}


/* =========================================================
   APPROVE APPLICATION
========================================================= */

async function approveApplication(
    application
) {

    const target =
        await findUser(
            application
        );


    if (!target) {

        throw new Error(
            "User account was not found in Firebase."
        );
    }


    const data =
        target.data;


    const role =
        roleOf(
            application.role ||
            application.applicantType ||
            data.role
        );


    /*
     * -----------------------------------------
     * TEACHER
     * -----------------------------------------
     */

    if (role === "teacher") {

        const existingId =
            data.teacherId;


        const teacherId =
            existingId ||
            await nextTeacherId();


        await updateDoc(
            doc(
                db,
                "users",
                target.uid
            ),
            {

                uid: target.uid,

                role: "teacher",

                teacherId,

                name:
                    nameOf(
                        application
                    ),

                email:
                    emailOf(
                        application
                    ) ||
                    data.email ||
                    "",

                phone:
                    application.phone ||
                    data.phone ||
                    "",

                profilePicture:
                    application.profilePicture ||
                    application.profilePhoto ||
                    data.profilePicture ||
                    "",

                dateOfBirth:
                    application.dateOfBirth ||
                    application.dob ||
                    data.dateOfBirth ||
                    "",

                gender:
                    application.gender ||
                    data.gender ||
                    "",

                address:
                    application.address ||
                    data.address ||
                    "",

                qualification:
                    application.qualification ||
                    data.qualification ||
                    "",

                experience:
                    application.experience ||
                    data.experience ||
                    "",

                specialization:
                    application.specialization ||
                    application.subject ||
                    data.specialization ||
                    "",

                status: "active",

                updatedAt:
                    serverTimestamp(),

                updatedBy:
                    adminUser.uid
            }
        );


        await updateOriginalAdmission(
            application,
            {
                status: "approved",

                teacherId,

                teacherUid:
                    target.uid
            }
        );


        await writeActivity(
            "Teacher Admission Approved",
            application,
            {
                teacherId,
                teacherUid:
                    target.uid
            }
        );


        return;
    }


    /*
     * -----------------------------------------
     * STUDENT
     * -----------------------------------------
     */

    const existingStudentId =
        data.studentId;


    const studentId =
        existingStudentId ||
        await nextStudentId();


    const desiredClass =
        classOf(application) !== "—"
            ? classOf(application)
            : (
                data.className ||
                data.class ||
                ""
            );


    await updateDoc(
        doc(
            db,
            "users",
            target.uid
        ),
        {

            uid: target.uid,

            role: "student",

            studentId,

            name:
                nameOf(
                    application
                ),

            email:
                emailOf(
                    application
                ) ||
                data.email ||
                "",

            profilePicture:
                application.profilePicture ||
                application.profilePhoto ||
                data.profilePicture ||
                "",

            dateOfBirth:
                application.dateOfBirth ||
                application.dob ||
                data.dateOfBirth ||
                "",

            gender:
                application.gender ||
                data.gender ||
                "",

            fatherName:
                application.fatherName ||
                data.fatherName ||
                "",

            motherName:
                application.motherName ||
                data.motherName ||
                "",

            guardianName:
                application.guardianName ||
                data.guardianName ||
                "",

            guardianPhone:
                application.guardianPhone ||
                application.phone ||
                data.guardianPhone ||
                "",

            phone:
                application.studentPhone ||
                data.phone ||
                "",

            address:
                application.address ||
                data.address ||
                "",

            class:
                desiredClass,

            className:
                desiredClass,

            section:
                application.desiredSection ||
                application.section ||
                data.section ||
                "",

            roll:
                application.roll ||
                data.roll ||
                "",

            academicSession:
                application.academicSession ||
                data.academicSession ||
                String(
                    new Date()
                        .getFullYear()
                ),

            admissionId:
                application.applicationId ||
                application.id,

            applicationId:
                application.applicationId ||
                application.id,

            admissionDate:
                serverTimestamp(),

            status: "active",

            feeStatus:
                data.feeStatus ||
                "unpaid",

            assignedTeachers:
                data.assignedTeachers ||
                [],

            updatedAt:
                serverTimestamp(),

            updatedBy:
                adminUser.uid
        }
    );


    await updateOriginalAdmission(
        application,
        {
            status: "approved",

            studentId,

            studentUid:
                target.uid
        }
    );


    await writeActivity(
        "Student Admission Approved",
        application,
        {
            studentId,

            studentUid:
                target.uid
        }
    );
}


/* =========================================================
   UPDATE ORIGINAL ADMISSION
========================================================= */

async function updateOriginalAdmission(
    application,
    extra
) {

    /*
     * If application came directly
     * from admissions collection,
     * update it.
     *
     * If it came only from users,
     * create an admissions record.
     */

    if (
        application.source ===
            "admissions"
    ) {

        await updateDoc(
            doc(
                db,
                "admissions",
                application.id
            ),
            {

                ...extra,

                approvedAt:
                    serverTimestamp(),

                approvedBy:
                    adminUser.uid,

                adminNote:
                    $("actionNote")
                        ?.value
                        ?.trim() ||
                    application.adminNote ||
                    "",

                updatedAt:
                    serverTimestamp(),

                updatedBy:
                    adminUser.uid
            }
        );

        return;
    }


    /*
     * User registered but no admission
     * document existed.
     *
     * Create one now so the application
     * has a permanent admission record.
     */

    await addDoc(
        collection(
            db,
            "admissions"
        ),
        {

            uid:
                application.uid,

            userUid:
                application.uid,

            email:
                emailOf(
                    application
                ),

            applicantName:
                nameOf(
                    application
                ),

            role:
                roleOf(
                    application.role ||
                    application.applicantType
                ),

            status:
                "approved",

            ...extra,

            createdAt:
                application.createdAt ||
                serverTimestamp(),

            approvedAt:
                serverTimestamp(),

            approvedBy:
                adminUser.uid,

            adminNote:
                $("actionNote")
                    ?.value
                    ?.trim() ||
                "",

            updatedAt:
                serverTimestamp(),

            updatedBy:
                adminUser.uid
        }
    );


    /*
     * Also update existing user document
     * with admission reference.
     */

    await updateDoc(
        doc(
            db,
            "users",
            application.uid
        ),
        {

            admissionApproved: true,

            admissionApprovedAt:
                serverTimestamp(),

            admissionApprovedBy:
                adminUser.uid
        }
    );
}


/* =========================================================
   REJECT / CORRECTION
========================================================= */

async function updateApplicationStatus(
    application,
    status,
    note
) {

    /*
     * If application exists in admissions
     */

    if (
        application.source ===
        "admissions"
    ) {

        const payload = {

            status,

            updatedAt:
                serverTimestamp(),

            updatedBy:
                adminUser.uid

        };


        if (note) {
            payload.adminNote =
                note;
        }


        if (status === "rejected") {

            payload.rejectedAt =
                serverTimestamp();

            payload.rejectedBy =
                adminUser.uid;
        }


        if (status === "correction") {

            payload.correctionRequestedAt =
                serverTimestamp();

            payload.correctionRequestedBy =
                adminUser.uid;
        }


        await updateDoc(
            doc(
                db,
                "admissions",
                application.id
            ),
            payload
        );


        await writeActivity(
            `Admission ${status}`,
            application,
            {
                note
            }
        );


        return;
    }


    /*
     * Pending user has no admissions document.
     *
     * Update users/{uid}.
     */

    await updateDoc(
        doc(
            db,
            "users",
            application.uid
        ),
        {

            status,

            adminNote:
                note ||
                "",

            updatedAt:
                serverTimestamp(),

            updatedBy:
                adminUser.uid

        }
    );


    /*
     * Create admission record
     * so the application becomes trackable.
     */

    await addDoc(
        collection(
            db,
            "admissions"
        ),
        {

            uid:
                application.uid,

            userUid:
                application.uid,

            email:
                emailOf(
                    application
                ),

            applicantName:
                nameOf(
                    application
                ),

            role:
                roleOf(
                    application.role ||
                    application.applicantType
                ),

            status,

            adminNote:
                note || "",

            createdAt:
                application.createdAt ||
                serverTimestamp(),

            updatedAt:
                serverTimestamp(),

            updatedBy:
                adminUser.uid
        }
    );


    await writeActivity(
        `Admission ${status}`,
        application,
        {
            note
        }
    );
}


/* =========================================================
   ACTIVITY LOG
========================================================= */

async function writeActivity(
    action,
    application,
    extra = {}
) {

    try {

        await addDoc(
            collection(
                db,
                "activity"
            ),
            {

                action,

                targetId:
                    application.id,

                applicantName:
                    nameOf(
                        application
                    ),

                applicantEmail:
                    emailOf(
                        application
                    ),

                performedBy:
                    adminUser.uid,

                createdAt:
                    serverTimestamp(),

                ...extra
            }
        );

    } catch (error) {

        console.warn(
            "Activity log skipped:",
            error
        );
    }
}


/* =========================================================
   TOAST
========================================================= */

function toast(message) {

    const element =
        $("toast");


    if (!element) {
        alert(message);
        return;
    }


    element.textContent =
        message;


    element.classList
        .remove("hidden");


    clearTimeout(
        window.__riseToast
    );


    window.__riseToast =
        setTimeout(
            () => {

                element.classList
                    .add("hidden");

            },
            3000
        );
}


/* =========================================================
   EVENTS
========================================================= */

$("refreshBtn")
    ?.addEventListener(
        "click",
        loadApplications
    );


$("retryBtn")
    ?.addEventListener(
        "click",
        loadApplications
    );


$("searchInput")
    ?.addEventListener(
        "input",
        render
    );


$("statusFilter")
    ?.addEventListener(
        "change",
        render
    );


$("classFilter")
    ?.addEventListener(
        "change",
        render
    );


$("closeDetailsBtn")
    ?.addEventListener(
        "click",
        closeDetails
    );


$("approveBtn")
    ?.addEventListener(
        "click",
        () => ask("approve")
    );


$("rejectBtn")
    ?.addEventListener(
        "click",
        () => ask("reject")
    );


$("correctionBtn")
    ?.addEventListener(
        "click",
        () => ask("correction")
    );


$("cancelConfirmBtn")
    ?.addEventListener(
        "click",
        () =>
            $("confirmModal")
                ?.classList
                .add("hidden")
    );


$("cancelConfirmBtn2")
    ?.addEventListener(
        "click",
        () =>
            $("confirmModal")
                ?.classList
                .add("hidden")
    );


$("confirmActionBtn")
    ?.addEventListener(
        "click",
        confirmAction
    );
