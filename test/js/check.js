import { saveOrder } from "./order.js";
import {
  parseItems,
  formatPrice,
  buildQueryString,
  calculateOrderTotal,
  getPageParams
} from "./utils.js";
import { priceMap } from "./menuData.js";

window.addEventListener("DOMContentLoaded", () => {
  const params = getPageParams();

  const table = params.get("table") || "-";
  const name = params.get("name") || "-";
  const itemString = params.get("items") || "";

  const tableNumEl = document.getElementById("tableNum");
  const payerEl = document.getElementById("payer");
  const itemsEl = document.getElementById("items");
  const totalPriceEl = document.getElementById("totalPrice");
  const goBackBtn = document.getElementById("goBack");
  const goConfirmBtn = document.getElementById("goConfirm");
  const spinnerEl = document.getElementById("spinner");

  tableNumEl.textContent = table;
  payerEl.textContent = name;

  const items = parseItems(itemString);
  const total = calculateOrderTotal(items, priceMap);

  const listHtml = items
    .map((item) => `${item.name} ${item.count}개`)
    .join("<br>");

  itemsEl.innerHTML = listHtml;
  totalPriceEl.textContent = `총 금액: ${formatPrice(total)}`;

  goBackBtn.onclick = () => {
    if (goConfirmBtn.disabled) return;

    const query = buildQueryString({
      table,
      name,
      items: itemString
    });

    window.location.href = `menu.html?${query}`;
  };

  goConfirmBtn.onclick = async () => {
    if (goConfirmBtn.disabled) return;

    spinnerEl.style.display = "block";
    goConfirmBtn.disabled = true;
    goBackBtn.disabled = true;

    try {
      await saveOrder({
        table,
        name,
        items
      });

      const query = buildQueryString({
        table,
        name,
        items: itemString
      });

      window.location.href = `thankyou.html?${query}`;
    } catch (error) {
      console.error("주문 저장 실패:", error);

      if (error.message === "already-submitting") {
        alert("이미 주문을 처리 중입니다. 잠시만 기다려 주세요.");
      } else {
        alert("주문에 실패하였어요. 다시 시도해 주세요.");
      }

      spinnerEl.style.display = "none";
      goConfirmBtn.disabled = false;
      goBackBtn.disabled = false;
    }
  };
});