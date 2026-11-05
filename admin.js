import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ===== CHECK ADMIN =====
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists() || snap.data().role !== "admin") {
    alert("❌ Access Denied");
    window.location.href = "index.html";
    return;
  }
  loadUsers();
  loadProducts();
  loadStats();
});

// ===== TABS =====
window.showTab = function(tab, event) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  if (event && event.target) event.target.classList.add("active");
};

// ===== LOAD STATS =====
async function loadStats() {
  const usersSnap = await getDocs(collection(db, "users"));
  document.getElementById("statUsers").textContent = usersSnap.size;

  let invoiceCount = 0;
  for (const u of usersSnap.docs) {
    const inv = await getDocs(collection(db, "users", u.id, "invoices"));
    invoiceCount += inv.size;
  }
  document.getElementById("statInvoices").textContent = invoiceCount;

  const itemsSnap = await getDocs(collection(db, "items"));
  document.getElementById("statProducts").textContent = itemsSnap.size || "—";
}

// ===== LOAD USERS =====
async function loadUsers() {
  const tbody = document.getElementById("usersTableBody");
  tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;color:#666;'>Loading...</td></tr>";
  const snap = await getDocs(collection(db, "users"));
  tbody.innerHTML = "";

  if (snap.empty) {
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;color:#666;'>No users yet</td></tr>";
    return;
  }

  snap.forEach(d => {
    const u = d.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.email || "—"}</td>
      <td><span class="role-badge role-${u.role}">${u.role}</span></td>
      <td><span class="points-badge">⭐ ${u.points || 0}</span></td>
      <td>${u.invoiceCount || 0}</td>
      <td>
        <button class="action-btn btn-points" onclick="editPoints('${d.id}', ${u.points || 0})">⭐ Points</button>
        <button class="action-btn btn-delete" onclick="deleteUser('${d.id}')">🗑 Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== EDIT POINTS =====
window.editPoints = async function(uid, current) {
  const val = prompt(`Current points: ${current}\nEnter new points:`, current);
  if (val === null || isNaN(val)) return;
  await updateDoc(doc(db, "users", uid), { points: parseInt(val) });
  loadUsers();
};

// ===== DELETE USER =====
window.deleteUser = async function(uid) {
  if (!confirm("Delete this user?")) return;
  await deleteDoc(doc(db, "users", uid));
  loadUsers();
};

// ===== ADD USER =====
document.getElementById("addUserBtn").addEventListener("click", async () => {
  const email  = document.getElementById("newEmail").value.trim();
  const pass   = document.getElementById("newPass").value.trim();
  const points = parseInt(document.getElementById("newPoints").value) || 0;
  const role   = document.getElementById("newRole").value;
  const addSuccess = document.getElementById("addSuccess");
  const addError   = document.getElementById("addError");

  if (!email || !pass) { addError.style.display="block"; addError.textContent="❌ Fill all fields"; return; }

  try {
    const res = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyC2w4_PL6429Kvw4M9z7ajN77shV7Kk00s", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, returnSecureToken: true })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    await setDoc(doc(db, "users", data.localId), {
      email, role, points, invoiceCount: 0, createdAt: new Date().toISOString()
    });

    addSuccess.style.display = "block";
    addError.style.display   = "none";
    document.getElementById("newEmail").value  = "";
    document.getElementById("newPass").value   = "";
    document.getElementById("newPoints").value = "0";
    setTimeout(() => addSuccess.style.display = "none", 3000);
    loadUsers();
    loadStats();
  } catch(e) {
    addError.style.display = "block";
    addError.textContent   = "❌ " + e.message;
  }
});

