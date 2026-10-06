import { collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
let started=false;
export function startDashboardListeners(){if(started)return;started=true;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
  onSnapshot(query(collection(db,"users"),where("role","==","student"),where("status","==","active")),s=>{set("totalStudents",s.size);set("overviewStudents",s.size)});
  onSnapshot(query(collection(db,"users"),where("role","==","teacher"),where("status","==","active")),s=>{set("totalTeachers",s.size);set("overviewTeachers",s.size)});
  onSnapshot(query(collection(db,"users"),where("status","==","pending")),s=>{set("pendingRequests",s.size);set("overviewPending",s.size);set("pendingActions",s.size?`${s.size} account request(s) need admin review.`:"No pending actions.")});
  const month=new Date().toISOString().slice(0,7);
  onSnapshot(query(collection(db,"payments"),where("status","==","paid"),where("month","==",month)),s=>{let total=0;s.forEach(d=>total+=Number(d.data().amount||0));const value=`৳${total.toLocaleString()}`;set("monthlyCollection",value);set("overviewCollection",value)});
}
