import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    where,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    setDoc,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


/* =========================
   DOM
========================= */

const pendingCount =
    document.getElementById("pendingCount");

const correctionCount =
    document.getElementById("correctionCount");

const approvedCount =
    document.getElementById("approvedCount");

const rejectedCount =
    document.getElementById("rejectedCount");

const searchInput =
    document.getElementById("searchInput");

const statusFilter =
    document.getElementById("statusFilter");

const classFilter =
    document.getElementById("classFilter");

const refreshBtn =
    document.getElementById("refreshBtn");

const retryBtn =
    document.getElementById("retryBtn");

const loadingState =
    document.getElementById("loadingState");

const emptyState =
    document.getElementById("emptyState");

const errorState =
    document.getElementById("errorState");

const errorMessage =
    document.getElementById("errorMessage");

const tableContainer =
    document.getElementById("tableContainer");

const applicationsBody =
    document.getElementById("applicationsBody");

const resultText =
    document.getElementById("resultText");

const detailsModal =
    document.getElementById("detailsModal");

const closeDetailsBtn =
    document.getElementById("closeDetailsBtn");

const applicationDetails =
    document.getElementById("applicationDetails");

const modalApplicantName =
    document.getElementById("modalApplicantName");

const approveBtn =
    document.getElementById("approveBtn");

const rejectBtn =
    document.getElementById("rejectBtn");

const correctionBtn =
    document.getElementById("correctionBtn");

const confirmModal =
    document.getElementById("confirmModal");

const confirmTitle =
    document.getElementById("confirmTitle");

const confirmText =
    document.getElementById("confirmText");

const actionNote =
    document.getElementById("actionNote");

const confirmActionBtn =
    document.getElementById("confirmActionBtn");

const cancelConfirmBtn =
    document.getElementById("cancelConfirmBtn");

const toast =
    document.getElementById("toast");


/* =========================
   STATE
========================= */

let applications = [];
let selectedApplication = null;
let pendingAction = null;
let currentAdmin = null;


/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async user => {

    if (!user) {

        window.location.href = "../login.html";

        return;
    }

    currentAdmin = user;

    await loadApplications();

});


/* =========================
   LOAD APPLICATIONS
========================= */

async function loadApplications() {

    setLoading(true);

    try {

        const applicationsRef =
            collection(db, "admissions");

        let snapshot;

        try {

            const q = query(
                applicationsRef,
                orderBy("createdAt", "desc")
            );

            snapshot = await getDocs(q);

        } catch (orderError) {

            console.warn(
                "Ordered admission query failed. Loading without order.",
                orderError
            );

            snapshot =
                await getDocs(applicationsRef);
        }


        applications =
            snapshot.docs.map(item => ({

                id: item.id,

                ...item.data()

            }));


        updateStatistics();

        renderApplications();

        setLoading(false);

    } catch (error) {

        console.error(
            "ADMISSION LOAD ERROR:",
            error
        );

        setLoading(false);

        showError(
            error.message ||
            "Unable to load admission applications."
        );

    }

}


/* =========================
   STATISTICS
========================= */

function normalizeStatus(status) {

    return String(status || "pending")
        .trim()
        .toLowerCase();

}


function updateStatistics() {

    const counts = {

        pending: 0,
        correction: 0,
        approved: 0,
        rejected: 0

    };


    applications.forEach(application => {

        const status =
            normalizeStatus(application.status);


        if (
            status === "new" ||
            status === "pending" ||
            status === "pending review"
        ) {

            counts.pending++;

        } else if (
            status === "correction" ||
            status === "correction required"
        ) {

            counts.correction++;

        } else if (
            status === "approved"
        ) {

            counts.approved++;

        } else if (
            status === "rejected"
        ) {

            counts.rejected++;

        }

    });


    pendingCount.textContent =
        counts.pending;

    correctionCount.textContent =
        counts.correction;

    approvedCount.textContent =
        counts.approved;

    rejectedCount.textContent =
        counts.rejected;

}


