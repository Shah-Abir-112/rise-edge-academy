import { protectAdminRoute, logoutAdmin } from "./auth.js";
import { startDashboardListeners } from "./dashboard.js";

const navItems = document.querySelectorAll("[data-section]");
const sections = document.querySelectorAll(".page-section");

const pageTitle = document.getElementById("pageTitle");
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");

const overlay = document.getElementById("mobileOverlay");

const titles = {
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

function showSection(name) {

    sections.forEach(section => {
        section.classList.toggle(
            "active",
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
        pageTitle.textContent = titles[name] || "Dashboard";
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

        const name = item.dataset.section;

        /*
         * Students is a separate management page.
         * Open it instead of showing the placeholder section.
         */
        if (name === "students") {

            event.preventDefault();

            window.location.href = "pages/students.html";

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

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutAdmin);
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
   ADMIN AUTH
========================= */

protectAdminRoute(admin => {

    const adminName =
        admin.name ||
        "Admin";

    const adminEmail =
        admin.email ||
        "";

    const adminId =
        admin.adminId ||
        "—";

    const adminStatus =
        admin.status ||
        "Active";


    /* Top profile */

    const topAdminName =
        document.getElementById("topAdminName");

    if (topAdminName) {
        topAdminName.textContent = adminName;
    }


    /* Welcome */

    const welcomeAdminName =
        document.getElementById("welcomeAdminName");

    if (welcomeAdminName) {
        welcomeAdminName.textContent = adminName;
    }


    /* Profile */

    const profileName =
        document.getElementById("profileName");

    if (profileName) {
        profileName.textContent = adminName;
    }

    const profileNameValue =
        document.getElementById("profileNameValue");

    if (profileNameValue) {
        profileNameValue.textContent = adminName;
    }

    const profileEmail =
        document.getElementById("profileEmail");

    if (profileEmail) {
        profileEmail.textContent = adminEmail;
    }

    const profileAdminId =
        document.getElementById("profileAdminId");

    if (profileAdminId) {
        profileAdminId.textContent = adminId;
    }

    const profileStatus =
        document.getElementById("profileStatus");

    if (profileStatus) {
        profileStatus.textContent = adminStatus;
    }


    /* Profile avatar */

    const avatar =
        document.getElementById("profileAvatar");

    if (avatar) {
        avatar.textContent =
            adminName
                .trim()
                .charAt(0)
                .toUpperCase() || "A";
    }


    const miniAvatar =
        document.querySelector(
            ".admin-mini-profile .avatar"
        );

    if (miniAvatar) {
        miniAvatar.textContent =
            adminName
                .trim()
                .charAt(0)
                .toUpperCase() || "A";
    }


    /* Start real-time dashboard */

    startDashboardListeners();


    /* Restore current section from URL */

    const hash =
        location.hash.replace("#", "");

    if (hash && titles[hash]) {
        showSection(hash);
    } else {
        showSection("dashboard");
    }

});
