import {
    protectAdminRoute,
    logoutAdmin
} from "./auth.js";

import {
    startDashboardListeners
} from "./dashboard.js";


/* =========================
   DOM ELEMENTS
========================= */

const navItems =
    document.querySelectorAll(".nav-item");

const pageSections =
    document.querySelectorAll(".page-section");

const pageTitle =
    document.getElementById("pageTitle");

const sidebar =
    document.getElementById("sidebar");

const menuBtn =
    document.getElementById("menuBtn");

const logoutBtn =
    document.getElementById("logoutBtn");


/* =========================
   PAGE TITLES
========================= */

const pageTitles = {

    dashboard: "Dashboard",

    profile: "Admin Profile",

    students: "Students",

    teachers: "Teachers",

    admissions: "Admissions / Requests",

    courses: "Courses & Classes",

    assignments: "Assignments",

    results: "Results",

    attendance: "Attendance",

    tuition: "Tuition Management",

    salary: "Teacher Salary",

    notices: "Notices",

    messages: "Messages / Monitoring",

    settings: "Settings"

};


/* =========================
   SHOW SECTION
========================= */

function showSection(sectionName) {

    pageSections.forEach((section) => {

        section.classList.remove("active");

    });


    const target =
        document.getElementById(
            `section-${sectionName}`
        );


    if (target) {

        target.classList.add("active");

    }


    navItems.forEach((item) => {

        item.classList.remove("active");

        if (
            item.dataset.section === sectionName
        ) {
            item.classList.add("active");
        }

    });


    if (pageTitle) {

        pageTitle.textContent =
            pageTitles[sectionName] ||
            "Admin Panel";

    }


    // Close mobile sidebar
    if (sidebar) {

        sidebar.classList.remove("open");

    }
}


/* =========================
   NAVIGATION
========================= */

navItems.forEach((item) => {

    item.addEventListener("click", (event) => {

        event.preventDefault();

        const sectionName =
            item.dataset.section;

        if (!sectionName) {
            return;
        }


        /*
         * Students is now a separate module.
         * Open the dedicated Students page.
         */
        if (sectionName === "students") {

            window.location.href =
                "./pages/students.html";

            return;
        }


        /*
         * Other modules will remain inside
         * the admin shell until their
         * dedicated pages are created.
         */

        showSection(sectionName);


        window.history.replaceState(
            null,
            "",
            `#${sectionName}`
        );

    });

});



/* =========================
   LOAD SECTION FROM HASH
========================= */

function loadInitialSection() {

    const hash =
        window.location.hash
            .replace("#", "")
            .trim();


    if (
        hash &&
        document.getElementById(
            `section-${hash}`
        )
    ) {

        showSection(hash);

    } else {

        showSection("dashboard");

    }
}


/* =========================
   MOBILE MENU
========================= */

if (menuBtn && sidebar) {

    menuBtn.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "open"
            );

        }
    );

}


/* =========================
   LOGOUT
========================= */

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            const confirmed =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmed) {
                return;
            }


            await logoutAdmin();

        }
    );

}


/* =========================
   LOAD ADMIN PROFILE
========================= */

function loadAdminProfile(adminData) {

    const name =
        adminData.name ||
        "Admin";

    const email =
        adminData.email ||
        "";

    const adminId =
        adminData.adminId ||
        "—";

    const role =
        adminData.role ||
        "admin";

    const status =
        adminData.status ||
        "active";


    /* Top profile */

    const topAdminName =
        document.getElementById(
            "topAdminName"
        );

    if (topAdminName) {
        topAdminName.textContent = name;
    }


    /* Welcome */

    const welcomeAdminName =
        document.getElementById(
            "welcomeAdminName"
        );

    if (welcomeAdminName) {
        welcomeAdminName.textContent = name;
    }


    /* Profile name */

    const profileName =
        document.getElementById(
            "profileName"
        );

    if (profileName) {
        profileName.textContent = name;
    }


    const profileNameValue =
        document.getElementById(
            "profileNameValue"
        );

    if (profileNameValue) {
        profileNameValue.textContent = name;
    }


    /* Email */

    const profileEmail =
        document.getElementById(
            "profileEmail"
        );

    if (profileEmail) {
        profileEmail.textContent = email;
    }


    /* Admin ID */

    const profileAdminId =
        document.getElementById(
            "profileAdminId"
        );

    if (profileAdminId) {
        profileAdminId.textContent = adminId;
    }


    /* Role */

    const profileRole =
        document.getElementById(
            "profileRole"
        );

    if (profileRole) {

        profileRole.textContent =
            role.charAt(0).toUpperCase() +
            role.slice(1);

    }


    /* Status */

    const profileStatus =
        document.getElementById(
            "profileStatus"
        );

    if (profileStatus) {

        profileStatus.textContent =
            status.charAt(0).toUpperCase() +
            status.slice(1);

    }


    /* Avatar */

    const firstLetter =
        name
            .trim()
            .charAt(0)
            .toUpperCase() || "A";


    const avatars =
        document.querySelectorAll(
            ".avatar, .profile-avatar"
        );


    avatars.forEach((avatar) => {

        avatar.textContent =
            firstLetter;

    });

}


/* =========================
   START ADMIN PANEL
========================= */

let stopDashboardListeners = null;


protectAdminRoute(
    (adminData) => {

        console.log(
            "Admin authorized:",
            adminData
        );


        // Load admin profile
        loadAdminProfile(
            adminData
        );


        // Load initial section
        loadInitialSection();


        // Start Firebase realtime dashboard
        stopDashboardListeners =
            startDashboardListeners();

    }
);


/* =========================
   CLEANUP
========================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (
            typeof stopDashboardListeners ===
            "function"
        ) {

            stopDashboardListeners();

        }

    }
);
