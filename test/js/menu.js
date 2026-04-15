import { menuItems } from "./menuData.js";
import { validateName, buildQueryString } from "./utils.js";
import { appConfig } from "./appConfig.js";

function renderMenus(mainSection, sideSection) {
  menuItems.forEach((item) => {
    const div = document.createElement("div");
    div.className = "menu-item";

    div.innerHTML = `
      <strong>${item.name} (${item.price.toLocaleString()}원)</strong>
      <div class="counter" data-name="${item.name}">
        <button type="button" class="minus">-</button>
        <span class="count">0</span>
        <button type="button" class="plus">+</button>
      </div>
    `;

    if (item.type === "main") {
      mainSection.appendChild(div);
    } else {
      sideSection.appendChild(div);
    }
  });
}

function bindCounterEvents() {
  document.querySelectorAll(".counter").forEach((counter) => {
    const minus = counter.querySelector(".minus");
    const plus = counter.querySelector(".plus");
    const count = counter.querySelector(".count");

    minus.onclick = () => {
      const current = parseInt(count.textContent, 10) || 0;
      if (current > 0) {
        count.textContent = current - 1;
      }
    };

    plus.onclick = () => {
      const current = parseInt(count.textContent, 10) || 0;
      count.textContent = current + 1;
    };
  });
}

function getSelectedItems() {
  return Array.from(document.querySelectorAll(".counter"))
    .map((el) => ({
      name: el.dataset.name,
      count: parseInt(el.querySelector(".count").textContent, 10) || 0
    }))
    .filter((item) => item.count > 0);
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

window.addEventListener("DOMContentLoaded", () => {
  const noticeModal = document.getElementById("noticeModal");
  const closeModal = document.getElementById("closeModal");
  const menuModal = document.getElementById("menuModal");
  const menuViewBtn = document.getElementById("menuViewBtn");
  const closeMenuModal = document.getElementById("closeMenuModal");
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

  renderMenus(mainSection, sideSection);
  bindCounterEvents();

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

    const flat = items.map((item) => `${item.name}*${item.count}`).join(", ");
    const query = buildQueryString({
      table: scannedTable,
      name,
      items: flat
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