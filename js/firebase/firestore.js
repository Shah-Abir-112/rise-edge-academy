import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { firebaseConfig } from "./config.js";
const app=getApps().length?getApp():initializeApp(firebaseConfig);
export const db=getFirestore(app);
export const auth=getAuth(app);
export const collectionMap={
  students:"users", teachers:"users", student_profile:"users", teacher_profile:"users", student_teachers:"users", teacher_students:"users",
  student_classes:"courses", teacher_classes:"courses", student_attendance:"attendance", teacher_attendance:"attendance", student_assignments:"assignments", teacher_assignments:"assignments",
  student_notes:"notes", teacher_notes:"notes", student_messages:"messages", teacher_messages:"messages", student_notices:"notices", teacher_notices:"notices",
  student_results:"results", student_fees:"payments", teacher_payments:"payments", teacher_schedule:"schedule", fees:"payments",
  classes:"courses", attendance:"attendance", notices:"notices", messages:"messages", reports:"reports", activity:"activity", admissions:"admissions", payments:"payments", results:"results",
  salaries:"salaries"
};
function actual(c){return collectionMap[c]||c}
function current(){return auth.currentUser}
function filterItems(name,items){
  const u=current();
  if(name==="students"||name==="teacher_students") return items.filter(x=>String(x.role||"").toLowerCase()==="student");
  if(name==="teachers"||name==="student_teachers") return items.filter(x=>String(x.role||"").toLowerCase()==="teacher");
  if(name==="student_profile"||name==="teacher_profile") return items.filter(x=>x.id===u?.uid);
  if(name.startsWith("student_")) return items.filter(x=>!x.studentUid||x.studentUid===u?.uid||x.uid===u?.uid||x.userId===u?.uid);
  if(name.startsWith("teacher_")) return items.filter(x=>!x.teacherUid||x.teacherUid===u?.uid||x.uid===u?.uid||x.userId===u?.uid);
  return items;
}
export const Store={
 async list(name){const snap=await getDocs(collection(db,actual(name)));return filterItems(name,snap.docs.map(d=>({id:d.id,...d.data()})))},
 async get(name,id){const s=await getDoc(doc(db,actual(name),id));return s.exists()?{id:s.id,...s.data()}:null},
 async add(name,item){const payload={...item,createdAt:item.createdAt||serverTimestamp(),updatedAt:serverTimestamp()};const r=await addDoc(collection(db,actual(name)),payload);return {id:r.id,...item}},
 async update(name,id,patch){await updateDoc(doc(db,actual(name),id),{...patch,updatedAt:serverTimestamp()});return this.get(name,id)},
 async remove(name,id){await deleteDoc(doc(db,actual(name),id));},
 async set(name,items){for(const x of items){if(x.id) await updateDoc(doc(db,actual(name),x.id),x);else await this.add(name,x)}return this.list(name)},
 read(){return {}}, write(x){return x}
};
export async function getCollection(name){return Store.list(name)}
export { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp };
