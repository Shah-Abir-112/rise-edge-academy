import {
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    db
} from "../../js/firebase-config.js";


/* =========================
   HELPER
========================= */

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


/* =========================
   CURRENT MONTH
========================= */

function getCurrentMonth() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    return `${year}-${month}`;
}


/* =========================
   STUDENTS
========================= */

export function listenToStudents() {

    const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("status", "==", "active")
    );


    return onSnapshot(
        studentsQuery,

        (snapshot) => {

            const total = snapshot.size;

            setText(
                "totalStudents",
                total
            );

            setText(
                "overviewStudents",
                total
            );

        },

        (error) => {

            console.error(
                "Students listener error:",
                error
            );

            setText(
                "totalStudents",
                "—"
            );

            setText(
                "overviewStudents",
                "—"
            );
        }
    );
}


/* =========================
   TEACHERS
========================= */

export function listenToTeachers() {

    const teachersQuery = query(
        collection(db, "users"),
        where("role", "==", "teacher"),
        where("status", "==", "active")
    );


    return onSnapshot(
        teachersQuery,

        (snapshot) => {

            const total = snapshot.size;

            setText(
                "totalTeachers",
                total
            );

            setText(
                "overviewTeachers",
                total
            );

        },

        (error) => {

            console.error(
                "Teachers listener error:",
                error
            );

            setText(
                "totalTeachers",
                "—"
            );

            setText(
                "overviewTeachers",
                "—"
            );
        }
    );
}


/* =========================
   PENDING REQUESTS
========================= */

export function listenToPendingRequests() {

    const pendingQuery = query(
        collection(db, "users"),
        where("status", "==", "pending")
    );


    return onSnapshot(
        pendingQuery,

        (snapshot) => {

            const total = snapshot.size;

            setText(
                "pendingRequests",
                total
            );

            setText(
                "overviewPending",
                total
            );


            const pendingActions =
                document.getElementById(
                    "pendingActions"
                );


            if (!pendingActions) {
                return;
            }


            if (total === 0) {

                pendingActions.textContent =
                    "No pending requests.";

                return;
            }


            let students = 0;
            let teachers = 0;


            snapshot.forEach((docSnap) => {

                const data = docSnap.data();

                const role = String(
                    data.role || ""
                ).toLowerCase();


                if (role === "student") {
                    students++;
                }

                if (role === "teacher") {
                    teachers++;
                }

            });


            pendingActions.innerHTML = `
                <div style="
                    width:100%;
                    display:flex;
                    flex-direction:column;
                    gap:10px;
                ">

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        padding:12px;
                        background:#f8fafc;
                        border-radius:10px;
                    ">
                        <span>Student Requests</span>
                        <strong>${students}</strong>
                    </div>

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        padding:12px;
                        background:#f8fafc;
                        border-radius:10px;
                    ">
                        <span>Teacher Requests</span>
                        <strong>${teachers}</strong>
                    </div>

                </div>
            `;

        },

        (error) => {

            console.error(
                "Pending request listener error:",
                error
            );

            setText(
                "pendingRequests",
                "—"
            );

            setText(
                "overviewPending",
                "—"
            );
        }
    );
}


/* =========================
   MONTHLY COLLECTION
========================= */

export function listenToMonthlyCollection() {

    const currentMonth =
        getCurrentMonth();


    const paymentsQuery = query(
        collection(db, "payments"),
        where("status", "==", "paid"),
        where("month", "==", currentMonth)
    );


    return onSnapshot(
        paymentsQuery,

        (snapshot) => {

            let total = 0;


            snapshot.forEach((docSnap) => {

                const data = docSnap.data();

                const amount =
                    Number(data.amount) || 0;

                total += amount;

            });


            const formatted =
                `৳${total.toLocaleString("en-BD")}`;


            setText(
                "monthlyCollection",
                formatted
            );

            setText(
                "overviewCollection",
                formatted
            );

        },

        (error) => {

            console.error(
                "Payment listener error:",
                error
            );

            setText(
                "monthlyCollection",
                "৳—"
            );

            setText(
                "overviewCollection",
                "৳—"
            );
        }
    );
}


/* =========================
   START ALL DASHBOARD LISTENERS
========================= */

export function startDashboardListeners() {

    const unsubscribeStudents =
        listenToStudents();

    const unsubscribeTeachers =
        listenToTeachers();

    const unsubscribePending =
        listenToPendingRequests();

    const unsubscribePayments =
        listenToMonthlyCollection();


    return function stopDashboardListeners() {

        unsubscribeStudents();
        unsubscribeTeachers();
        unsubscribePending();
        unsubscribePayments();

    };
}