// ===== DEFAULT ITEMS =====
const defaultItems = [
  {name:"PACK FLEECA",price:51500,img:"images/pack_fleeca.png",cat:"heist",status:"green"},
  {name:"Bag",price:5750,img:"images/bag.png",cat:"heist",status:"green"},
  {name:"Electric Cutter",price:3450,img:"images/electric_cutter.png",cat:"heist",status:"green"},
  {name:"X Circuit Tester",price:3450,img:"images/circuit.png",cat:"heist",status:"green"},
  {name:"Device",price:3450,img:"images/device.png",cat:"heist",status:"green"},
  {name:"MXC Key",price:3450,img:"images/mxc_key.png",cat:"heist",status:"green"},
  {name:"Fingerprint Tape",price:5175,img:"images/fingerprint Tape.png",cat:"heist",status:"green"},
  {name:"blaine county crack device",price:70000,img:"images/bccd.png",cat:"heist",status:"green"},
  {name:"humane labs keycard",price:55000,img:"images/labo.png",cat:"heist",status:"green"},
  {name:"fleca card device",price:20000,img:"images/fcd.png",cat:"heist",status:"green"},
  {name:"Laptop",price:5750,img:"images/laptop.png",cat:"heist",status:"green"},
  {name:"X Laptop",price:4600,img:"images/xlaptop.png",cat:"heist",status:"green"},
  {name:"Thermit",price:5750,img:"images/thermite.png",cat:"heist",status:"green"},
  {name:"Pistol MK2",price:95000,img:"images/pistol_mk2.png",cat:"weapon",status:"orange"},
  {name:"Combat Pistol",price:100000,img:"images/combat_pistol.png",cat:"weapon",status:"green"},
  {name:"DP9 Pistol",price:95000,img:"images/dp9.png",cat:"weapon",status:"red"},
  {name:"Browning",price:95000,img:"images/browning.png",cat:"weapon",status:"red"},
  {name:"Glock-18C",price:95000,img:"images/glock_18c.png",cat:"weapon",status:"green"},
  {name:"Micro SMG",price:110000,img:"images/Micro_SMG.png",cat:"weapon",status:"green"},
  {name:"Mini SMG",price:90000,img:"images/Mini_SMG.png",cat:"weapon",status:"green"},
  {name:"Combat PDW",price:126000,img:"images/Combat PDW.png",cat:"weapon",status:"green"},
  {name:"Groza",price:210000,img:"images/groza.png",cat:"weapon",status:"green"},
  {name:"M70 (AK-47)",price:189000,img:"images/m70.png",cat:"weapon",status:"green"},
  {name:"Sawed-Off Shotgun",price:105000,img:"images/sawed_off_shotgun.png",cat:"weapon",status:"green"},
  {name:"SMG Ammo",price:4000,img:"images/smg_ammo.png",cat:"weapon",status:"green"},
  {name:"Pistol Ammo",price:6500,img:"images/pistol_ammo.png",cat:"weapon",status:"green"},
  {name:"Shotgun Ammo",price:4000,img:"images/shotgun_ammo.png",cat:"weapon",status:"green"},
  {name:"Rifle Ammo",price:5500,img:"images/rifle_ammo.png",cat:"weapon",status:"green"},
  {name:"Handcuffs",price:6500,img:"images/handcuffs.png",cat:"weapon",status:"green"},
  {name:"Kevlar Vest",price:5400,img:"images/kevlar_vest.png",cat:"weapon",status:"green"},
  {name:"Molotov",price:12600,img:"images/molotov.png",cat:"weapon",status:"red"},
  {name:"Suppressor (SMG)",price:5500,img:"images/suppressor_sm.png",cat:"weapon",status:"red"},
  {name:"Scope (SMG)",price:4000,img:"images/scope_sm.png",cat:"weapon",status:"red"},
  {name:"Extended Clip (SMG)",price:5000,img:"images/extended_clip_sm.png",cat:"weapon",status:"red"},
  {name:"Suppressor (Pistol)",price:4000,img:"images/suppressor_pistol.png",cat:"weapon",status:"red"},
  {name:"chemical",price:400000,img:"images/chemical.png",cat:"gold",status:"green"},
  {name:"Marked Gold Bar",price:5300,img:"images/Marked_Gold_BAR.png",cat:"gold",status:"green"},
  {name:"Marked Silver Bar",price:4800,img:"images/marked_silver_bar.png",cat:"gold",status:"green"},
  {name:"Gold Bar",price:12000,img:"images/gold_bar.png",cat:"gold",status:"green"},
  {name:"Silver Bar",price:6000,img:"images/silver_bar.png",cat:"gold",status:"green"},
  {name:"Diamond",price:750,img:"images/diamond.png",cat:"gold",status:"green"},
  {name:"X Panther Gem",price:16500,img:"images/x_panther_gem.png",cat:"gold",status:"green"},
  {name:"Giant Gem",price:16500,img:"images/giant_gem.png",cat:"gold",status:"green"},
  {name:"Gem Necklace",price:16500,img:"images/Gem_Necklace.png",cat:"gold",status:"green"},
  {name:"Giant Gem Green",price:16500,img:"images/Giant_Gem_Green.png",cat:"gold",status:"green"},
  {name:"Box Of Jewlery",price:4000,img:"images/Box_of_Jewlery.png",cat:"gold",status:"green"},
  {name:"Diamond Ring",price:750,img:"images/Diamond_Ring.png",cat:"gold",status:"green"},
  {name:"Ruby Ring",price:750,img:"images/Ruby_Ring.png",cat:"gold",status:"green"},
  {name:"Sapphire Ring",price:750,img:"images/Sapphire_Ring.png",cat:"gold",status:"green"},
  {name:"Emerald Ring",price:750,img:"images/Emerald_Ring.png",cat:"gold",status:"green"},
  {name:"Diamond Earring",price:750,img:"images/Diamond_Earring.png",cat:"gold",status:"green"},
  {name:"Ruby Earring",price:750,img:"images/Ruby_Earring.png",cat:"gold",status:"green"},
  {name:"Sapphire Earring",price:750,img:"images/Sapphire_Earring.png",cat:"gold",status:"green"},
  {name:"Emerald Earring",price:750,img:"images/Emerald_Earring.png",cat:"gold",status:"green"},
  {name:"Diamond Necklace",price:750,img:"images/Diamond_Necklace.png",cat:"gold",status:"green"},
  {name:"Ruby Necklace",price:750,img:"images/Ruby_Necklace.png",cat:"gold",status:"green"},
  {name:"Sapphire Necklace",price:750,img:"images/Sapphire_Necklace.png",cat:"gold",status:"green"},
  {name:"Emerald Necklace",price:750,img:"images/Emerald_Necklace.png",cat:"gold",status:"green"},
  {name:"BOX Lyrika",price:590000,img:"images/lyrika.png",cat:"drugs",status:"red"},
  {name:"BOX Heroin",price:570000,img:"images/heroin.png",cat:"drugs",status:"red"},
  {name:"marijuana",price:310,img:"images/marijuana.png",cat:"drugs",status:"red"},
  {name:"weed ak47",price:500,img:"images/weed_ak47.png",cat:"drugs",status:"red"},
];