/* =========================
   FILTER
========================= */

function getFilteredApplications() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();

    const selectedStatus =
        statusFilter.value;

    const selectedClass =
        classFilter.value;


    return applications.filter(application => {

        const status =
            normalizeStatus(application.status);

        const applicantName =
            String(
                application.applicantName ||
                application.name ||
                ""
            ).toLowerCase();

        const email =
            String(
                application.email ||
                ""
            ).toLowerCase();

        const phone =
            String(
                application.phone ||
                application.guardianPhone ||
                ""
            ).toLowerCase();

        const applicationId =
            String(application.applicationId || "")
                .toLowerCase();

        const desiredClass =
            String(
                application.desiredClass ||
                application.class ||
                ""
            );


        const matchesSearch =
            !search ||
            applicantName.includes(search) ||
            email.includes(search) ||
            phone.includes(search) ||
            applicationId.includes(search);


        let matchesStatus = true;

        if (selectedStatus !== "all") {

            if (
                selectedStatus === "pending"
            ) {

                matchesStatus =
                    status === "new" ||
                    status === "pending" ||
                    status === "pending review";

            } else if (
                selectedStatus === "correction"
            ) {

                matchesStatus =
                    status === "correction" ||
                    status === "correction required";

            } else {

                matchesStatus =
                    status === selectedStatus;
            }

        }


        const matchesClass =
            selectedClass === "all" ||
            desiredClass === selectedClass;


        return (
            matchesSearch &&
            matchesStatus &&
            matchesClass
        );

    });

}


/* =========================
   RENDER
========================= */

function renderApplications() {

    const filtered =
        getFilteredApplications();


    applicationsBody.innerHTML = "";


    resultText.textContent =
        `${filtered.length} application${
            filtered.length === 1 ? "" : "s"
        } found`;


    if (filtered.length === 0) {

        tableContainer.classList.add("hidden");

        emptyState.classList.remove("hidden");

        return;

    }


    emptyState.classList.add("hidden");

    tableContainer.classList.remove("hidden");


    filtered.forEach(application => {

        applicationsBody.appendChild(
            createApplicationRow(application)
        );

    });

}


/* =========================
   ROW
========================= */

function createApplicationRow(application) {

    const tr =
        document.createElement("tr");


    const name =
        application.applicantName ||
        application.name ||
        "Unknown Applicant";


    const email =
        application.email ||
        "";


    const applicationId =
        application.applicationId ||
        application.id;


    const desiredClass =
        application.desiredClass ||
        application.class ||
        "—";


    const guardian =
        application.guardianName ||
        application.fatherName ||
        application.motherName ||
        "—";


    const date =
        formatDate(
            application.createdAt ||
            application.applicationDate
        );


    const status =
        normalizeStatus(application.status);


    const displayStatus =
        formatStatus(status);


    const initial =
        name
            .trim()
            .charAt(0)
            .toUpperCase() || "A";


    tr.innerHTML = `

        <td>

            <div class="applicant-cell">

                <div class="applicant-avatar">
                    ${escapeHtml(initial)}
                </div>

                <div>

                    <div class="applicant-name">
                        ${escapeHtml(name)}
                    </div>

                    <div class="applicant-email">
                        ${escapeHtml(email)}
                    </div>

                </div>

            </div>

        </td>


        <td>
            <span class="application-id">
                ${escapeHtml(applicationId)}
            </span>
        </td>


        <td>
            ${escapeHtml(desiredClass)}
        </td>


        <td>
            ${escapeHtml(guardian)}
        </td>


        <td>
            ${escapeHtml(date)}
        </td>


        <td>

            <span class="status status-${statusClass(status)}">
                ${escapeHtml(displayStatus)}
            </span>

        </td>


        <td>

            <button
                type="button"
                class="action-btn view-btn"
                data-id="${escapeHtml(application.id)}"
            >
                View
            </button>

        </td>

    `;


    const viewBtn =
        tr.querySelector(".view-btn");


    viewBtn.addEventListener(
        "click",
        () => openDetails(application.id)
    );


    return tr;

}


