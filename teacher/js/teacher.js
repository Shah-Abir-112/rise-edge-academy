import {Store} from "../..//js/firebase/firestore.js"; import {getSession,logout} from "../../js/firebase/auth.js";
const s=getSession();if(!s){location.href="../login.html"}document.getElementById("userName")?.replaceChildren(document.createTextNode(s?.name||"Teacher"));document.getElementById("logoutLink")?.addEventListener("click",logout);
for(const [k,v] of [["myClasses",3],["students",24],["assignments",5],["messages",2]]){const e=document.getElementById(k);if(e)e.textContent=v}
