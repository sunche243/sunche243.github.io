import { menuItems } from "./menuData.js";
import { validateName } from "./utils.js";

window.addEventListener("DOMContentLoaded", () => {

  document.getElementById("noticeModal").style.display = "flex";
  document.getElementById("closeModal").onclick = () => {
    document.getElementById("noticeModal").style.display = "none";
  };

  const table = new URLSearchParams(location.search).get("table") || "unknown";
  document.getElementById("tableInfo").textContent = `내 테이블 번호: ${table}`;

  const main = document.getElementById("mainMenuSection");
  const side = document.getElementById("sideMenuSection");

  menuItems.forEach(item => {
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

    item.type === "main" ? main.appendChild(div) : side.appendChild(div);
  });

  document.querySelectorAll(".counter").forEach(counter => {
    const minus = counter.querySelector(".minus");
    const plus = counter.querySelector(".plus");
    const count = counter.querySelector(".count");

    minus.onclick = () => {
      let v = parseInt(count.textContent);
      if (v > 0) count.textContent = v - 1;
    };

    plus.onclick = () => {
      count.textContent = parseInt(count.textContent) + 1;
    };
  });

  document.getElementById("orderForm").onsubmit = (e) => {
    e.preventDefault();

    let name = validateName(document.getElementById("payerName").value.trim());

    if (!name) {
      alert("입금자명 형식 오류");
      return;
    }

    const items = [...document.querySelectorAll(".counter")]
      .map(el => ({
        name: el.dataset.name,
        count: parseInt(el.querySelector(".count").textContent)
      }))
      .filter(i => i.count > 0);

    if (items.length === 0) {
      alert("메뉴를 선택해 주세요.");
      return;
    }

    const flat = items.map(i => `${i.name}*${i.count}`);
    location.href = `check.html?table=${table}&name=${name}&items=${flat}`;
  };

  document.getElementById("menuViewBtn").onclick = () => {
    document.getElementById("menuModal").style.display = "flex";
  };

  document.getElementById("closeMenuModal").onclick = () => {
    document.getElementById("menuModal").style.display = "none";
  };

});