/* =========================
   DETAILS
========================= */

function openDetails(id) {

    selectedApplication =
        applications.find(
            item => item.id === id
        );


    if (!selectedApplication) {
        return;
    }


    const application =
        selectedApplication;


    const name =
        application.applicantName ||
        application.name ||
        "Applicant";


    modalApplicantName.textContent =
        name;


    applicationDetails.innerHTML = `

        <div class="detail-grid">

            ${detail(
                "Application ID",
                application.applicationId || application.id
            )}

            ${detail(
                "Status",
                formatStatus(
                    normalizeStatus(application.status)
                )
            )}

            ${detail(
                "Applicant Name",
                name
            )}

            ${detail(
                "Date of Birth",
                application.dateOfBirth ||
                application.dob ||
                "—"
            )}

            ${detail(
                "Guardian Name",
                application.guardianName ||
                application.fatherName ||
                "—"
            )}

            ${detail(
                "Guardian Phone",
                application.guardianPhone ||
                application.phone ||
                "—"
            )}

            ${detail(
                "Email",
                application.email ||
                "—"
            )}

            ${detail(
                "Desired Class",
                application.desiredClass ||
                application.class ||
                "—"
            )}

            ${detail(
                "Desired Section",
                application.desiredSection ||
                "—"
            )}

            ${detail(
                "Desired Subject/Course",
                application.desiredSubject ||
                application.course ||
                "—"
            )}

            ${detail(
                "Payment Status",
                application.paymentStatus ||
                "—"
            )}

            ${detail(
                "Application Date",
                formatDate(
                    application.createdAt ||
                    application.applicationDate
                )
            )}

            ${detail(
                "Address",
                application.address ||
                "—",
                true
            )}

            ${detail(
                "Admin Note",
                application.adminNote ||
                "No admin note.",
                true
            )}

        </div>

    `;


    const status =
        normalizeStatus(application.status);


    const locked =
        status === "approved" ||
        status === "rejected" ||
        status === "cancelled" ||
        status === "released";


    approveBtn.disabled = locked;
    rejectBtn.disabled = locked;
    correctionBtn.disabled = locked;


    detailsModal.classList.remove("hidden");

}


/* =========================
   DETAIL HTML
========================= */

function detail(
    label,
    value,
    full = false
) {

    return `

        <div class="detail-item ${full ? "full" : ""}">

            <span class="detail-label">
                ${escapeHtml(label)}
            </span>

            <div class="detail-value">
                ${escapeHtml(
                    String(value ?? "—")
                )}
            </div>

        </div>

    `;

}


/* =========================
   ACTIONS
========================= */

approveBtn.addEventListener(
    "click",
    () => {

        if (!selectedApplication) {
            return;
        }

        prepareAction(
            "approve",
            "Approve Admission?",
            "This will approve the application and create a Student record.",
            "Approve"
        );

    }
);


rejectBtn.addEventListener(
    "click",
    () => {

        if (!selectedApplication) {
            return;
        }

        prepareAction(
            "reject",
            "Reject Admission?",
            "The application will be marked as rejected.",
            "Reject"
        );

    }
);


correctionBtn.addEventListener(
    "click",
    () => {

        if (!selectedApplication) {
            return;
        }

        prepareAction(
            "correction",
            "Request Correction?",
            "The applicant will need to correct the submitted information.",
            "Request Correction"
        );

    }
);


/* =========================
   PREPARE ACTION
========================= */

function prepareAction(
    action,
    title,
    text,
    buttonText
) {

    pendingAction = action;

    confirmTitle.textContent =
        title;

    confirmText.textContent =
        text;

    confirmActionBtn.textContent =
        buttonText;

    actionNote.value = "";

    confirmModal.classList.remove(
        "hidden"
    );

}


/* =========================
   CONFIRM ACTION
========================= */

confirmActionBtn.addEventListener(
    "click",
    async () => {

        if (
            !pendingAction ||
            !selectedApplication
        ) {
            return;
        }


        confirmActionBtn.disabled =
            true;

        confirmActionBtn.textContent =
            "Processing...";


        try {

            if (
                pendingAction === "approve"
            ) {

                await approveAdmission(
                    selectedApplication
                );

            } else if (
                pendingAction === "reject"
            ) {

                await updateAdmissionStatus(
                    selectedApplication,
                    "rejected"
                );

            } else if (
                pendingAction === "correction"
            ) {

                await updateAdmissionStatus(
                    selectedApplication,
                    "correction",
                    actionNote.value.trim()
                );

            }


            confirmModal.classList.add(
                "hidden"
            );

            detailsModal.classList.add(
                "hidden"
            );


            await loadApplications();


            showToast(
                pendingAction === "approve"
                    ? "Admission approved successfully."
                    : "Admission status updated successfully."
            );


        } catch (error) {

            console.error(
                "ADMISSION ACTION ERROR:",
                error
            );

            showToast(
                error.message ||
                "Action failed."
            );

        } finally {

            confirmActionBtn.disabled =
                false;

            pendingAction = null;

            confirmActionBtn.textContent =
                "Confirm";

        }

    }
);


/* =========================
   APPROVE
========================= */

async function approveAdmission(
    application
) {

    /*
     * Generate permanent sequential
     * Student ID.
     *
     * First student = 1001
     */

    const studentId =
        await generateStudentId();


    const name =
        application.applicantName ||
        application.name ||
        "";


    const studentData = {

        studentId,

        admissionId:
            application.id,

        applicationId:
            application.applicationId ||
            application.id,

        name,

        profilePicture:
            application.profilePhoto ||
            application.profilePicture ||
            "",

        dateOfBirth:
            application.dateOfBirth ||
            application.dob ||
            "",

        fatherName:
            application.fatherName ||
            "",

        motherName:
            application.motherName ||
            "",

        guardianName:
            application.guardianName ||
            "",

        guardianPhone:
            application.guardianPhone ||
            application.phone ||
            "",

        phone:
            application.studentPhone ||
            "",

        email:
            application.email ||
            "",

        address:
            application.address ||
            "",

        class:
            application.desiredClass ||
            application.class ||
            "",

        section:
            application.desiredSection ||
            "",

        roll:
            "",

        academicSession:
            application.academicSession ||
            getAcademicSession(),

        admissionDate:
            serverTimestamp(),

        assignedTeachers: [],

        status:
            "active",

        feeStatus:
            "unpaid",

        createdAt:
            serverTimestamp(),

        updatedAt:
            serverTimestamp(),

        createdBy:
            currentAdmin.uid,

        updatedBy:
            currentAdmin.uid

    };


    /*
     * Main student record.
     */

    await setDoc(
        doc(
            db,
            "students",
            studentId
        ),
        studentData
    );


    /*
     * Sync Student ID with users collection.
     *
     * Student Management currently reads
     * users collection, so we must store
     * the same studentId there.
     */

    await syncStudentIdToUser(
        application,
        studentId
    );


    const note =
        actionNote.value.trim();


    /*
     * Update admission application.
     */

    await updateDoc(
        doc(
            db,
            "admissions",
            application.id
        ),
        {

            status: "approved",

            studentId,

            approvedAt:
                serverTimestamp(),

            approvedBy:
                currentAdmin.uid,

            adminNote:
                note ||
                application.adminNote ||
                "",

            updatedAt:
                serverTimestamp(),

            updatedBy:
                currentAdmin.uid

        }
    );


    /*
     * Activity log
     */

    await addActivityLog(
        "Admission Approved",
        application.id,
        {
            studentId,
            applicantName: name
        }
    );

}