// ===== LOAD PRODUCTS =====
async function loadProducts() {
  const grid = document.getElementById("adminProductsGrid");
  grid.innerHTML = "";

  const snap = await getDocs(collection(db, "items"));
  let itemsList = [];

  if (snap.empty) {
    for (const item of defaultItems) {
      const ref = doc(collection(db, "items"));
      await setDoc(ref, item);
      itemsList.push({ id: ref.id, ...item });
    }
  } else {
    snap.forEach(d => itemsList.push({ id: d.id, ...d.data() }));
  }

  itemsList.forEach(item => {
    const card = document.createElement("div");
    card.className = "product-admin-card";
    card.innerHTML = `
      <img src="${item.img}" alt="${item.name}" id="img-${item.id}" style="width:60px;height:60px;object-fit:contain;">
      <h4>${item.name}</h4>
      <input class="price-input" type="number" value="${item.price}" id="price-${item.id}">
      <select class="status-select" id="status-${item.id}">
        <option value="green"  ${item.status==="green" ?"selected":""}>🟢 Available</option>
        <option value="orange" ${item.status==="orange"?"selected":""}>🟠 Almost Sold Out</option>
        <option value="red"    ${item.status==="red"   ?"selected":""}>🔴 Not Available</option>
      </select>
      <button class="save-product-btn" onclick="saveProduct('${item.id}')">💾 Save</button>
      <button class="save-product-btn" id="changeimg-${item.id}"
        onclick="changeProductImage('${item.id}')"
        style="background:#3498db; margin-top:5px;">
        🖼 Change Image
      </button>
      <p class="saved-badge" id="saved-${item.id}">✅ Saved!</p>
    `;
    grid.appendChild(card);
  });
}

