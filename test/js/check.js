import { saveOrder } from "./order.js";
import {
  parseItems,
  formatPrice,
  formatOrderItemCount,
  calculateOrderTotal,
  getPageParams,
  normalizeItemOptions,
  normalizeTableNumber,
  readSessionStorageJSON,
  writeSessionStorageJSON,
  removeSessionStorageValue
} from "./utils.js";

const PENDING_ORDER_KEY = "pendingOrder";
const COMPLETED_ORDER_KEY = "completedOrder";

function appendItemOptions(container, item) {
  const selectedOptions = normalizeItemOptions(item.options);

  selectedOptions.forEach((option) => {
    const optionRow = document.createElement("div");
    optionRow.className = "check-item-option";
    optionRow.style.marginTop = "4px";
    optionRow.style.paddingLeft = "8px";
    optionRow.style.fontSize = "13px";
    optionRow.style.color = "#666";
    optionRow.textContent = `└ ${option.label} ${option.count}개 (+${Number(option.price).toLocaleString()}원)`;
    container.appendChild(optionRow);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const params = getPageParams();

  const urlTable = normalizeTableNumber(params.get("table")) || "";
  const pendingOrder = readSessionStorageJSON(PENDING_ORDER_KEY);

  const tableNumEl = document.getElementById("tableNum");
  const payerEl = document.getElementById("payer");
  const itemsEl = document.getElementById("items");
  const totalPriceEl = document.getElementById("totalPrice");
  const goBackBtn = document.getElementById("goBack");
  const goConfirmBtn = document.getElementById("goConfirm");
  const spinnerEl = document.getElementById("spinner");

  if (!urlTable) {
    alert("테이블 정보를 확인할 수 없습니다. 메뉴 화면으로 돌아갑니다.");
    window.location.href = "menu.html";
    return;
  }

  if (!pendingOrder || String(pendingOrder.table || "") !== urlTable) {
    alert("주문 정보를 확인할 수 없습니다. 메뉴 화면으로 돌아갑니다.");
    window.location.href = `menu.html?table=${encodeURIComponent(urlTable)}`;
    return;
  }

  const table = urlTable;
  const sessionId = String(pendingOrder.sessionId || "");
  const name = String(pendingOrder.name || "-");
  const items = parseItems(JSON.stringify(pendingOrder.items || []));

  tableNumEl.textContent = table;
  payerEl.textContent = name;

  const total = calculateOrderTotal(items);

  itemsEl.innerHTML = "";

  if (items.length === 0) {
    itemsEl.textContent = "선택한 메뉴가 없어요.";
  } else {
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "check-item-row";

      const left = document.createElement("div");
      left.className = "check-item-name";

      const itemName = document.createElement("div");
      itemName.className = "check-item-title";
      itemName.textContent = item.name;
      left.appendChild(itemName);
      appendItemOptions(left, item);

      const right = document.createElement("strong");
      right.className = "check-item-count";
      right.textContent = formatOrderItemCount(item);

      row.appendChild(left);
      row.appendChild(right);
      itemsEl.appendChild(row);
    });
  }

  totalPriceEl.textContent = formatPrice(total);

  goBackBtn.onclick = () => {
    if (goConfirmBtn.disabled) return;
    window.location.href = `menu.html?table=${encodeURIComponent(table)}`;
  };

  goConfirmBtn.onclick = async () => {
    if (goConfirmBtn.disabled) return;
    if (!sessionId) {
      alert("현재 테이블 세션 정보를 확인할 수 없습니다. 다시 주문해 주세요.");
      return;
    }

    spinnerEl.style.display = "block";
    goConfirmBtn.disabled = true;
    goBackBtn.disabled = true;

    try {
      await saveOrder({
        table,
        sessionId,
        name,
        items
      });

      writeSessionStorageJSON(COMPLETED_ORDER_KEY, {
        table,
        sessionId,
        name,
        items,
        completedAt: Date.now()
      });
      removeSessionStorageValue(PENDING_ORDER_KEY);

      window.location.href = `thankyou.html?table=${encodeURIComponent(table)}`;
    } catch (error) {
      console.error("주문 저장 실패:", error);

      if (error.message === "already-submitting") {
        alert("이미 주문을 처리 중입니다. 잠시만 기다려 주세요.");
      } else if (error.message === "invalid-table") {
        alert("테이블 번호가 올바르지 않습니다. 다시 접속해 주세요.");
      } else if (error.message === "inactive-session") {
        alert("현재 테이블 세션이 종료되었거나 변경되었습니다. 다시 주문해 주세요.");
      } else {
        alert("주문에 실패하였어요. 다시 시도해 주세요.");
      }

      spinnerEl.style.display = "none";
      goConfirmBtn.disabled = false;
      goBackBtn.disabled = false;
    }
  };
});
