import { getSession, logout } from "../../js/firebase/auth.js";
import { Store } from "../../js/firebase/firestore.js";

const s = getSession();
if (!s || s.role !== "admin") location.href = "../login.html";

document.getElementById("userName")?.replaceChildren(document.createTextNode(s?.name || "Admin"));
document.getElementById("logoutLink")?.addEventListener("click", async (e) => { e.preventDefault(); await logout(); });

const students = Store.list("students").filter(x => String(x.status || "active").toLowerCase() === "active");
const teachers = Store.list("teachers").filter(x => String(x.status || "active").toLowerCase() === "active");
const admissions = Store.list("admissions");
const payments = Store.list("fees").filter(x => String(x.status || "").toLowerCase() === "paid");

const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
set("totalStudents", students.length);
set("teachers", teachers.length);
set("pendingAdmissions", admissions.filter(x => String(x.status || "").toLowerCase() === "pending").length);
set("monthlyCollection", `৳ ${payments.reduce((sum, x) => sum + Number(x.amount || 0), 0).toLocaleString()}`);
