import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { collection, getDocs, getDoc, doc, updateDoc, addDoc, query, orderBy, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
let applications = [];
let selected = null;
let pendingAction = null;
let adminUser = null;

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const statusOf = value => String(value || "pending").trim().toLowerCase();
const nameOf = a => a.applicantName || a.name || a.studentName || "Unknown Applicant";
const classOf = a => a.desiredClass || a.className || a.class || a.course || "—";
const guardianOf = a => a.guardianName || a.guardian || a.fatherName || a.motherName || "—";
const emailOf = a => a.email || "";
const phoneOf = a => a.guardianPhone || a.phone || a.studentPhone || "";
const idOf = a => a.applicationId || a.id;
function formatDate(v){ if(!v)return "—"; if(v?.seconds)return new Date(v.seconds*1000).toLocaleDateString(); const d=new Date(v); return Number.isNaN(d.getTime())?"—":d.toLocaleDateString(); }
function displayStatus(s){const n=statusOf(s);return n==="new"||n==="pending review"?"Pending":n.replace(/\b\w/g,m=>m.toUpperCase());}
function statusClass(s){const n=statusOf(s);return ["pending","new","correction","approved","rejected"].includes(n)?n:"default";}

async function verifyAdmin(user){
  const snap=await getDoc(doc(db,"users",user.uid));
  if(!snap.exists()) throw new Error("Admin Firestore profile not found.");
  const data=snap.data();
  if(String(data.role||"").trim().toLowerCase()!=="admin" || String(data.status||"").trim().toLowerCase()!=="active") throw new Error("This account is not an active admin.");
  adminUser={uid:user.uid,email:user.email||"",...data};
  $("userName")?.replaceChildren(document.createTextNode(data.name||user.email||"Admin"));
  const av=$("userAvatar"); if(av) av.textContent=(data.name||"A").trim().charAt(0).toUpperCase()||"A";
}

onAuthStateChanged(auth, async user=>{
  if(!user){location.href="../../login.html";return;}
  try{await verifyAdmin(user); await loadApplications();}catch(e){showError(e.message);}
});

async function loadApplications(){
  setLoading(true);
  try{
    let snap;
    try{snap=await getDocs(query(collection(db,"admissions"),orderBy("createdAt","desc")));}
    catch{snap=await getDocs(collection(db,"admissions"));}
    applications=snap.docs.map(d=>({id:d.id,...d.data()}));
    populateClassFilter(); updateStats(); render(); setLoading(false);
  }catch(e){setLoading(false);showError(e.message||"Unable to load admissions.");}
}
function setLoading(on){$("loadingState")?.classList.toggle("hidden",!on); if(on){$("tableContainer")?.classList.add("hidden");$("emptyState")?.classList.add("hidden");$("errorState")?.classList.add("hidden");}}
function showError(msg){$("loadingState")?.classList.add("hidden");$("tableContainer")?.classList.add("hidden");$("emptyState")?.classList.add("hidden");$("errorState")?.classList.remove("hidden");$("errorMessage").textContent=msg;}
function populateClassFilter(){const el=$("classFilter");if(!el)return;const current=el.value;const values=[...new Set(applications.map(classOf).filter(x=>x&&x!=="—"))].sort();el.innerHTML='<option value="all">All Classes</option>'+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");if(values.includes(current))el.value=current;}
function updateStats(){const c={pending:0,correction:0,approved:0,rejected:0};for(const a of applications){const s=statusOf(a.status);if(s==="new"||s==="pending"||s==="pending review")c.pending++;else if(s==="correction"||s==="correction required")c.correction++;else if(s==="approved")c.approved++;else if(s==="rejected")c.rejected++;}$("pendingCount").textContent=c.pending;$("correctionCount").textContent=c.correction;$("approvedCount").textContent=c.approved;$("rejectedCount").textContent=c.rejected;}
function filtered(){const q=($("searchInput")?.value||"").trim().toLowerCase(), sf=$("statusFilter")?.value||"all", cf=$("classFilter")?.value||"all";return applications.filter(a=>{const s=statusOf(a.status), text=[nameOf(a),emailOf(a),phoneOf(a),idOf(a)].join(" ").toLowerCase();let sm=sf==="all"||(sf==="pending"?(s==="new"||s==="pending"||s==="pending review"):sf==="correction"?(s==="correction"||s==="correction required"):s===sf);return (!q||text.includes(q))&&sm&&(cf==="all"||classOf(a)===cf);});}
function render(){const list=filtered();$("resultText").textContent=`${list.length} application${list.length===1?"":"s"} found`;if(!list.length){$("tableContainer")?.classList.add("hidden");$("emptyState")?.classList.remove("hidden");return;}$("emptyState")?.classList.add("hidden");$("tableContainer")?.classList.remove("hidden");$("applicationsBody").innerHTML=list.map(a=>`<tr><td><div class="applicant-cell"><div class="applicant-avatar">${esc(nameOf(a).charAt(0).toUpperCase())}</div><div><div class="applicant-name">${esc(nameOf(a))}</div><div class="applicant-email">${esc(emailOf(a))}</div></div></div></td><td><span class="application-id">${esc(idOf(a))}</span></td><td>${esc(classOf(a))}</td><td>${esc(guardianOf(a))}</td><td>${esc(formatDate(a.createdAt||a.applicationDate))}</td><td><span class="status status-${statusClass(a.status)}">${esc(displayStatus(a.status))}</span></td><td><button type="button" class="small-btn view-btn" data-id="${esc(a.id)}">View</button></td></tr>`).join("");document.querySelectorAll(".view-btn").forEach(b=>b.addEventListener("click",()=>openDetails(b.dataset.id)));}
function openDetails(id){selected=applications.find(a=>a.id===id);if(!selected)return;$("modalApplicantName").textContent=nameOf(selected);const fields=[['Application ID',idOf(selected)],['Status',displayStatus(selected.status)],['Applicant Name',nameOf(selected)],['Date of Birth',selected.dateOfBirth||selected.dob],['Guardian Name',guardianOf(selected)],['Guardian Phone',phoneOf(selected)],['Email',emailOf(selected)],['Desired Class',classOf(selected)],['Desired Section',selected.desiredSection||selected.section],['Payment Status',selected.paymentStatus],['Application Date',formatDate(selected.createdAt||selected.applicationDate)],['Address',selected.address],['Admin Note',selected.adminNote]];$("applicationDetails").innerHTML='<div class="detail-grid">'+fields.map(([l,v])=>`<div class="detail-item ${["Address","Admin Note"].includes(l)?"full":""}"><span class="detail-label">${esc(l)}</span><div class="detail-value">${esc(v||"—")}</div></div>`).join("")+'</div>';const locked=["approved","rejected","cancelled","released"].includes(statusOf(selected.status));$("approveBtn").disabled=locked;$("rejectBtn").disabled=locked;$("correctionBtn").disabled=locked;$("detailsModal").classList.remove("hidden");}
function closeDetails(){$("detailsModal")?.classList.add("hidden");selected=null;}
function ask(action){if(!selected)return;pendingAction=action;const cfg={approve:["Approve Admission?","This will approve the application and activate the student's account.","Approve"],reject:["Reject Admission?","The application will be marked as rejected.","Reject"],correction:["Request Correction?","The applicant will be asked to correct the submitted information.","Request Correction"]}[action];$("confirmTitle").textContent=cfg[0];$("confirmText").textContent=cfg[1];$("confirmActionBtn").textContent=cfg[2];$("actionNote").value="";$("confirmModal").classList.remove("hidden");}
async function confirmAction(){if(!pendingAction||!selected)return;const btn=$("confirmActionBtn");btn.disabled=true;try{if(pendingAction==="approve")await approve(selected);else await updateAdmission(selected,pendingAction==="reject"?"rejected":"correction",$("actionNote").value.trim());$("confirmModal").classList.add("hidden");closeDetails();await loadApplications();toast(pendingAction==="approve"?"Admission approved successfully.":"Admission status updated successfully.");}catch(e){toast(e.message||"Action failed.");}finally{btn.disabled=false;pendingAction=null;}}
async function findUser(a){const uid=a.uid||a.userUid||a.userId||a.authUid||a.studentUid;if(uid){const s=await getDoc(doc(db,"users",uid));if(s.exists())return {uid:s.id,data:s.data()};}const email=emailOf(a).trim().toLowerCase();if(!email)return null;const snap=await getDocs(collection(db,"users"));const matches=snap.docs.filter(d=>String(d.data().email||"").trim().toLowerCase()===email);const target=matches.find(d=>String(d.data().role||"").trim().toLowerCase()==="student")||matches[0];return target?{uid:target.id,data:target.data()}:null;}
function numId(v){const m=String(v||"").match(/(?:REA[-\s]*)?(\d+)/i);return m&&Number(m[1])>=1001?Number(m[1]):null;}
async function nextStudentId(){const ref=doc(db,"counters","studentId");const users=await getDocs(collection(db,"users"));let observed=1000;users.forEach(d=>{const n=numId(d.data().studentId);if(n)observed=Math.max(observed,n);});return runTransaction(db,async tx=>{const snap=await tx.get(ref);const stored=snap.exists()?Number(snap.data().lastId)||1000:1000;const next=Math.max(stored,observed)+1;tx.set(ref,{lastId:next,updatedAt:serverTimestamp()},{merge:true});return `REA-${next}`;});}
async function approve(a){if(statusOf(a.status)==="approved")throw new Error("This admission is already approved.");const target=await findUser(a);if(!target)throw new Error("Student account not found. The student must register first using the same email address.");const d=target.data;const studentId=numId(d.studentId)?`REA-${numId(d.studentId)}`:await nextStudentId();const desired=classOf(a)==="—"?(d.className||d.class||""):classOf(a);await updateDoc(doc(db,"users",target.uid),{role:"student",studentId,name:nameOf(a),email:emailOf(a)||d.email||"",profilePicture:a.profilePhoto||a.profilePicture||d.profilePicture||"",dateOfBirth:a.dateOfBirth||a.dob||d.dateOfBirth||d.dob||"",fatherName:a.fatherName||d.fatherName||"",motherName:a.motherName||d.motherName||"",guardianName:a.guardianName||d.guardianName||"",guardianPhone:a.guardianPhone||a.phone||d.guardianPhone||d.phone||"",phone:a.studentPhone||d.phone||"",address:a.address||d.address||"",class:desired,className:desired,section:a.desiredSection||a.section||d.section||"",roll:a.roll||d.roll||"",academicSession:a.academicSession||d.academicSession||String(new Date().getFullYear()),admissionId:a.id,applicationId:a.applicationId||a.id,admissionDate:serverTimestamp(),status:"active",feeStatus:d.feeStatus||"unpaid",assignedTeachers:d.assignedTeachers||[],updatedAt:serverTimestamp(),updatedBy:adminUser.uid});await updateDoc(doc(db,"admissions",a.id),{status:"approved",studentId,studentUid:target.uid,approvedAt:serverTimestamp(),approvedBy:adminUser.uid,adminNote:$("actionNote").value.trim()||a.adminNote||"",updatedAt:serverTimestamp(),updatedBy:adminUser.uid});try{await addDoc(collection(db,"activity"),{action:"Admission Approved",targetId:a.id,studentId,studentUid:target.uid,applicantName:nameOf(a),performedBy:adminUser.uid,createdAt:serverTimestamp()});}catch(e){console.warn("Activity log skipped",e);}}
async function updateAdmission(a,status,note){const p={status,updatedAt:serverTimestamp(),updatedBy:adminUser.uid};if(note)p.adminNote=note;if(status==="rejected"){p.rejectedAt=serverTimestamp();p.rejectedBy=adminUser.uid;}if(status==="correction"){p.correctionRequestedAt=serverTimestamp();p.correctionRequestedBy=adminUser.uid;}await updateDoc(doc(db,"admissions",a.id),p);try{await addDoc(collection(db,"activity"),{action:`Admission ${status}`,targetId:a.id,applicantName:nameOf(a),performedBy:adminUser.uid,createdAt:serverTimestamp(),note:note||""});}catch(e){console.warn("Activity log skipped",e);}}
function toast(message){const t=$("toast");t.textContent=message;t.classList.remove("hidden");clearTimeout(window.__riseToast);window.__riseToast=setTimeout(()=>t.classList.add("hidden"),2800);}

$("refreshBtn")?.addEventListener("click",loadApplications);$("retryBtn")?.addEventListener("click",loadApplications);$("searchInput")?.addEventListener("input",render);$("statusFilter")?.addEventListener("change",render);$("classFilter")?.addEventListener("change",render);$("closeDetailsBtn")?.addEventListener("click",closeDetails);$("approveBtn")?.addEventListener("click",()=>ask("approve"));$("rejectBtn")?.addEventListener("click",()=>ask("reject"));$("correctionBtn")?.addEventListener("click",()=>ask("correction"));$("cancelConfirmBtn")?.addEventListener("click",()=>$("confirmModal").classList.add("hidden"));$("cancelConfirmBtn2")?.addEventListener("click",()=>$("confirmModal").classList.add("hidden"));$("confirmActionBtn")?.addEventListener("click",confirmAction);
