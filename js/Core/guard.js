import {getSession} from "../firebase/auth.js";
export function guard(expected){const s=getSession();if(!s){location.href="../login.html";return null}if(expected&&s.role!==expected){location.href="../login.html";return null}return s}
