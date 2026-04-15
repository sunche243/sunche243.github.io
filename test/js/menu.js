import { db } from "./common.js";
import { validateName, buildQueryString, formatPrice } from "./utils.js";
import { appConfig } from "./appConfig.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

let currentMenus = [];

function renderMenus(mainSection, sideSection, menus) {
  mainSection.innerHTML = "";
  sideSection.innerHTML = "";

  menus.forEach((item) => {
    if (item.visible === false) return;

    const div = document.createElement("div");
    div.className = "menu-item";

    const soldOutText = item.soldOut ? " (매진)" : "";

    div.innerHTML = `
      <strong>${item.name} (${Number(item.price).toLocaleString()}원)${soldOutText}</strong>
      <div class="counter" data-name="${item.name}" data-price="${item.price}" data-sold-out="${item.soldOut ? "true" : "false"}">
        <button type="button" class="minus" ${item.soldOut ? "disabled" : ""}>-</button>
        <span class="count">0</span>
        <button type="button" class="plus" ${item.soldOut ? "disabled" : ""}>+</button>
      </div>
    `;

    if (item.type === "main") {
      mainSection.appendChild(div);
    } else {
      sideSection.appendChild(div);
    }
  });
}

function getSelectedItems() {
  return Array.from(document.querySelectorAll(".counter"))
    .map((el) => ({
      name: el.dataset.name,
      count: parseInt(el.querySelector(".count").textContent, 10) || 0,
      price: Number(el.dataset.price) || 0
    }))
    .filter((item) => item.count > 0);
}

function calculateEstimatedTotal() {
  const selectedItems = getSelectedItems();

  return selectedItems.reduce((sum, item) => {
    return sum + item.price * item.count;
  }, 0);
}

function updateEstimatedTotal() {
  const estimatedTotalPriceEl = document.getElementById("estimatedTotalPrice");
  estimatedTotalPriceEl.textContent = formatPrice(calculateEstimatedTotal());
}

function updateSelectedMenuSummary() {
  const summaryEl = document.getElementById("selectedMenuSummary");
  const selectedItems = getSelectedItems();

  if (selectedItems.length === 0) {
    summaryEl.className = "menu-summary-empty";
    summaryEl.textContent = "아직 선택한 메뉴가 없어요.";
    return;
  }

  summaryEl.className = "menu-summary-list";
  summaryEl.innerHTML = selectedItems
    .map((item) => `<div class="menu-summary-row"><span>${item.name}</span><strong>${item.count}개</strong></div>`)
    .join("");
}

function refreshMenuPreview() {
  updateEstimatedTotal();
  updateSelectedMenuSummary();
}

function resetAllCounters() {
  document.querySelectorAll(".counter .count").forEach((countEl) => {
    countEl.textContent = "0";
  });
  refreshMenuPreview();
}

function bindCounterEvents() {
  document.querySelectorAll(".counter").forEach((counter) => {
    const minus = counter.querySelector(".minus");
    const plus = counter.querySelector(".plus");
    const count = counter.querySelector(".count");
    const soldOut = counter.dataset.soldOut === "true";

    if (soldOut) {
      count.textContent = "0";
      return;
    }

    minus.onclick = () => {
      const current = parseInt(count.textContent, 10) || 0;
      if (current > 0) {
        count.textContent = current - 1;
        refreshMenuPreview();
      }
    };

    plus.onclick = () => {
      const current = parseInt(count.textContent, 10) || 0;
      count.textContent = current + 1;
      refreshMenuPreview();
    };
  });
}

function validateTableMatch(inputName, scannedTable) {
  const tableMatch = inputName.match(/\((\d{1,3})\)$/);

  if (!tableMatch) {
    alert("입금자명에서 테이블 번호를 확인할 수 없습니다.");
    return false;
  }

  const inputTable = parseInt(tableMatch[1], 10);

  if (inputTable < 1 || inputTable > 96) {
    alert("테이블 번호는 1번부터 96번까지만 가능합니다.");
    return false;
  }

  if (scannedTable !== "unknown" && String(inputTable) !== String(scannedTable)) {
    const proceed = confirm(
      `입력하신 테이블번호(${inputTable})와 스캔된 테이블번호(${scannedTable})가 다릅니다.\n정확한 테이블 번호를 입력하셨는지 확인해 주세요.\n\n계속 진행하시겠습니까?`
    );

    if (!proceed) {
      return false;
    }
  }

  return true;
}

async function loadMenuImage() {
  const menuImageEl = document.getElementById("menuImage");

  try {
    const settingsRef = doc(db, "settings", "public");
    const snapshot = await getDoc(settingsRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.menuImageUrl) {
        menuImageEl.src = data.menuImageUrl;
      }
    }
  } catch (error) {
    console.error("메뉴판 이미지 불러오기 실패:", error);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const noticeModal = document.getElementById("noticeModal");
  const closeModal = document.getElementById("closeModal");
  const menuModal = document.getElementById("menuModal");
  const menuViewBtn = document.getElementById("menuViewBtn");
  const closeMenuModal = document.getElementById("closeMenuModal");
  const resetMenuBtn = document.getElementById("resetMenuBtn");
  const orderForm = document.getElementById("orderForm");
  const payerNameInput = document.getElementById("payerName");
  const tableInfo = document.getElementById("tableInfo");
  const mainSection = document.getElementById("mainMenuSection");
  const sideSection = document.getElementById("sideMenuSection");
  const noticeMessage = document.getElementById("noticeMessage");

  const scannedTable = new URLSearchParams(window.location.search).get("table") || "unknown";

  if (noticeMessage) {
    noticeMessage.innerHTML = appConfig.noticeMessage;
  }

  if (noticeModal) {
    noticeModal.style.display = "flex";
  }

  if (closeModal) {
    closeModal.onclick = () => {
      noticeModal.style.display = "none";
    };
  }

  if (tableInfo) {
    tableInfo.textContent = `내 테이블 번호: ${scannedTable}`;
  }

  loadMenuImage();

  const q = query(collection(db, "menus"), orderBy("createdAt", "asc"));
  onSnapshot(q, (snapshot) => {
    currentMenus = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderMenus(mainSection, sideSection, currentMenus);
    bindCounterEvents();
    refreshMenuPreview();
  });

  if (resetMenuBtn) {
    resetMenuBtn.onclick = () => {
      const selectedItems = getSelectedItems();

      if (selectedItems.length === 0) {
        return;
      }

      const confirmed = confirm("선택한 메뉴를 모두 초기화할까요?");
      if (!confirmed) {
        return;
      }

      resetAllCounters();
    };
  }

  orderForm.onsubmit = (e) => {
    e.preventDefault();

    let name = payerNameInput.value.trim();
    name = validateName(name);

    if (!name) {
      alert("입금자명은 '이름(테이블번호)' 형식으로 입력해 주세요. 예: 홍길동(3)");
      return;
    }

    if (!validateTableMatch(name, scannedTable)) {
      return;
    }

    const items = getSelectedItems();

    if (items.length === 0) {
      alert("메뉴를 한 개 이상 선택해 주세요.");
      return;
    }

    const query = buildQueryString({
      table: scannedTable,
      name,
      items: JSON.stringify(items)
    });

    window.location.href = `check.html?${query}`;
  };

  if (menuViewBtn) {
    menuViewBtn.onclick = () => {
      menuModal.style.display = "flex";
    };
  }

  if (closeMenuModal) {
    closeMenuModal.onclick = () => {
      menuModal.style.display = "none";
    };
  }
});