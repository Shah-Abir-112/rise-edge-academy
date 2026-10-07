import { Store } from "../../js/firebase/firestore.js";
import { getSession, logout } from "../../js/firebase/auth.js";
const session=getSession();
if(!session){location.href="../login.html";throw new Error("Not authenticated");}
document.getElementById("userName")?.replaceChildren(document.createTextNode(session.name||session.email||"User"));
document.getElementById("logoutLink")?.addEventListener("click",e=>{e.preventDefault();logout();});

const collection='notes';
const rows=document.getElementById("rows"),search=document.getElementById("search"),filter=document.getElementById("filter");
let data=[];
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function date(v){if(!v)return "—"; if(v.seconds)return new Date(v.seconds*1000).toLocaleDateString(); return new Date(v).toLocaleDateString();}
function status(v){const s=String(v||"active");return `<span class="badge">${esc(s)}</span>`}
function render(){const q=(search?.value||"").toLowerCase(), f=(filter?.value||"all").toLowerCase();let a=data.filter(x=>JSON.stringify(x).toLowerCase().includes(q));if(f!=="all")a=a.filter(x=>String(x.status||"").toLowerCase()===f);rows.innerHTML=a.map(x=>`<tr><td><b>${esc(x.name||x.title||x.subject||x.email||x.id)}</b></td><td>${esc(x.details||x.description||x.email||x.className||x.class||"—")}</td><td>${status(x.status)}</td><td>${date(x.createdAt||x.updatedAt)}</td>$<td><button class=\"small-btn danger\" data-id=\"${x.id}\">Delete</button></td></tr>`).join("")||`<tr><td colspan="5" class="muted">No Firebase records found.</td></tr>`;document.querySelectorAll("[data-id]").forEach(b=>b.onclick=async()=>{if(confirm("Delete this record?")){await Store.remove(collection,b.dataset.id);await load();}});}
async function load(){try{data=await Store.list(collection);render();}catch(e){console.error(e);rows.innerHTML=`<tr><td colspan="5">Firebase error: ${esc(e.message)}</td></tr>`;}}
search?.addEventListener("input",render);filter?.addEventListener("change",render);
document.getElementById("addBtn")?.addEventListener("click",async()=>{const name=prompt("Enter name/title");if(name){await Store.add(collection,{name,status:"active",details:"Created from portal"});await load();}});
document.getElementById("primaryAction")?.addEventListener("click",async()=>{const name=prompt("Enter name");if(name){await Store.add(collection,{name,status:"active"});await load();}});
load();