/* =========================
   SYNC STUDENT ID
========================= */

async function syncStudentIdToUser(
    application,
    studentId
) {

    let userUid =
        application.uid ||
        application.userUid ||
        application.userId ||
        application.authUid ||
        application.studentUid ||
        "";


    /*
     * If UID is already available
     * in the admission document,
     * use it directly.
     */

    if (userUid) {

        await updateDoc(
            doc(
                db,
                "users",
                userUid
            ),
            {

                studentId,

                status: "active",

                updatedAt:
                    serverTimestamp(),

                updatedBy:
                    currentAdmin.uid

            }
        );

        return;

    }


    /*
     * Otherwise find the existing user
     * using the student's email.
     */

    const email =
        String(
            application.email ||
            ""
        )
        .trim()
        .toLowerCase();


    if (!email) {

        console.warn(
            "Student ID created, but no email was available to sync with users collection."
        );

        return;

    }


    try {

        const usersQuery =
            query(
                collection(db, "users"),
                where("email", "==", email)
            );


        const userSnapshot =
            await getDocs(usersQuery);


        if (
            userSnapshot.empty
        ) {

            console.warn(
                "No matching users document found for:",
                email
            );

            return;

        }


        /*
         * Prefer a student-role user.
         */

        let targetUser =
            userSnapshot.docs.find(
                userDoc =>
                    String(
                        userDoc.data().role ||
                        ""
                    )
                    .toLowerCase() ===
                    "student"
            );


        /*
         * If no student role exists,
         * use the first matching user.
         */

        if (!targetUser) {

            targetUser =
                userSnapshot.docs[0];

        }


        await updateDoc(
            doc(
                db,
                "users",
                targetUser.id
            ),
            {

                studentId,

                status: "active",

                updatedAt:
                    serverTimestamp(),

                updatedBy:
                    currentAdmin.uid

            }
        );


        console.log(
            "Student ID synced successfully:",
            studentId,
            "→",
            targetUser.id
        );


    } catch (error) {

        console.error(
            "USER STUDENT ID SYNC ERROR:",
            error
        );

        /*
         * Do not cancel the admission
         * because the main student record
         * has already been created.
         */

    }

}


/* =========================
   UPDATE STATUS
========================= */

async function updateAdmissionStatus(
    application,
    newStatus,
    note = ""
) {

    const updates = {

        status: newStatus,

        updatedAt:
            serverTimestamp(),

        updatedBy:
            currentAdmin.uid

    };


    if (note) {

        updates.adminNote =
            note;

    }


    if (newStatus === "rejected") {

        updates.rejectedAt =
            serverTimestamp();

        updates.rejectedBy =
            currentAdmin.uid;

    }


    if (newStatus === "correction") {

        updates.correctionRequestedAt =
            serverTimestamp();

        updates.correctionRequestedBy =
            currentAdmin.uid;

    }


    await updateDoc(
        doc(
            db,
            "admissions",
            application.id
        ),
        updates
    );


    await addActivityLog(
        newStatus === "rejected"
            ? "Admission Rejected"
            : "Admission Correction Requested",
        application.id,
        {
            applicantName:
                application.applicantName ||
                application.name ||
                ""
        }
    );

}


/* =========================
   STUDENT ID GENERATOR
========================= */

async function generateStudentId() {

    const counterRef =
        doc(
            db,
            "counters",
            "studentId"
        );


    const nextStudentId =
        await runTransaction(
            db,
            async transaction => {

                const counterSnapshot =
                    await transaction.get(
                        counterRef
                    );


                let lastId = 1000;


                if (
                    counterSnapshot.exists()
                ) {

                    const data =
                        counterSnapshot.data();


                    const storedLastId =
                        Number(
                            data.lastId
                        );


                    if (
                        Number.isInteger(
                            storedLastId
                        ) &&
                        storedLastId >= 1000
                    ) {

                        lastId =
                            storedLastId;

                    }

                }


                const nextId =
                    lastId + 1;


                transaction.set(
                    counterRef,
                    {

                        lastId: nextId,

                        updatedAt:
                            serverTimestamp()

                    },
                    {
                        merge: true
                    }
                );


                return nextId;

            }
        );


    return String(
        nextStudentId
    );

}


