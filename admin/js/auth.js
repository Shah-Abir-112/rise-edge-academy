import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

export function protectAdminRoute(onAuthorized){
  onAuthStateChanged(auth,async user=>{
    if(!user){redirectToLogin();return;}
    try{
      const snap=await getDoc(doc(db,"users",user.uid));
      if(!snap.exists()){await signOut(auth);redirectToLogin();return;}
      const data=snap.data();
      const role=String(data.role||"").trim().toLowerCase();
      const status=String(data.status||"").trim().toLowerCase();
      if(role!=="admin"||status!=="active"){await signOut(auth);redirectToLogin();return;}
      const adminData={uid:user.uid,email:user.email||"",...data};
      localStorage.setItem("riseEdgeAdmin",JSON.stringify(adminData));
      if(typeof onAuthorized==="function") onAuthorized(adminData);
    }catch(error){console.error("ADMIN AUTH ERROR:",error);await signOut(auth);redirectToLogin();}
  });
}
function redirectToLogin(){window.location.href="../login.html";}
export async function logoutAdmin(){try{await signOut(auth);localStorage.removeItem("riseEdgeAdmin");localStorage.removeItem("riseEdgeUser");window.location.href="../login.html";}catch(e){console.error(e);alert("Logout failed. Please try again.");}}
