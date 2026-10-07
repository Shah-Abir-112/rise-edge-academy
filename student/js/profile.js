import { auth, db } from "../../js/firebase/firestore.js";
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { logout } from "../../js/firebase/auth.js";

const form=document.getElementById("profileForm"), message=document.getElementById("message"), saveBtn=document.getElementById("saveBtn");
const $=id=>document.getElementById(id); let uid=null;
const editable=["name","phone","dateOfBirth","gender","fatherName","motherName","guardianName","guardianPhone","address","emergencyContact","profilePicture","additionalInfo"];
function show(text,ok=false){message.textContent=text;message.style.display="block";message.style.borderColor=ok?"#bbf7d0":"#fecaca";message.style.background=ok?"#f0fdf4":"#fef2f2";message.style.color=ok?"#166534":"#991b1b";}
function val(v){return v==null?"":v;}
function dateText(v){if(!v)return "—";if(v?.seconds)return new Date(v.seconds*1000).toLocaleDateString();return String(v);}
function fill(p){
 editable.forEach(k=>{if($(k))$(k).value=val(p[k]);});
 $("email").value=p.email||auth.currentUser?.email||""; $("studentId").value=p.studentId||"—";
 $("className").textContent=p.className||p.class||"—"; $("section").textContent=p.section||"—"; $("roll").textContent=p.roll??"—"; $("academicSession").textContent=p.academicSession||"—"; $("applicationId").textContent=p.applicationId||p.admissionId||"—"; $("status").textContent=p.status||"—";
 $("userName").textContent=p.name||p.email||"Student"; $("userAvatar").textContent=(p.name||"S").trim().charAt(0).toUpperCase();
}
async function load(){if(!uid)return;try{const snap=await getDoc(doc(db,"users",uid));if(!snap.exists())throw new Error("Student profile was not found in Firebase.");const p=snap.data();if(String(p.role||"").trim().toLowerCase()!=="student")throw new Error("This account is not registered as a student.");fill(p);}catch(e){show(e.message);}}
form.addEventListener("submit",async e=>{e.preventDefault();if(!uid)return;saveBtn.disabled=true;saveBtn.textContent="Saving...";try{const patch={};editable.forEach(k=>patch[k]=$(k).value.trim());patch.updatedAt=serverTimestamp();await updateDoc(doc(db,"users",uid),patch);show("Profile updated successfully.",true);await load();}catch(e){console.error(e);show("Firebase save failed: "+e.message);}finally{saveBtn.disabled=false;saveBtn.textContent="Save Profile";}});
$("reloadBtn")?.addEventListener("click",load);$("logoutLink")?.addEventListener("click",async e=>{e.preventDefault();await logout();});
onAuthStateChanged(auth,user=>{if(!user){location.href="../../login.html";return;}uid=user.uid;load();});
