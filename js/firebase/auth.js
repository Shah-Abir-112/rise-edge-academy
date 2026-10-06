import { firebaseConfig } from "./config.js";
const DEMO_KEY="rea_demo_session";
function demoLogin(email, role){localStorage.setItem(DEMO_KEY,JSON.stringify({email,role,name:email.split("@")[0]}));const target=role==="admin"?"admin/index.html":role==="teacher"?"teacher/index.html":"student/index.html";location.href=target}
const lf=document.getElementById("loginForm");
if(lf) lf.addEventListener("submit",e=>{e.preventDefault();demoLogin(document.getElementById("email").value,document.getElementById("portal").value)});
const rf=document.getElementById("registerForm");
if(rf) rf.addEventListener("submit",e=>{e.preventDefault();const name=document.getElementById("name").value.trim(),email=document.getElementById("email").value.trim(),role=document.getElementById("role").value;localStorage.setItem("rea_registered_"+email,JSON.stringify({name,email,role}));alert("Registration saved locally. Connect Firebase for real account creation.");location.href="login.html"});
export function getSession(){try{return JSON.parse(localStorage.getItem(DEMO_KEY)||"null")}catch{return null}}
export function logout(){localStorage.removeItem(DEMO_KEY);location.href="../login.html"}
