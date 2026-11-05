import { db } from "./firebase-config.js";
import {
  collection, onSnapshot,
  doc as fsDoc, getDoc, updateDoc, addDoc, getDocs, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { checkAuth } from "./auth.js";

// ===== VARIABLES =====
const shop           = document.getElementById("shop");
const startBtn       = document.getElementById("startBtn");
const music          = document.getElementById("bgMusic");
const musicPlayer    = document.getElementById("musicPlayer");
const playPauseBtn   = document.getElementById("playPause");
const volumeSlider   = document.getElementById("volume");
const closePlayerBtn = document.getElementById("closePlayer");
const pdfBtn         = document.getElementById("pdfBtn");
const pdfForm        = document.getElementById("pdfForm");
const confirmPDF     = document.getElementById("confirmPDF");
const cancelPDF      = document.getElementById("cancelPDF");

let invoice         = [];
let total           = 0;
let items           = [];
let currentCategory = 'all';
let currentUser     = null;
let userPoints      = 0;

music.volume = 0.3;

// ===== INIT =====
async function initShop() {
  currentUser = await checkAuth();

  const userSnap = await getDoc(fsDoc(db, "users", currentUser.uid));
  if (userSnap.exists()) {
    userPoints = userSnap.data().points || 0;
    document.getElementById("userPoints").textContent = userPoints;

   
    if (userSnap.data().role === "admin") {
      const adminBtn = document.createElement("button");
      adminBtn.textContent = "⚙️ Admin";
      adminBtn.onclick = () => window.location.href = "admin.html";
      adminBtn.style.cssText = `
        background: #af2121;
        color: #fff;
        padding: 8px 16px;
        border-radius: 50px;
        border: none;
        cursor: pointer;
        font-weight: 700;
        font-size: 13px;
        font-family: 'Crimson Pro', sans-serif;
        transition: all 0.3s;
      `;
      adminBtn.onmouseover = () => adminBtn.style.boxShadow = "0 6px 20px rgba(175,33,33,0.5)";
      adminBtn.onmouseout  = () => adminBtn.style.boxShadow = "none";
      document.querySelector(".header-right").prepend(adminBtn);
    }
  }

  onSnapshot(collection(db, "items"), (snap) => {
    items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    items.sort((a, b) => a.cat.localeCompare(b.cat));
    const intro = document.getElementById("intro");
    if (intro && intro.style.display === "none") {
      renderShop(currentCategory);
    }
  });
}

initShop();

startBtn.addEventListener("click", () => {
  music.volume = 0.4;
  music.play().catch(e => console.log("خطأ:", e));

  const intro = document.getElementById("intro");
  intro.style.transition = "opacity 0.8s";
  intro.style.opacity = 0;

  setTimeout(() => {
    intro.style.display = "none";
    if (items.length > 0) {
      renderShop('all');
    } else {
      shop.innerHTML = `<p style="color:#d98c3a;text-align:center;grid-column:1/-1;">⏳ Loading...</p>`;
    }
    musicPlayer.classList.add("show");
  }, 800);
});

playPauseBtn.addEventListener("click", () => {
  if (music.paused) {
    music.play().catch(e => console.log(e));
    playPauseBtn.textContent = "⏸";
  } else {
    music.pause();
    playPauseBtn.textContent = "▶";
  }
});
volumeSlider.addEventListener("input", () => { music.volume = volumeSlider.value; });
closePlayerBtn.addEventListener("click", () => { musicPlayer.classList.remove("show"); });

function renderShop(category) {
  currentCategory = category;
  shop.innerHTML  = "";
  let delay = 0;

  items.forEach(i => {
    if (category !== 'all' && i.cat !== category) return;
    if (i.status === "red") return;

    const card = document.createElement("div");
    card.className = "card";

    let qtyHTML = '';
    if (i.status !== "red") {
      qtyHTML = `
        <div class="qty-box" style="display:none">
          <input type="number" min="1" value="1" class="qtyInput">
          <button onclick="addItemFromInput(this,'${i.name.replace(/'/g,"\\'")}',${i.price},'${i.img}')">confirm</button>
        </div>`;
    }

    card.innerHTML = `
      <img src="${i.img}" width="100">
      <h3>${i.name}</h3>
      <p class="price-text">${i.price.toLocaleString()}$</p>
      ${i.cat === "drugs" ? `
        <p class="bulk-hint">
          ${i.name === "BOX Lyrika" ? `💡 1 = 590,000$💡<br>💡 2 = 585,000$💡<br>💡 3+ = 575,000$💡` :
            i.name === "BOX Heroin" ? `💡 1 = 570,000$💡<br>💡 2 = 565,000$💡<br>💡 3+ = 555,000$💡` : ""}
        </p>` : ""}
      <div class="status ${i.status}">
        ${i.status==="green"?"🟢 Available":i.status==="orange"?"🟠 Almost Sold Out":"🔴 Not Available"}
      </div>
      ${i.status!=="red"?`<button onclick="showQty(this)">Add</button>`:""}
      ${qtyHTML}
    `;
    shop.appendChild(card);
    setTimeout(() => card.classList.add("show"), delay);
    delay += 100;
  });
}


window.showQty = function(btn) {
  const box = btn.nextElementSibling;
  box.style.display = box.style.display === "flex" ? "none" : "flex";
};

window.addItemFromInput = function(btn, name, price, img) {
  const qty = parseInt(btn.previousElementSibling.value);
  if (!qty || qty <= 0) return;

  let finalPrice = price;
  if (name === "BOX Lyrika") {
    finalPrice = qty >= 3 ? 575000 : qty >= 2 ? 585000 : 590000;
  }
  if (name === "BOX Heroin") {
    finalPrice = qty >= 3 ? 555000 : qty >= 2 ? 565000 : 570000;
  }

  invoice.push({ name, qty, price: finalPrice * qty });
  total += finalPrice * qty;
  renderInvoice();
  btn.parentElement.style.display = "none";
  showCartNotif(name, img);
};


function showCartNotif(name, img) {
  const notif = document.getElementById("cartNotif");
  document.getElementById("cartNotifName").textContent = name;
  document.getElementById("cartNotifImg").src = img;
  notif.classList.add("show");
  setTimeout(() => notif.classList.remove("show"), 2500);
}


function renderInvoice() {
  const tbody = document.querySelector("#invoice tbody");
  tbody.innerHTML = "";
  total = 0;

  invoice.forEach((item, index) => {
    total += item.price;
    const tr = document.createElement("tr");
    tr.classList.add("invoice-add");
    tr.innerHTML = `
      <td>${item.name}${item.isPoints ? '<span class="points-invoice-badge">⭐ Points</span>' : ""}</td>
      <td>${item.qty}</td>
      <td>${item.price === 0 ? "FREE" : item.price < 0 ? "-" + Math.abs(item.price).toLocaleString() + "$" : item.price.toLocaleString() + "$"}</td>
      <td><button class="remove-btn" onclick="removeItem(${index})">✖</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("total").innerText = total.toLocaleString() + " $";
}


window.removeItem = async function(index) {
  const rows = document.querySelectorAll("#invoice tbody tr");
  rows[index].classList.add("invoice-remove");

  setTimeout(async () => {
    const item = invoice[index];
    if (item.isPoints && item.pointsCost) {
      userPoints += item.pointsCost;
      document.getElementById("userPoints").textContent = userPoints;
      document.getElementById("pointsStoreCount").textContent = userPoints;
      await updateDoc(fsDoc(db, "users", currentUser.uid), { points: userPoints });
      renderPointsStore();
    }
    invoice.splice(index, 1);
    renderInvoice();
  }, 420);
};

window.filterItems = function(category) {
  const pointsStore = document.getElementById("pointsStore");
  const shopGrid    = document.getElementById("shop");

  if (category === 'points') {
    pointsStore.style.display = "block";
    shopGrid.style.display    = "none";
    renderPointsStore();
  } else {
    pointsStore.style.display = "none";
    shopGrid.style.display    = "grid";
    renderShop(category);
  }
};


pdfBtn.addEventListener("click", () => {
  if (invoice.length === 0) {
    alert("❌ NO ITEMS IN INVOICE ❌");
    return;
  }
  pdfForm.style.display = "flex";
});

cancelPDF.addEventListener("click", () => {
  pdfForm.style.display = "none";
});

confirmPDF.addEventListener("click", async () => {
  const buyer = document.getElementById("buyerName").value.trim();
  const gang  = document.getElementById("gangName").value.trim();
  const radio = document.getElementById("radioName").value.trim();

  if (!buyer || !gang || !radio) {
    alert("❌ FILL ALL FIELDS ❌");
    return;
  }

  pdfForm.style.display = "none";

  const savedInvoiceNumber = "PB-" + Math.floor(100000 + Math.random() * 900000);
  try {
    await addDoc(collection(db, "users", currentUser.uid, "invoices"), {
      invoiceNumber: savedInvoiceNumber,
      buyer, gang, radio,
      items: invoice.map(i => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        isPoints: i.isPoints || false
      })),
      total,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      createdAt: new Date()
    });
    const freshSnap = await getDoc(fsDoc(db, "users", currentUser.uid));
    await updateDoc(fsDoc(db, "users", currentUser.uid), {
      invoiceCount: (freshSnap.data().invoiceCount || 0) + 1
    });
  } catch(e) {
    console.log("Firestore error:", e);
  }

  const invoiceNumber = savedInvoiceNumber;
  const now  = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // ===== PAGE CONSTANTS =====
  const W = 210;
  const H = 297;
  const MARGIN_BOTTOM = 22;
  const tableX = 16;
  const tableW = W - 32;

  // ===== PEAKY BLINDERS PALETTE (aged paper, coal, ember, dried blood) =====
  const paper     = [233, 222, 196];
  const paperDark = [219, 205, 172];
  const paperEdge = [196, 178, 140];
  const coal      = [20, 17, 15];
  const coalSoft  = [38, 32, 28];
  const ink       = [34, 28, 24];
  const inkSoft   = [92, 80, 68];
  const ember     = [196, 112, 36];
  const emberDim  = [150, 96, 44];
  const blood     = [125, 26, 26];
  const cream     = [238, 228, 204];

  // Latin-only safety net (built-in PDF fonts can't render emoji/Arabic/etc.)
  function safeText(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();
  }

  // deterministic pseudo-random so every page gets the same "paper grain"
  function makeRng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  // ---- aged paper: base colour, darker edges, specks, double frame ----
  function drawPageBackground() {
    doc.setFillColor(...paper);
    doc.rect(0, 0, W, H, "F");
    // vignette: darker bands creeping in from each edge
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const c = paperEdge.map((e, k) => e + (paper[k] - e) * t);
      doc.setFillColor(...c);
      doc.rect(0, i * 0.9, W, 0.9, "F");
      doc.rect(0, H - (i + 1) * 0.9, W, 0.9, "F");
      doc.rect(i * 0.9, 0, 0.9, H, "F");
      doc.rect(W - (i + 1) * 0.9, 0, 0.9, H, "F");
    }
    // grain / soot specks
    const rnd = makeRng(7);
    for (let i = 0; i < 260; i++) {
      const sx = 6 + rnd() * (W - 12), sy = 6 + rnd() * (H - 12);
      const dark = rnd() > 0.5;
      doc.setFillColor(...(dark ? paperEdge : paperDark));
      doc.circle(sx, sy, 0.15 + rnd() * 0.35, "F");
    }
    // double rule frame
    doc.setDrawColor(...ink);
    doc.setLineWidth(0.9);
    doc.rect(8, 8, W - 16, H - 16, "S");
    doc.setLineWidth(0.25);
    doc.rect(10, 10, W - 20, H - 20, "S");
    // corner studs
    doc.setFillColor(...ink);
    [[8, 8], [W - 8, 8], [8, H - 8], [W - 8, H - 8]].forEach(([cx, cy]) => doc.circle(cx, cy, 1.1, "F"));
  }

  // ---- razor blade emblem (vector), centred at cx,cy, rotated by deg ----
  function rot(px, py, cx, cy, deg) {
    const a = deg * Math.PI / 180;
    return [cx + px * Math.cos(a) - py * Math.sin(a), cy + px * Math.sin(a) + py * Math.cos(a)];
  }
  function drawBlade(cx, cy, scale, deg, bodyColor, holeColor) {
    // blade outline (half-width 12, half-height 4.4, chamfered ends)
    const pts = [[-12,-2.6],[-10.2,-4.4],[10.2,-4.4],[12,-2.6],[12,2.6],[10.2,4.4],[-10.2,4.4],[-12,2.6]]
      .map(([px, py]) => rot(px * scale, py * scale, cx, cy, deg));
    doc.setFillColor(...bodyColor);
    const rel = [];
    for (let i = 1; i < pts.length; i++) rel.push([pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]]);
    doc.lines(rel, pts[0][0], pts[0][1], [1, 1], "F", true);
    // end holes + centre slot
    doc.setFillColor(...holeColor);
    [[-8.4, 0], [8.4, 0]].forEach(([px, py]) => {
      const [hx, hy] = rot(px * scale, py * scale, cx, cy, deg);
      doc.circle(hx, hy, 1.5 * scale, "F");
    });
    const sp = [[-4.2,-1.1],[4.2,-1.1],[4.2,1.1],[-4.2,1.1]].map(([px, py]) => rot(px * scale, py * scale, cx, cy, deg));
    doc.lines([[sp[1][0]-sp[0][0], sp[1][1]-sp[0][1]],[sp[2][0]-sp[1][0], sp[2][1]-sp[1][1]],[sp[3][0]-sp[2][0], sp[3][1]-sp[2][1]]],
      sp[0][0], sp[0][1], [1, 1], "F", true);
    // bright edge line along the top
    const e1 = rot(-10.2 * scale, -4.4 * scale, cx, cy, deg), e2 = rot(10.2 * scale, -4.4 * scale, cx, cy, deg);
    doc.setDrawColor(...cream);
    doc.setLineWidth(0.25);
    doc.line(e1[0], e1[1], e2[0], e2[1]);
  }

  // small diamond ornament
  function diamond(cx, cy, r, color) {
    doc.setFillColor(...color);
    doc.triangle(cx, cy - r, cx - r, cy, cx + r, cy, "F");
    doc.triangle(cx, cy + r, cx - r, cy, cx + r, cy, "F");
  }
  // rule with centre diamond
  function ornamentRule(y, x1, x2, color) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    const mid = (x1 + x2) / 2;
    doc.line(x1, y, mid - 5, y);
    doc.line(mid + 5, y, x2, y);
    diamond(mid, y, 1.8, color);
  }

  // ---- header: page 1 = full masthead, others = slim running head ----
  function drawHeader(full) {
    if (full) {
      // coal masthead
      doc.setFillColor(...coal);
      doc.rect(12, 12, W - 24, 40, "F");
      doc.setDrawColor(...ember);
      doc.setLineWidth(0.4);
      doc.rect(14, 14, W - 28, 36, "S");

      drawBlade(32, 32, 1.35, -24, ember, coal);
      drawBlade(32, 32, 1.35, 24, emberDim, coal);

      doc.setTextColor(...cream);
      doc.setFont("times", "bold");
      doc.setFontSize(27);
      doc.text("PEAKY BLINDERS", 52, 30);
      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...ember);
      doc.text("BY ORDER OF THE PEAKY BLINDERS", 53, 37);
      doc.setFont("courier", "normal");
      doc.setTextColor(...paperEdge);
      doc.text("GALAXY ROLEPLAY  -  GX SERVER", 53, 42);

      // invoice stamp block, right
      doc.setFont("times", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...cream);
      doc.text("INVOICE", W - 20, 24, { align: "right" });
      doc.setFont("courier", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...ember);
      doc.text(`No. ${invoiceNumber}`, W - 20, 31, { align: "right" });
      doc.setFont("courier", "normal");
      doc.setTextColor(...paperEdge);
      doc.text(date, W - 20, 37, { align: "right" });
      doc.text(time, W - 20, 42, { align: "right" });

      ornamentRule(58, 16, W - 16, ink);
      return 66;
    }
    // slim running head
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ink);
    doc.text("PEAKY BLINDERS", 16, 20);
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...inkSoft);
    doc.text(`Invoice ${invoiceNumber}  (continued)`, W - 16, 20, { align: "right" });
    ornamentRule(25, 16, W - 16, ink);
    return 32;
  }

  // ---- buyer / gang / radio: typewritten form lines ----
  function drawBuyerInfo(y) {
    const colW = tableW / 3;
    const labels = ["BUYER", "GANG", "RADIO"];
    const values = [buyer, gang, radio].map(v => { const c = safeText(v); return c.length ? c : "-"; });
    labels.forEach((lab, i) => {
      const cx = tableX + colW * i;
      doc.setFont("courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...inkSoft);
      doc.text(lab, cx, y);
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...ink);
      const val = values[i].length > 19 ? values[i].substring(0, 19) + "..." : values[i];
      doc.text(val, cx, y + 6.5);
      doc.setDrawColor(...inkSoft);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([0.6, 0.8], 0);
      doc.line(cx, y + 9, cx + colW - 6, y + 9);
      doc.setLineDashPattern([], 0);
    });
    return y + 20;
  }

  function drawTableHeader(y) {
    doc.setFillColor(...coal);
    doc.rect(tableX, y, tableW, 9, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...cream);
    doc.text("ITEM", tableX + 4, y + 6);
    doc.text("QTY", tableX + tableW * 0.66, y + 6, { align: "center" });
    doc.text("PRICE", tableX + tableW - 4, y + 6, { align: "right" });
    doc.setFillColor(...ember);
    doc.rect(tableX, y + 9, tableW, 0.8, "F");
    return y + 9.8;
  }

  const rowH = 9.5;

  // ===== START PAGE 1 =====
  let pageNum = 1;
  drawPageBackground();
  let y = drawHeader(true);
  y = drawBuyerInfo(y);
  y = drawTableHeader(y);

  // ===== ITEMS LOOP WITH PAGINATION =====
  invoice.forEach((item, i) => {
    if (y + rowH > H - MARGIN_BOTTOM) {
      doc.addPage();
      pageNum++;
      drawPageBackground();
      y = drawHeader(false);
      y = drawTableHeader(y);
    }

    const isDiscount = item.price < 0;
    const isPoints   = item.isPoints;

    if (i % 2 === 1) {
      doc.setFillColor(...paperDark);
      doc.rect(tableX, y, tableW, rowH, "F");
    }
    if (isPoints) {
      doc.setFillColor(...ember);
      doc.rect(tableX, y, 1.2, rowH, "F");
    }
    const ty = y + rowH / 2 + 1.4;

    doc.setFont("times", isPoints ? "bolditalic" : "bold");
    doc.setFontSize(10);
    doc.setTextColor(...(isPoints ? blood : ink));
    const cleanName = safeText(item.name);
    const itemName = cleanName.length > 38 ? cleanName.substring(0, 38) + "..." : cleanName;
    doc.text(itemName, tableX + 4, ty);

    doc.setFont("courier", "normal");
    doc.setTextColor(...inkSoft);
    doc.text(String(item.qty), tableX + tableW * 0.66, ty, { align: "center" });

    const priceText = item.price === 0
      ? "FREE"
      : item.price < 0
        ? "-" + Math.abs(item.price).toLocaleString("en-US") + "$"
        : item.price.toLocaleString("en-US") + "$";
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...(isDiscount || isPoints ? blood : ink));
    doc.text(priceText, tableX + tableW - 4, ty, { align: "right" });

    // dotted leader under every row
    doc.setDrawColor(...inkSoft);
    doc.setLineWidth(0.15);
    doc.setLineDashPattern([0.5, 0.9], 0);
    doc.line(tableX, y + rowH, tableX + tableW, y + rowH);
    doc.setLineDashPattern([], 0);

    y += rowH;
  });

  // ===== TOTAL + SIGNATURE + SEAL (kept together on one page) =====
  const blockNeeded = 8 + 24 + 8 + 38;
  if (y + blockNeeded > H - MARGIN_BOTTOM) {
    doc.addPage();
    pageNum++;
    drawPageBackground();
    y = drawHeader(false);
  }

  // ---- total ----
  y += 8;
  doc.setFillColor(...coal);
  doc.rect(tableX, y, tableW, 22, "F");
  doc.setDrawColor(...ember);
  doc.setLineWidth(0.5);
  doc.rect(tableX + 1.5, y + 1.5, tableW - 3, 19, "S");
  doc.setFont("courier", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...paperEdge);
  doc.text("TOTAL DUE", tableX + 10, y + 13);
  doc.setFont("times", "bold");
  doc.setFontSize(21);
  doc.setTextColor(...(total < 0 ? ember : cream));
  doc.text(total.toLocaleString("en-US") + "$", tableX + tableW - 10, y + 14, { align: "right" });
  y += 22 + 12;

  // ---- signature (left) ----
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...inkSoft);
  doc.text("AUTHORIZED BY", tableX + 2, y);
  const sx = tableX + 2, sy = y + 3;
  const sig = [[0,8],[5,2],[9,9],[14,1],[19,8],[25,3],[30,9],[37,4],[44,8],[52,5],[60,7]];
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.5);
  for (let i = 0; i < sig.length - 1; i++) doc.line(sx + sig[i][0], sy + sig[i][1], sx + sig[i+1][0], sy + sig[i+1][1]);
  doc.setDrawColor(...inkSoft);
  doc.setLineWidth(0.25);
  doc.line(sx, sy + 15, sx + 75, sy + 15);
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...ink);
  doc.text("PEAKY BLINDERS", sx, sy + 21);

  // ---- wax-stamp seal (right) ----
  const cx = tableX + tableW - 26, cy = y + 16;
  doc.setDrawColor(...blood);
  doc.setLineWidth(0.9);
  doc.circle(cx, cy, 15, "S");
  doc.setLineWidth(0.3);
  doc.circle(cx, cy, 12.6, "S");
  drawBlade(cx, cy - 3.2, 0.5, 0, blood, paper);
  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...blood);
  doc.text("PEAKY BLINDERS", cx, cy + 3.8, { align: "center" });
  doc.setFont("courier", "bold");
  doc.setFontSize(6);
  doc.text("OFFICIAL", cx, cy + 7.5, { align: "center" });
  doc.text("GX - 2026", cx, cy + 10.5, { align: "center" });

  // ===== FOOTER + PAGE NUMBERS ON EVERY PAGE =====
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    ornamentRule(H - 20, 16, W - 16, ink);
    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...inkSoft);
    doc.text("BY ORDER OF THE PEAKY BLINDERS   -   GALAXY ROLEPLAY - GX - 2026", W / 2, H - 15, { align: "center" });
    doc.setFont("courier", "normal");
    doc.text(`${p} / ${totalPages}`, W - 16, H - 15, { align: "right" });
  }

  doc.save(`PB_Invoice_${invoiceNumber}.pdf`);
});

let visits = localStorage.getItem("visits");
visits = visits ? parseInt(visits) + 1 : 1;
localStorage.setItem("visits", visits);
const visitorCount = document.getElementById("visitorCount");
let currentCount = 0;
const counterInterval = setInterval(() => {
  if (currentCount < visits) { currentCount++; visitorCount.innerText = currentCount; }
  else clearInterval(counterInterval);
}, 50);


const searchBar     = document.getElementById("searchBar");
const searchResults = document.getElementById("searchResults");
const searchClear   = document.getElementById("searchClear");

function renderSearch(value) {
  searchResults.innerHTML = "";
  if (!value) {
    searchResults.style.display = "none";
    searchClear.style.display   = "none";
    return;
  }
  searchClear.style.display = "block";
  const filtered = items.filter(item => item.name.toLowerCase().startsWith(value));

  if (filtered.length === 0) {
    searchResults.innerHTML = `<div class="search-empty">🔍 No results for "${value}"</div>`;
    searchResults.style.display = "block";
    return;
  }

  filtered.forEach(item => {
    const div = document.createElement("div");
    div.className = "search-item";
    const isRed = item.status === "red";
    const statusText = item.status === "green"
      ? '<span class="search-item-status green">🟢 Available</span>'
      : item.status === "orange"
      ? '<span class="search-item-status orange">🟠 Almost Sold Out</span>'
      : '<span class="search-item-status red">🔴 Not Available</span>';

    div.innerHTML = `
      <img src="${item.img}" alt="${item.name}">
      <div class="search-item-info">
        <div class="search-item-name">${item.name}</div>
        <div class="search-item-price">${item.price.toLocaleString()}$</div>
        ${statusText}
      </div>
      <button class="search-add-btn"
        ${isRed ? 'disabled title="Not Available"' : ''}
        onclick="addFromSearch('${item.name.replace(/'/g,"\\'")}', ${item.price}, '${item.img}', this)">
        ${isRed ? '✖' : '+ Add'}
      </button>
    `;
    searchResults.appendChild(div);
  });
  searchResults.style.display = "block";
}

window.addFromSearch = function(name, price, img, btn) {
  invoice.push({ name, qty: 1, price });
  total += price;
  renderInvoice();
  showCartNotif(name, img);

  btn.textContent = "✔ Added";
  btn.style.background = "#2ecc71";
  btn.style.color = "#111";
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = "+ Add";
    btn.style.background = "#d98c3a";
    btn.style.color = "#111";
    btn.disabled = false;
  }, 1500);
};

window.clearSearch = function() {
  searchBar.value = "";
  searchResults.style.display = "none";
  searchClear.style.display   = "none";
  searchResults.innerHTML     = "";
};

searchBar.addEventListener("input", (e) => { renderSearch(e.target.value.toLowerCase().trim()); });
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-container")) searchResults.style.display = "none";
});
 
const pointsItems = [
  { id:"p1", name:"Discount 25%",      cost:10000, desc:"تخفيض 25% على فاتورتك",           type:"discount",      value:25 },
  { id:"p2", name:"Discount 50%",      cost:25000, desc:"تخفيض 50% على فاتورتك",           type:"discount",      value:50 },
  { id:"p3", name:"-50,000$ Off",      cost:50,  desc:"تخفيض ثابت 50,000$ من الفاتورة",  type:"fixed_discount", value:50000 },
  { id:"p4", name:"-100,000$ Off",     cost:100, desc:"تخفيض ثابت 100,000$ من الفاتورة", type:"fixed_discount", value:100000 },
  { id:"p7", name:"50x SMG Ammo",      cost:75,  desc:"FREE 50 SMG AMMO",             type:"ammo",          value:"SMG Ammo x50" },
  { id:"p8", name:"50x PISTOL Ammo",       cost:75,  desc:"FREE 50 PISTOL AMMO",              type:"ammo",          value:"PISTOL Ammo x50" },
];

function renderPointsStore() {
  const grid = document.getElementById("pointsStoreGrid");
  document.getElementById("pointsStoreCount").textContent = userPoints;
  grid.innerHTML = "";

  pointsItems.forEach((item, i) => {
    const canAfford = userPoints >= item.cost;
    const card = document.createElement("div");
    card.className = "points-card";
    card.innerHTML = `
      <h3>${item.name}</h3>
      <div class="points-cost">⭐ ${item.cost} pts</div>
      <p class="points-desc">${item.desc}</p>
      <button class="redeem-btn" ${!canAfford ? "disabled" : ""} onclick="redeemItem('${item.id}')">
        ${canAfford ? "🛒 Redeem" : "❌ Not enough pts"}
      </button>
    `;
    grid.appendChild(card);
    setTimeout(() => card.classList.add("show"), i * 100);
  });
}

window.redeemItem = async function(itemId) {
  const item = pointsItems.find(p => p.id === itemId);
  if (!item || userPoints < item.cost) return;

  if ((item.type === "discount" || item.type === "fixed_discount") && invoice.length === 0) {
    alert("❌ ADD ITEMS TO INVOICE FIRST ❌");
    return;
  }

  userPoints -= item.cost;
  await updateDoc(fsDoc(db, "users", currentUser.uid), { points: userPoints });
  document.getElementById("userPoints").textContent = userPoints;

  if (item.type === "discount") {
    const baseTotal = invoice.filter(i => !i.isPoints).reduce((sum, i) => sum + i.price, 0);
    const discountAmt = Math.floor(baseTotal * item.value / 100);
    invoice.push({ name:`Discount ${item.value}% (Points)`, qty:1, price:-discountAmt, isPoints:true, pointsCost:item.cost });
    renderInvoice();
    showCartNotif(`Discount ${item.value}%`, "images/logo.png");

  } else if (item.type === "fixed_discount") {
    invoice.push({ name:`-${item.value.toLocaleString()}$ Off (Points)`, qty:1, price:-item.value, isPoints:true, pointsCost:item.cost });
    renderInvoice();
    showCartNotif(`-${item.value.toLocaleString()}$ Off`, "images/logo.png");

  } else if (item.type === "item") {
    invoice.push({ name:`${item.value} (Points)`, qty:1, price:0, isPoints:true, pointsCost:item.cost });
    renderInvoice();
    showCartNotif(item.value, "images/logo.png");

  } else if (item.type === "ammo") {
    invoice.push({ name:`${item.value} (Points)`, qty:1, price:0, isPoints:true, pointsCost:item.cost });
    renderInvoice();
    showCartNotif(item.value, "images/logo.png");
  }

  renderPointsStore();
};


document.getElementById("historyBtn").addEventListener("click", openHistory);

async function openHistory() {
  const modal = document.getElementById("historyModal");
  const list  = document.getElementById("historyList");
  modal.classList.add("show");
  list.innerHTML = `<p style="color:#aaa;text-align:center;">⏳ Loading...</p>`;

  try {
    const snap = await getDocs(collection(db, "users", currentUser.uid, "invoices"));

    if (snap.empty) {
      list.innerHTML = `<p style="color:#aaa;text-align:center;">No orders yet 📭</p>`;
      return;
    }

    let invoicesList = [];
    snap.forEach(d => invoicesList.push(d.data()));
    invoicesList.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

    list.innerHTML = "";
    invoicesList.forEach(inv => {
      const div = document.createElement("div");
      div.className = "history-invoice";
      const itemsHTML = (inv.items || []).map(it => `
        <div class="history-item-row">
          <span>${it.name} ${it.isPoints ? '<span class="points-invoice-badge">⭐ Points</span>' : ""} x${it.qty}</span>
          <span>${it.price === 0 ? "FREE" : it.price < 0 ? "-"+Math.abs(it.price).toLocaleString()+"$" : it.price.toLocaleString()+"$"}</span>
        </div>
      `).join("");

      div.innerHTML = `
        <div class="history-invoice-header">
          <span class="history-invoice-num">🧾 ${inv.invoiceNumber || "—"}</span>
          <span class="history-invoice-date">${inv.date || ""} ${inv.time || ""}</span>
        </div>
        <div style="font-size:12px;color:#888;margin-bottom:8px;">
          👤 ${inv.buyer || "—"} | 🏴 ${inv.gang || "—"} | 📻 ${inv.radio || "—"}
        </div>
        ${itemsHTML}
        <div class="history-invoice-total">Total: ${(inv.total || 0).toLocaleString()}$</div>
      `;
      list.appendChild(div);
    });
  } catch(e) {
    list.innerHTML = `<p style="color:#e74c3c;text-align:center;">❌ Error: ${e.message}</p>`;
    console.log(e);
  }
}

window.closeHistory = function() {
  document.getElementById("historyModal").classList.remove("show");
};
