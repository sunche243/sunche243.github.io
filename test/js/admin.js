import { db } from "./common.js";
import { priceMap } from "./menuData.js";
import {
  formatDate,
  formatPrice,
  calculateOrderTotal
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
    return sum + calculateOrderTotal(data.items || [], priceMap);
  }, 0);

  const pendingCount = activeOrders.filter((data) => data.completed !== true).length;
  const completedCount = activeOrders.filter((data) => data.completed === true).length;

  adminOrderCountEl.textContent = `${activeOrders.length}건`;
  adminTotalSalesEl.textContent = formatPrice(totalSales);
  adminPendingCountEl.textContent = `${pendingCount}건`;
  adminCompletedCountEl.textContent = `${completedCount}건`;
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
    const total = calculateOrderTotal(data.items || [], priceMap);
    const itemList = (data.items || [])
      .map((item) => `${item.name} ${item.count}개`)
      .join("<br>");

    const formattedDate = formatDate(data.timestamp);
    const btnText = data.completed ? "확인취소" : "확인";
    const deleteBtnText = data.deleted ? "복구" : "삭제";

    const div = document.createElement("div");
    div.className =
      "order" +
      (data.completed ? " completed" : "") +
      (data.deleted ? " deleted" : "");

    div.innerHTML = `
      <p><strong>테이블 ${data.table}</strong> | 입금자: ${data.name}</p>
      <p>주문:<br>${itemList}</p>
      <p><strong>총 금액: ${total.toLocaleString()}원</strong></p>
      <small>${formattedDate}</small><br>
      <button class="toggle-btn">${btnText}</button>
      <button class="delete-btn">${deleteBtnText}</button>
    `;

    div.querySelector(".toggle-btn").onclick = async () => {
      if (data.deleted) return;

      await updateDoc(doc(db, "orders", id), {
        completed: !data.completed
      });
    };

    div.querySelector(".delete-btn").onclick = async () => {
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