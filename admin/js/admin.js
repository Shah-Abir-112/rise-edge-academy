import { protectAdminRoute, logoutAdmin } from "./auth.js";
import { startDashboardListeners } from "./dashboard.js";
const navItems=document.querySelectorAll("[data-section]");
const sections=document.querySelectorAll(".page-section");
const pageTitle=document.getElementById("pageTitle");
const sidebar=document.getElementById("sidebar");
const overlay=document.getElementById("mobileOverlay");
const titles={dashboard:"Dashboard",profile:"My Profile",teachers:"Teachers",admissions:"Admissions",courses:"Courses & Classes",assignments:"Assignments",results:"Results",attendance:"Attendance",tuition:"Tuition",salary:"Salary",notices:"Notices",messages:"Messages",settings:"Settings"};
function showSection(name){sections.forEach(s=>s.classList.toggle("active-section",s.id===name));navItems.forEach(n=>n.classList.toggle("active",n.dataset.section===name));pageTitle.textContent=titles[name]||"Dashboard";sidebar.classList.remove("open");overlay.classList.remove("show")}
navItems.forEach(item=>item.addEventListener("click",e=>{const name=item.dataset.section;if(name==="students")return; e.preventDefault();showSection(name);history.replaceState(null,"",`#${name}`)}));
document.getElementById("logoutBtn").addEventListener("click",logoutAdmin);
document.getElementById("menuBtn").addEventListener("click",()=>{sidebar.classList.add("open");overlay.classList.add("show")});overlay.addEventListener("click",()=>{sidebar.classList.remove("open");overlay.classList.remove("show")});
protectAdminRoute(admin=>{document.getElementById("adminName").textContent=admin.name||"Admin";document.getElementById("adminEmail").textContent=admin.email||"";document.getElementById("profileName").textContent=admin.name||"—";document.getElementById("profileEmail").textContent=admin.email||"—";document.getElementById("profileAdminId").textContent=admin.adminId||"—";document.getElementById("profileStatus").textContent=admin.status||"—";startDashboardListeners();const hash=location.hash.replace("#","");if(hash&&titles[hash])showSection(hash)});
