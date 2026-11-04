import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2w4_PL6429Kvw4M9z7ajN77shV7Kk00s",
  authDomain: "casa-di-ferro-af925.firebaseapp.com",
  projectId: "casa-di-ferro-af925",
  storageBucket: "casa-di-ferro-af925.firebasestorage.app",
  messagingSenderId: "890520384947",
  appId: "1:890520384947:web:b37ec0f6f1fe2f319447c6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
