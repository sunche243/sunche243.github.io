import { db } from "./common.js";
import {
  formatDate,
  formatPrice,
  formatOrderItemCount,
  calculateOrderTotal,
  normalizeItemOptions
} from "./utils.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

const ordersDiv = document.getElementById("orders");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const tableFilter = document.getElementById("tableFilter");

const adminOrderCountEl = document.getElementById("adminOrderCount");
const adminTotalSalesEl = document.getElementById("adminTotalSales");
const adminPendingCountEl = document.getElementById("adminPendingCount");
const adminCompletedCountEl = document.getElementById("adminCompletedCount");

let allOrders = [];

function getOrderCreatedTime(data) {
  const rawTime = data?.createdAt ?? data?.timestamp;

  if (typeof rawTime === "number") {
    return Number.isFinite(rawTime) && rawTime > 0 ? rawTime : null;
  }

  if (typeof rawTime === "string") {
    const parsedTime = Number(rawTime.trim());
    return Number.isFinite(parsedTime) && parsedTime > 0 ? parsedTime : null;
  }

  if (rawTime && typeof rawTime.toMillis === "function") {
    const millis = Number(rawTime.toMillis());
    return Number.isFinite(millis) && millis > 0 ? millis : null;
  }

  if (rawTime && typeof rawTime === "object") {
    const seconds = Number(rawTime.seconds);
    const nanoseconds = Number(rawTime.nanoseconds);

    if (!Number.isFinite(seconds) || !Number.isFinite(nanoseconds)) {
      return null;
    }

    const millis = seconds * 1000 + nanoseconds / 1000000;
    return Number.isFinite(millis) && millis > 0 ? millis : null;
  }

  return null;
}

function getOrderElapsedMeta(data) {
  const createdTime = getOrderCreatedTime(data);

  if (!createdTime) {
    return {
      label: "접수 시간 확인 불가",
      className: "is-muted"
    };
  }

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - createdTime) / 60000));
  const isInactiveOrder = data.completed === true || data.deleted === true;

  if (isInactiveOrder) {
    return {
      label: `접수 후 ${elapsedMinutes}분 경과`,
      className: "is-muted"
    };
  }

  if (elapsedMinutes >= 20) {
    return {
      label: `접수 후 ${elapsedMinutes}분 경과 · 긴급`,
      className: "is-urgent"
    };
  }

  if (elapsedMinutes >= 15) {
    return {
      label: `접수 후 ${elapsedMinutes}분 경과 · 지연`,
      className: "is-delayed"
    };
  }

  if (elapsedMinutes >= 10) {
    return {
      label: `접수 후 ${elapsedMinutes}분 경과 · 주의`,
      className: "is-warning"
    };
  }

  return {
    label: `접수 후 ${elapsedMinutes}분 경과`,
    className: "is-normal"
  };
}

function getOrderStatusMeta(data) {
  if (data.deleted) {
    return {
      label: "삭제됨",
      className: "is-deleted"
    };
  }

  if (data.completed) {
    return {
      label: "확인 완료",
      className: "is-completed"
    };
  }

  return {
    label: "미확인",
    className: "is-pending"
  };
}

function matchesSearch(order, keyword) {
  if (!keyword) return true;

  const lowerKeyword = keyword.toLowerCase();
  const menuText = (order.items || []).map((item) => item.name).join(" ").toLowerCase();
  const tableText = String(order.table || "").toLowerCase();
  const nameText = String(order.name || "").toLowerCase();

  return (
    tableText.includes(lowerKeyword) ||
    nameText.includes(lowerKeyword) ||
    menuText.includes(lowerKeyword)
  );
}

function matchesStatus(order, filterValue) {
  if (filterValue === "all") return !order.deleted;
  if (filterValue === "completed") return order.completed === true && !order.deleted;
  if (filterValue === "pending") return order.completed !== true && !order.deleted;
  if (filterValue === "deleted") return order.deleted === true;
  return !order.deleted;
}

function matchesTable(order, tableValue) {
  if (tableValue === "all") return true;
  return String(order.table) === tableValue;
}

function populateTableFilter() {
  const currentValue = tableFilter.value;
  const tables = new Set();

  allOrders.forEach(({ data }) => {
    if (data.table) {
      tables.add(String(data.table));
    }
  });

  const sorted = Array.from(tables).sort((a, b) => Number(a) - Number(b));

  tableFilter.innerHTML = `<option value="all">전체 테이블</option>`;

  sorted.forEach((table) => {
    const option = document.createElement("option");
    option.value = table;
    option.textContent = `${table}번 테이블`;
    tableFilter.appendChild(option);
  });

  if (sorted.includes(currentValue)) {
    tableFilter.value = currentValue;
  } else {
    tableFilter.value = "all";
  }
}

function renderSummary() {
  const activeOrders = allOrders
    .map((order) => order.data)
    .filter((data) => !data.deleted);

  const totalSales = activeOrders.reduce((sum, data) => {
    return sum + calculateOrderTotal(data.items || []);
  }, 0);

  const pendingCount = activeOrders.filter((data) => data.completed !== true).length;
  const completedCount = activeOrders.filter((data) => data.completed === true).length;

  adminOrderCountEl.textContent = `${activeOrders.length}건`;
  adminTotalSalesEl.textContent = formatPrice(totalSales);
  adminPendingCountEl.textContent = `${pendingCount}건`;
  adminCompletedCountEl.textContent = `${completedCount}건`;
}