// ===== SAVE PRODUCT =====
window.saveProduct = async function(id) {
  const price  = parseInt(document.getElementById("price-"+id).value);
  const status = document.getElementById("status-"+id).value;
  await updateDoc(doc(db, "items", id), { price, status });
  const badge = document.getElementById("saved-"+id);
  badge.style.display = "block";
  setTimeout(() => badge.style.display = "none", 2000);
};

// ===== IMAGE TO BASE64 =====
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== PREVIEW IMAGE =====
document.getElementById("newProdImg").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const base64 = await fileToBase64(file);
  const preview = document.getElementById("newProdPreview");
  const previewImg = document.getElementById("newProdPreviewImg");
  previewImg.src = base64;
  preview.style.display = "block";
});

// ===== ADD NEW PRODUCT =====
document.getElementById("addProductBtn").addEventListener("click", async () => {
  const name      = document.getElementById("newProdName").value.trim();
  const price     = parseInt(document.getElementById("newProdPrice").value);
  const cat       = document.getElementById("newProdCat").value;
  const status    = document.getElementById("newProdStatus").value;
  const fileInput = document.getElementById("newProdImg");
  const addProdSuccess = document.getElementById("addProdSuccess");
  const addProdError   = document.getElementById("addProdError");

  if (!name || !price || !fileInput.files[0]) {
    addProdError.style.display = "block";
    addProdError.textContent = "❌ Fill all fields and choose an image";
    return;
  }

  try {
    addProdError.style.display = "none";
    document.getElementById("addProductBtn").textContent = "⏳ Saving...";

    const base64 = await fileToBase64(fileInput.files[0]);
    const ref = doc(collection(db, "items"));
    await setDoc(ref, { name, price, cat, status, img: base64 });

    addProdSuccess.style.display = "block";
    setTimeout(() => addProdSuccess.style.display = "none", 3000);

    document.getElementById("newProdName").value  = "";
    document.getElementById("newProdPrice").value = "";
    document.getElementById("newProdImg").value   = "";
    document.getElementById("newProdPreview").style.display = "none";
    document.getElementById("addProductBtn").textContent = "➕ Add Product";

    loadProducts();
    loadStats();
  } catch(e) {
    addProdError.style.display = "block";
    addProdError.textContent = "❌ Error: " + e.message;
    document.getElementById("addProductBtn").textContent = "➕ Add Product";
  }
});

// ===== CHANGE IMAGE =====
window.changeProductImage = async function(id) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.click();

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    const btn = document.getElementById("changeimg-" + id);
    btn.textContent = "⏳ Uploading...";
    btn.disabled = true;

    try {
      const base64 = await fileToBase64(file);
      await updateDoc(doc(db, "items", id), { img: base64 });

      const imgEl = document.getElementById("img-" + id);
      if (imgEl) imgEl.src = base64;

      btn.textContent = "✅ Changed!";
      setTimeout(() => {
        btn.textContent = "🖼 Change Image";
        btn.disabled = false;
      }, 2000);
    } catch(e) {
      btn.textContent = "❌ Error";
      btn.disabled = false;
    }
  };
};
