export const $=(s,p=document)=>p.querySelector(s);
export const $$=(s,p=document)=>[...p.querySelectorAll(s)];
export function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",""":"&quot;","'":"&#039;"}[c]))}
export function fmtDate(v){if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
export function statusBadge(s){const v=String(s||"pending").toLowerCase();const cls=v.includes("approve")||v==="active"||v==="paid"?"green":v.includes("reject")||v==="absent"?"red":v.includes("correction")||v==="pending"?"orange":"blue";return `<span class="badge ${cls}">${esc(s||"Pending")}</span>`}
export function toast(msg){let t=document.getElementById("toast");if(!t){t=document.createElement("div");t.id="toast";t.className="toast";document.body.appendChild(t)}t.textContent=msg;setTimeout(()=>t.remove(),2200)}
