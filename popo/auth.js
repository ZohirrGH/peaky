import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const loginBtn = document.getElementById("loginBtn");
const errorMsg = document.getElementById("errorMsg");

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("emailInput").value.trim();
    const pass  = document.getElementById("passInput").value.trim();

    if (!email || !pass) {
      errorMsg.style.display = "block";
      errorMsg.textContent = "❌ Please fill all fields";
      return;
    }

    try {
      loginBtn.textContent = "Loading...";
      loginBtn.disabled = true;
      await signInWithEmailAndPassword(auth, email, pass);
      // ✅ انتظر شوي قبل الـ redirect عشان Firebase يسجل الـ session
      setTimeout(() => {
        window.location.href = "index.html";
      }, 500);
    } catch (err) {
      errorMsg.style.display = "block";
      errorMsg.textContent = "❌ Email or Password incorrect";
      loginBtn.textContent = "ENTER";
      loginBtn.disabled = false;
    }
  });
}

export function checkAuth() {
  return new Promise((resolve, reject) => {
    // ✅ نضيف loading overlay إذا ما كان موجود
    let overlay = document.getElementById("authLoadingOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "authLoadingOverlay";
      overlay.style.cssText = `
        position: fixed; inset: 0;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        flex-direction: column;
        gap: 16px;
      `;
      overlay.innerHTML = `
        <img src="images/logo.png" style="width:70px; animation: pulse 1.5s infinite;">
        <p style="color:#d98c3a; font-family:'IM Fell English SC',serif; font-size:16px; letter-spacing:0.1em;">Loading...</p>
        <style>
          @keyframes pulse {
            0%,100% { opacity:1; transform:scale(1); }
            50% { opacity:0.6; transform:scale(0.95); }
          }
        </style>
      `;
      document.body.appendChild(overlay);
    }

    // ✅ timeout حماية — لو Firebase ما رد خلال 10 ثواني
    const timeout = setTimeout(() => {
      window.location.href = "login.html";
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      clearTimeout(timeout);
      if (!user) {
        window.location.href = "login.html";
      } else {
        // ✅ أخفي الـ overlay بعد ما تأكدنا من الـ auth
        if (overlay) overlay.remove();
        resolve(user);
      }
    }, (error) => {
      clearTimeout(timeout);
      console.error("Auth error:", error);
      window.location.href = "login.html";
    });
  });
}

export function logout() {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
}