/* =========================
   ACADEMIC SESSION
========================= */

function getAcademicSession() {

    const now =
        new Date();

    const year =
        now.getFullYear();

    return `${year}-${year + 1}`;

}


/* =========================
   ACTIVITY LOG
========================= */

async function addActivityLog(
    action,
    targetId,
    details = {}
) {

    try {

        await addDoc(
            collection(
                db,
                "activityLogs"
            ),
            {

                action,

                targetId,

                details,

                adminUid:
                    currentAdmin.uid,

                createdAt:
                    serverTimestamp()

            }
        );

    } catch (error) {

        console.warn(
            "Activity log failed:",
            error
        );

    }

}


/* =========================
   MODALS
========================= */

closeDetailsBtn.addEventListener(
    "click",
    () => {

        detailsModal.classList.add(
            "hidden"
        );

        selectedApplication = null;

    }
);


cancelConfirmBtn.addEventListener(
    "click",
    () => {

        confirmModal.classList.add(
            "hidden"
        );

        pendingAction = null;

    }
);


detailsModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            detailsModal
        ) {

            detailsModal.classList.add(
                "hidden"
            );

        }

    }
);


confirmModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            confirmModal
        ) {

            confirmModal.classList.add(
                "hidden"
            );

            pendingAction = null;

        }

    }
);


/* =========================
   EVENTS
========================= */

searchInput.addEventListener(
    "input",
    renderApplications
);

statusFilter.addEventListener(
    "change",
    renderApplications
);

classFilter.addEventListener(
    "change",
    renderApplications
);

refreshBtn.addEventListener(
    "click",
    loadApplications
);

retryBtn.addEventListener(
    "click",
    loadApplications
);


/* =========================
   UI HELPERS
========================= */

function setLoading(
    loading
) {

    if (loading) {

        loadingState.classList.remove(
            "hidden"
        );

        tableContainer.classList.add(
            "hidden"
        );

        emptyState.classList.add(
            "hidden"
        );

        errorState.classList.add(
            "hidden"
        );

    } else {

        loadingState.classList.add(
            "hidden"
        );

    }

}


function showError(
    message
) {

    tableContainer.classList.add(
        "hidden"
    );

    emptyState.classList.add(
        "hidden"
    );

    errorState.classList.remove(
        "hidden"
    );

    errorMessage.textContent =
        message;

}


function showToast(
    message
) {

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3000
    );

}


/* =========================
   FORMATTERS
========================= */

function formatStatus(
    status
) {

    const map = {

        new: "New",

        pending:
            "Pending Review",

        "pending review":
            "Pending Review",

        correction:
            "Correction Required",

        "correction required":
            "Correction Required",

        approved:
            "Approved",

        rejected:
            "Rejected",

        cancelled:
            "Cancelled",

        released:
            "Released"

    };


    return (
        map[status] ||
        "Pending Review"
    );

}


function statusClass(
    status
) {

    if (
        status === "pending review"
    ) {
        return "pending";
    }

    if (
        status === "correction required"
    ) {
        return "correction";
    }

    return status;

}


function formatDate(
    value
) {

    if (!value) {
        return "—";
    }


    try {

        let date;


        if (
            value &&
            typeof value.toDate ===
            "function"
        ) {

            date =
                value.toDate();

        } else if (
            value instanceof Date
        ) {

            date = value;

        } else {

            date =
                new Date(value);

        }


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "—";

        }


        return new Intl.DateTimeFormat(
            "en-BD",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ).format(date);

    } catch {

        return "—";

    }

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(
    value
) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

        }