function appendItemOptions(container, item) {
  const selectedOptions = normalizeItemOptions(item.options);

  selectedOptions.forEach((option) => {
    const optionRow = document.createElement("div");
    optionRow.className = "admin-order-option";
    optionRow.style.marginTop = "4px";
    optionRow.style.paddingLeft = "8px";
    optionRow.style.fontSize = "13px";
    optionRow.style.color = "#666";
    optionRow.textContent = `└ ${option.label} ${option.count}개 (+${Number(option.price).toLocaleString()}원)`;
    container.appendChild(optionRow);
  });
}

function buildOrderItemsElement(items) {
  const wrapper = document.createElement("div");
  wrapper.className = "admin-order-items";

  (items || []).forEach((item, index) => {
    const itemRow = document.createElement("div");
    itemRow.className = "admin-order-item";

    if (index > 0) {
      itemRow.style.marginTop = "10px";
    }

    const itemName = document.createElement("div");
    itemName.className = "admin-order-item-name";
    itemName.textContent = `${item.name} ${formatOrderItemCount(item)}`;
    itemRow.appendChild(itemName);
    appendItemOptions(itemRow, item);
    wrapper.appendChild(itemRow);
  });

  return wrapper;
}

function renderOrders() {
  const keyword = searchInput.value.trim();
  const filterValue = statusFilter.value;
  const tableValue = tableFilter.value;

  ordersDiv.innerHTML = "";

  const filtered = allOrders.filter((order) => {
    return (
      matchesSearch(order.data, keyword) &&
      matchesStatus(order.data, filterValue) &&
      matchesTable(order.data, tableValue)
    );
  });

  filtered.forEach(({ id, data }) => {
    const total = calculateOrderTotal(data.items || []);
    const formattedDate = formatDate(data.timestamp);
    const btnText = data.completed ? "확인취소" : "확인";
    const deleteBtnText = data.deleted ? "복구" : "삭제";
    const statusMeta = getOrderStatusMeta(data);
    const elapsedMeta = getOrderElapsedMeta(data);

    const div = document.createElement("div");
    div.className =
      "order" +
      (data.completed ? " completed" : "") +
      (data.deleted ? " deleted" : "");
    div.dataset.status = statusMeta.className;
    div.dataset.elapsedStatus = elapsedMeta.className;

    const header = document.createElement("div");
    header.className = "admin-order-header";

    const titleRow = document.createElement("div");
    titleRow.className = "admin-order-title-row";

    const tableLabel = document.createElement("div");
    tableLabel.className = "admin-order-table";
    tableLabel.textContent = `테이블 ${data.table}`;

    const statusLabel = document.createElement("div");
    statusLabel.className = `admin-order-status ${statusMeta.className}`;
    statusLabel.textContent = statusMeta.label;

    titleRow.appendChild(tableLabel);
    titleRow.appendChild(statusLabel);

    const payerLabel = document.createElement("div");
    payerLabel.className = "admin-order-payer";
    payerLabel.textContent = `입금자 ${data.name}`;

    header.appendChild(titleRow);
    header.appendChild(payerLabel);

    const orderSection = document.createElement("div");
    orderSection.className = "admin-order-section";

    const orderLabel = document.createElement("div");
    orderLabel.className = "admin-order-section-label";
    orderLabel.textContent = "주문:";

    const itemsWrapper = buildOrderItemsElement(data.items || []);
    itemsWrapper.style.marginBottom = "0";

    orderSection.appendChild(orderLabel);
    orderSection.appendChild(itemsWrapper);

    const metaRow = document.createElement("div");
    metaRow.className = "admin-order-meta";

    const totalEl = document.createElement("div");
    totalEl.className = "admin-order-total";

    const totalLabel = document.createElement("span");
    totalLabel.className = "admin-order-total-label";
    totalLabel.textContent = "총 금액";

    const totalValue = document.createElement("strong");
    totalValue.className = "admin-order-total-value";
    totalValue.textContent = formatPrice(total);

    totalEl.appendChild(totalLabel);
    totalEl.appendChild(totalValue);

    const dateEl = document.createElement("div");
    dateEl.className = "admin-order-time";
    dateEl.textContent = formattedDate;

    const elapsedEl = document.createElement("div");
    elapsedEl.className = `admin-order-elapsed ${elapsedMeta.className}`;
    elapsedEl.textContent = elapsedMeta.label;

    metaRow.appendChild(totalEl);
    metaRow.appendChild(dateEl);
    metaRow.appendChild(elapsedEl);

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "toggle-btn";
    toggleBtn.textContent = btnText;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = deleteBtnText;

    const actionRow = document.createElement("div");
    actionRow.className = "admin-order-actions";
    actionRow.appendChild(toggleBtn);
    actionRow.appendChild(deleteBtn);

    div.appendChild(header);
    div.appendChild(orderSection);
    div.appendChild(metaRow);
    div.appendChild(actionRow);

    toggleBtn.onclick = async () => {
      if (data.deleted) return;

      await updateDoc(doc(db, "orders", id), {
        completed: !data.completed
      });
    };

    deleteBtn.onclick = async () => {
      if (data.deleted) {
        await updateDoc(doc(db, "orders", id), {
          deleted: false
        });
        return;
      }

      if (confirm("정말로 삭제하시겠습니까?")) {
        await updateDoc(doc(db, "orders", id), {
          deleted: true
        });
      }
    };

    ordersDiv.appendChild(div);
  });
}

const q = query(
  collection(db, "orders"),
  orderBy("timestamp", "desc")
);

onSnapshot(q, (snapshot) => {
  allOrders = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    data: docSnap.data()
  }));

  populateTableFilter();
  renderSummary();
  renderOrders();
});

searchInput.addEventListener("input", renderOrders);
statusFilter.addEventListener("change", renderOrders);
tableFilter.addEventListener("change", renderOrders);
