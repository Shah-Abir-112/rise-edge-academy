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
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


/* =========================================================
   DOM ELEMENTS
========================================================= */

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


/* =========================================================
   STATE
========================================================= */

let applications = [];
let selectedApplication = null;
let pendingAction = null;
let currentAdmin = null;


/* =========================================================
   AUTH
========================================================= */

onAuthStateChanged(auth, async user => {

    if (!user) {

        window.location.href = "../login.html";

        return;
    }

    currentAdmin = user;

    await loadApplications();

});


/* =========================================================
   LOAD ADMISSIONS
========================================================= */

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

            snapshot =
                await getDocs(q);

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


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(status) {

    return String(status || "pending")
        .trim()
        .toLowerCase();

}


/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics() {

    const counts = {

        pending: 0,

        correction: 0,

        approved: 0,

        rejected: 0

    };


    applications.forEach(application => {

        const status =
            normalizeStatus(
                application.status
            );


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


    if (pendingCount) {
        pendingCount.textContent =
            counts.pending;
    }

    if (correctionCount) {
        correctionCount.textContent =
            counts.correction;
    }

    if (approvedCount) {
        approvedCount.textContent =
            counts.approved;
    }

    if (rejectedCount) {
        rejectedCount.textContent =
            counts.rejected;
    }

}


/* =========================================================
   FILTER APPLICATIONS
========================================================= */

function getFilteredApplications() {

    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const selectedStatus =
        statusFilter
            ? statusFilter.value
            : "all";


    const selectedClass =
        classFilter
            ? classFilter.value
            : "all";


    return applications.filter(application => {

        const status =
            normalizeStatus(
                application.status
            );


        const applicantName =
            String(
                application.applicantName ||
                application.name ||
                ""
            )
            .toLowerCase();


        const email =
            String(
                application.email ||
                ""
            )
            .toLowerCase();


        const phone =
            String(
                application.phone ||
                application.guardianPhone ||
                ""
            )
            .toLowerCase();


        const applicationId =
            String(
                application.applicationId ||
                application.id ||
                ""
            )
            .toLowerCase();


        const desiredClass =
            String(
                application.desiredClass ||
                application.class ||
                ""
            )
            .trim();


        const matchesSearch =
            !search ||
            applicantName.includes(search) ||
            email.includes(search) ||
            phone.includes(search) ||
            applicationId.includes(search);


        let matchesStatus = true;


        if (
            selectedStatus !== "all"
        ) {

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


/* =========================================================
   RENDER APPLICATIONS
========================================================= */

function renderApplications() {

    const filtered =
        getFilteredApplications();


    if (applicationsBody) {

        applicationsBody.innerHTML = "";

    }


    if (resultText) {

        resultText.textContent =
            `${filtered.length} application${
                filtered.length === 1
                    ? ""
                    : "s"
            } found`;

    }


    if (filtered.length === 0) {

        if (tableContainer) {
            tableContainer.classList.add("hidden");
        }

        if (emptyState) {
            emptyState.classList.remove("hidden");
        }

        return;

    }


    if (emptyState) {
        emptyState.classList.add("hidden");
    }


    if (tableContainer) {
        tableContainer.classList.remove("hidden");
    }


    filtered.forEach(application => {

        if (applicationsBody) {

            applicationsBody.appendChild(
                createApplicationRow(
                    application
                )
            );

        }

    });

}


/* =========================================================
   CREATE APPLICATION ROW
========================================================= */

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
        normalizeStatus(
            application.status
        );


    const displayStatus =
        formatStatus(status);


    const initial =
        name
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "A";


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

                ${escapeHtml(
                    applicationId
                )}

            </span>

        </td>


        <td>

            ${escapeHtml(
                desiredClass
            )}

        </td>


        <td>

            ${escapeHtml(
                guardian
            )}

        </td>


        <td>

            ${escapeHtml(date)}

        </td>


        <td>

            <span
                class="status status-${statusClass(status)}"
            >

                ${escapeHtml(
                    displayStatus
                )}

            </span>

        </td>


        <td>

            <button
                type="button"
                class="action-btn view-btn"
            >

                View

            </button>

        </td>

    `;


    const viewBtn =
        tr.querySelector(
            ".view-btn"
        );


    if (viewBtn) {

        viewBtn.addEventListener(
            "click",
            () => {
                openDetails(
                    application.id
                );
            }
        );

    }


    return tr;

}


/* =========================================================
   OPEN DETAILS
========================================================= */

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


    if (modalApplicantName) {

        modalApplicantName.textContent =
            name;

    }


    if (applicationDetails) {

        applicationDetails.innerHTML = `

            <div class="detail-grid">

                ${detail(
                    "Application ID",
                    application.applicationId ||
                    application.id
                )}

                ${detail(
                    "Status",
                    formatStatus(
                        normalizeStatus(
                            application.status
                        )
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

    }


    const status =
        normalizeStatus(
            application.status
        );


    const locked =
        status === "approved" ||
        status === "rejected" ||
        status === "cancelled" ||
        status === "released";


    if (approveBtn) {
        approveBtn.disabled = locked;
    }

    if (rejectBtn) {
        rejectBtn.disabled = locked;
    }

    if (correctionBtn) {
        correctionBtn.disabled = locked;
    }


    if (detailsModal) {

        detailsModal.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   DETAIL HTML
========================================================= */

function detail(
    label,
    value,
    full = false
) {

    return `

        <div
            class="detail-item ${
                full ? "full" : ""
            }"
        >

            <span class="detail-label">

                ${escapeHtml(label)}

            </span>

            <div class="detail-value">

                ${escapeHtml(
                    String(
                        value ?? "—"
                    )
                )}

            </div>

        </div>

    `;

}


/* =========================================================
   APPROVE BUTTON
========================================================= */

if (approveBtn) {

    approveBtn.addEventListener(
        "click",
        () => {

            if (!selectedApplication) {
                return;
            }


            prepareAction(
                "approve",
                "Approve Admission?",
                "This will approve the application and activate the student's existing account.",
                "Approve"
            );

        }
    );

}


/* =========================================================
   REJECT BUTTON
========================================================= */

if (rejectBtn) {

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

}


/* =========================================================
   CORRECTION BUTTON
========================================================= */

if (correctionBtn) {

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

}


/* =========================================================
   PREPARE ACTION
========================================================= */

function prepareAction(
    action,
    title,
    text,
    buttonText
) {

    pendingAction =
        action;


    if (confirmTitle) {

        confirmTitle.textContent =
            title;

    }


    if (confirmText) {

        confirmText.textContent =
            text;

    }


    if (confirmActionBtn) {

        confirmActionBtn.textContent =
            buttonText;

    }


    if (actionNote) {

        actionNote.value = "";

    }


    if (confirmModal) {

        confirmModal.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   CONFIRM ACTION
========================================================= */

if (confirmActionBtn) {

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
                    pendingAction ===
                    "approve"
                ) {

                    await approveAdmission(
                        selectedApplication
                    );

                } else if (
                    pendingAction ===
                    "reject"
                ) {

                    await updateAdmissionStatus(
                        selectedApplication,
                        "rejected"
                    );

                } else if (
                    pendingAction ===
                    "correction"
                ) {

                    await updateAdmissionStatus(
                        selectedApplication,
                        "correction",
                        actionNote
                            ? actionNote.value.trim()
                            : ""
                    );

                }


                if (confirmModal) {

                    confirmModal.classList.add(
                        "hidden"
                    );

                }


                if (detailsModal) {

                    detailsModal.classList.add(
                        "hidden"
                    );

                }


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


                pendingAction =
                    null;


                confirmActionBtn.textContent =
                    "Confirm";

            }

        }
    );

}


/* =========================================================
   APPROVE ADMISSION
========================================================= */

async function approveAdmission(
    application
) {

    /*
     * IMPORTANT
     *
     * We DO NOT create:
     *
     * students/{studentId}
     *
     * because Rise Edge Academy uses
     * one users collection.
     *
     * Student document:
     *
     * users/{Firebase Auth UID}
     *
     * role: "student"
     */


    const applicationStatus =
        normalizeStatus(
            application.status
        );


    if (
        applicationStatus ===
        "approved"
    ) {

        throw new Error(
            "This admission is already approved."
        );

    }


    /*
     * STEP 1
     *
     * Find the existing student account.
     */

    const studentUser =
        await findStudentUser(
            application
        );


    if (!studentUser) {

        throw new Error(
            "Student account not found. The student must register first using the same email address."
        );

    }


    const studentUserData =
        studentUser.data;


    /*
     * If this user already has a
     * Student ID, don't generate another one.
     */

    let studentId =
        String(
            studentUserData.studentId ||
            ""
        ).trim();


    /*
     * STEP 2
     *
     * Generate sequential Student ID.
     *
     * First = 1001
     * Next  = 1002
     * Next  = 1003
     */

    if (!studentId) {

        studentId =
            await generateStudentId();

    }


    const name =
        application.applicantName ||
        application.name ||
        studentUserData.name ||
        "";


    const email =
        application.email ||
        studentUserData.email ||
        "";


    const desiredClass =
        application.desiredClass ||
        application.class ||
        application.className ||
        studentUserData.className ||
        studentUserData.class ||
        "";


    const section =
        application.desiredSection ||
        application.section ||
        studentUserData.section ||
        "";


    const roll =
        application.roll ||
        studentUserData.roll ||
        "";


    /*
     * STEP 3
     *
     * Update the EXISTING users document.
     */

    await updateDoc(
        doc(
            db,
            "users",
            studentUser.uid
        ),
        {

            role: "student",

            studentId:

                studentId,

            name:

                name,

            email:

                email,

            profilePicture:

                application.profilePhoto ||
                application.profilePicture ||
                studentUserData.profilePicture ||
                "",

            dateOfBirth:

                application.dateOfBirth ||
                application.dob ||
                studentUserData.dateOfBirth ||
                studentUserData.dob ||
                "",

            fatherName:

                application.fatherName ||
                studentUserData.fatherName ||
                "",

            motherName:

                application.motherName ||
                studentUserData.motherName ||
                "",

            guardianName:

                application.guardianName ||
                studentUserData.guardianName ||
                "",

            guardianPhone:

                application.guardianPhone ||
                application.phone ||
                studentUserData.guardianPhone ||
                studentUserData.phone ||
                "",

            phone:

                application.studentPhone ||
                studentUserData.phone ||
                "",

            address:

                application.address ||
                studentUserData.address ||
                "",

            /*
             * Keep BOTH fields.
             *
             * Student Management can read
             * either class or className.
             */

            class:

                desiredClass,

            className:

                desiredClass,

            section:

                section,

            roll:

                roll,

            academicSession:

                application.academicSession ||
                studentUserData.academicSession ||
                getAcademicSession(),

            admissionId:

                application.id,

            applicationId:

                application.applicationId ||
                application.id,

            admissionDate:

                serverTimestamp(),

            status:

                "active",

            feeStatus:

                studentUserData.feeStatus ||
                "unpaid",

            assignedTeachers:

                studentUserData.assignedTeachers ||
                [],

            updatedAt:

                serverTimestamp(),

            updatedBy:

                currentAdmin.uid

        }
    );


    /*
     * STEP 4
     *
     * Update admission application.
     */

    const note =
        actionNote
            ? actionNote.value.trim()
            : "";


    await updateDoc(
        doc(
            db,
            "admissions",
            application.id
        ),
        {

            status:

                "approved",

            studentId:

                studentId,

            studentUid:

                studentUser.uid,

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
     * STEP 5
     *
     * Activity log.
     */

    await addActivityLog(
        "Admission Approved",
        application.id,
        {

            studentId:

                studentId,

            studentUid:

                studentUser.uid,

            applicantName:

                name

        }
    );


    console.log(
        "Student approved:",
        {
            studentId,
            uid: studentUser.uid,
            name
        }
    );

}


/* =========================================================
   FIND STUDENT USER
========================================================= */

async function findStudentUser(
    application
) {

    /*
     * FIRST:
     * Try UID fields from admission.
     */

    const possibleUid =
        application.uid ||
        application.userUid ||
        application.userId ||
        application.authUid ||
        application.studentUid ||
        "";


    if (possibleUid) {

        try {

            const userRef =
                doc(
                    db,
                    "users",
                    possibleUid
                );


            const userSnapshot =
                await getDocs(
                    query(
                        collection(db, "users"),
                        where(
                            "__name__",
                            "==",
                            possibleUid
                        )
                    )
                );


            if (
                !userSnapshot.empty
            ) {

                const userDoc =
                    userSnapshot.docs[0];


                const data =
                    userDoc.data();


                if (
                    String(
                        data.role || ""
                    )
                    .toLowerCase() ===
                    "student"
                ) {

                    return {

                        uid:
                            userDoc.id,

                        data

                    };

                }

            }

        } catch (error) {

            console.warn(
                "UID lookup failed:",
                error
            );

        }

    }


    /*
     * SECOND:
     *
     * Find by email.
     */

    const email =
        String(
            application.email ||
            ""
        )
        .trim()
        .toLowerCase();


    if (!email) {

        return null;

    }


    const usersQuery =
        query(
            collection(db, "users"),
            where(
                "email",
                "==",
                email
            )
        );


    const userSnapshot =
        await getDocs(
            usersQuery
        );


    if (
        userSnapshot.empty
    ) {

        return null;

    }


    /*
     * Prefer role = student.
     */

    let targetUser =
        userSnapshot.docs.find(
            userDoc => {

                const data =
                    userDoc.data();

                return (
                    String(
                        data.role || ""
                    )
                    .trim()
                    .toLowerCase() ===
                    "student"
                );

            }
        );


    /*
     * If only one email match exists,
     * use it.
     */

    if (
        !targetUser &&
        userSnapshot.docs.length === 1
    ) {

        targetUser =
            userSnapshot.docs[0];

    }


    if (!targetUser) {

        return null;

    }


    return {

        uid:
            targetUser.id,

        data:
            targetUser.data()

    };

}


/* =========================================================
   GENERATE SEQUENTIAL STUDENT ID
========================================================= */

async function generateStudentId() {

    /*
     * Firestore:
     *
     * counters
     *    └── studentId
     *          └── lastId: 1000
     *
     * First generated ID = 1001
     */


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


                let lastId =
                    1000;


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

                        lastId:
                            nextId,

                        updatedAt:
                            serverTimestamp()

                    },
                    {

                        merge:
                            true

                    }
                );


                return nextId;

            }
        );


    return String(
        nextStudentId
    );

}


/* =========================================================
   UPDATE ADMISSION STATUS
========================================================= */

async function updateAdmissionStatus(
    application,
    newStatus,
    note = ""
) {

    const updates = {

        status:

            newStatus,

        updatedAt:

            serverTimestamp(),

        updatedBy:

            currentAdmin.uid

    };


    if (note) {

        updates.adminNote =
            note;

    }


    if (
        newStatus ===
        "rejected"
    ) {

        updates.rejectedAt =
            serverTimestamp();

        updates.rejectedBy =
            currentAdmin.uid;

    }


    if (
        newStatus ===
        "correction"
    ) {

        updates.correction
