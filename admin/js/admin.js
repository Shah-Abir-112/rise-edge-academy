import {
    protectAdminRoute,
    logoutAdmin
} from "./auth.js";

import {
    startDashboardListeners
} from "./dashboard.js";


const navItems =
    document.querySelectorAll("[data-section]");

const sections =
    document.querySelectorAll(".page-section");

const pageTitle =
    document.getElementById("pageTitle");

const sidebar =
    document.getElementById("sidebar");

const menuBtn =
    document.getElementById("menuBtn");

const overlay =
    document.getElementById("mobileOverlay");


const titles = {

    dashboard: "Dashboard",
    students: "Students",
    admissions: "Admissions",
    teachers: "Teachers",
    classes: "Classes & Routine",
    attendance: "Attendance",
    materials: "Study Materials",
    exams: "Exams & Results",
    progress: "Student Progress",
    fees: "Fees & Finance",
    salary: "Teacher Salary",
    messages: "Messages",
    notices: "Notices",
    notifications: "Notifications",
    reports: "Reports & Analytics",
    admins: "Admin Management",
    settings: "Academy Settings",
    security: "Activity & Security",
    profile: "My Profile"

};


/* =========================
   SECTION CONTROL
========================= */

function showSection(name) {

    sections.forEach(section => {

        section.classList.toggle(
            "active-section",
            section.id === `section-${name}`
        );

    });


    navItems.forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.section === name
        );

    });


    if (pageTitle) {

        pageTitle.textContent =
            titles[name] || "Dashboard";

    }


    closeMobileSidebar();

}


/* =========================
   MOBILE SIDEBAR
========================= */

function openMobileSidebar() {

    if (sidebar) {
        sidebar.classList.add("open");
    }

    if (overlay) {
        overlay.classList.add("show");
    }

}


function closeMobileSidebar() {

    if (sidebar) {
        sidebar.classList.remove("open");
    }

    if (overlay) {
        overlay.classList.remove("show");
    }

}


/* =========================
   NAVIGATION
========================= */

navItems.forEach(item => {

    item.addEventListener("click", event => {

        const name =
            item.dataset.section;


        /*
         * Students already has
         * a working management page.
         */

        if (name === "students") {

            event.preventDefault();

            window.location.href =
                "./pages/students.html";

            return;

        }


        event.preventDefault();


        showSection(name);


        history.replaceState(
            null,
            "",
            `#${name}`
        );

    });

});


/* =========================
   LOGOUT
========================= */

const logoutBtn =
    document.getElementById("logoutBtn");


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        logoutAdmin
    );

}


/* =========================
   MOBILE MENU
========================= */

if (menuBtn) {

    menuBtn.addEventListener(
        "click",
        openMobileSidebar
    );

}


if (overlay) {

    overlay.addEventListener(
        "click",
        closeMobileSidebar
    );

}


/* =========================
   ADMIN AUTHORIZATION
========================= */

protectAdminRoute(admin => {


    const adminName =
        admin.name || "Admin";


    const adminEmail =
        admin.email || "";


    const adminId =
        admin.adminId || "—";


    const adminStatus =
        admin.status || "Active";


    /* Top name */

    const topAdminName =
        document.getElementById(
            "topAdminName"
        );


    if (topAdminName) {

        topAdminName.textContent =
            adminName;

    }


    /* Top avatar */

    const topAvatar =
        document.getElementById(
            "topAdminAvatar"
        );


    if (topAvatar) {

        topAvatar.textContent =
            adminName
                .trim()
                .charAt(0)
                .toUpperCase() || "A";

    }


    /* Welcome */

    const welcomeName =
        document.getElementById(
            "welcomeAdminName"
        );


    if (welcomeName) {

        welcomeName.textContent =
            adminName;

    }


    /* Profile */

    const profileName =
        document.getElementById(
            "profileName"
        );


    if (profileName) {

        profileName.textContent =
            adminName;

    }


    const profileNameValue =
        document.getElementById(
            "profileNameValue"
        );


    if (profileNameValue) {

        profileNameValue.textContent =
            adminName;

    }


    const profileEmail =
        document.getElementById(
            "profileEmail"
        );


    if (profileEmail) {

        profileEmail.textContent =
            adminEmail;

    }


    const profileAdminId =
        document.getElementById(
            "profileAdminId"
        );


    if (profileAdminId) {

        profileAdminId.textContent =
            adminId;

    }


    const profileStatus =
        document.getElementById(
            "profileStatus"
        );


    if (profileStatus) {

        profileStatus.textContent =
            adminStatus;

    }


    /* Profile avatar */

    const profileAvatar =
        document.getElementById(
            "profileAvatar"
        );


    if (profileAvatar) {

        profileAvatar.textContent =
            adminName
                .trim()
                .charAt(0)
                .toUpperCase() || "A";

    }


    /* Start dashboard */

    startDashboardListeners();


    /* Restore section */

    const hash =
        location.hash.replace("#", "");


    if (
        hash &&
        titles[hash]
    ) {

        if (hash === "students") {

            window.location.href =
                "./pages/students.html";

            return;

        }


        showSection(hash);

    } else {

        showSection("dashboard");

    }

});
