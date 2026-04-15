import { db } from "./common.js";
import { priceMap } from "./menuData.js";
import {
  formatDate,
  calculateOrderTotal
} from "./utils.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

const ordersDiv = document.getElementById("orders");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

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
  if (filterValue === "all") return true;
  if (filterValue === "completed") return order.completed === true;
  if (filterValue === "pending") return order.completed !== true;
  return true;
}

function renderOrders() {
  const keyword = searchInput.value.trim();
  const filterValue = statusFilter.value;

  ordersDiv.innerHTML = "";

  const filtered = allOrders.filter((order) => {
    return matchesSearch(order.data, keyword) && matchesStatus(order.data, filterValue);
  });

  filtered.forEach(({ id, data }) => {
    const total = calculateOrderTotal(data.items || [], priceMap);
    const itemList = (data.items || [])
      .map((item) => `${item.name} ${item.count}개`)
      .join("<br>");
    const formattedDate = formatDate(data.timestamp);
    const btnText = data.completed ? "확인취소" : "확인";

    const div = document.createElement("div");
    div.className = "order" + (data.completed ? " completed" : "");

    div.innerHTML = `
      <p><strong>테이블 ${data.table}</strong> | 입금자: ${data.name}</p>
      <p>주문:<br>${itemList}</p>
      <p><strong>총 금액: ${total.toLocaleString()}원</strong></p>
      <small>${formattedDate}</small><br>
      <button class="toggle-btn">${btnText}</button>
      <button class="delete-btn">삭제</button>
    `;

    div.querySelector(".toggle-btn").onclick = async () => {
      await updateDoc(doc(db, "orders", id), {
        completed: !data.completed
      });
    };

    div.querySelector(".delete-btn").onclick = async () => {
      if (confirm("정말로 삭제하시겠습니까?")) {
        await deleteDoc(doc(db, "orders", id));
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

  renderOrders();
});

searchInput.addEventListener("input", renderOrders);
statusFilter.addEventListener("change", renderOrders);