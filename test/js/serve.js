import { db } from "./common.js";
import { appConfig } from "./appConfig.js";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

const container = document.getElementById("orders");
const serveSearchInput = document.getElementById("serveSearchInput");
const serveFilter = document.getElementById("serveFilter");

let currentUser = "";
let allServeItems = [];

function matchesSearch(itemData, keyword) {
  if (!keyword) return true;

  const lowerKeyword = keyword.toLowerCase();
  const menuName = String(itemData.item.name || "").toLowerCase();
  const payerName = String(itemData.orderName || "").toLowerCase();
  const tableText = String(itemData.table || "").toLowerCase();

  return (
    menuName.includes(lowerKeyword) ||
    payerName.includes(lowerKeyword) ||
    tableText.includes(lowerKeyword)
  );
}

function matchesFilter(itemData, filterValue) {
  if (filterValue === "all") return true;
  if (filterValue === "unassigned") return itemData.itemStatus === "주문 완료";
  if (filterValue === "mine") return itemData.assignedTo === currentUser;
  return true;
}

async function assignServe(orderId, serveId, serveEntry = {}) {
  await updateDoc(doc(db, "orders", orderId), {
    [`serveStatus.${serveId}`]: {
      status: "서빙 예정",
      assignedTo: currentUser,
      assignedAt: serveEntry.assignedAt || Date.now()
    }
  });
}

async function completeServe(orderId, serveId, serveEntry = {}) {
  await updateDoc(doc(db, "orders", orderId), {
    [`serveStatus.${serveId}`]: {
      status: "서빙 완료",
      assignedTo: currentUser,
      assignedAt: serveEntry.assignedAt || Date.now(),
      completedAt: Date.now()
    }
  });
}

function renderServeItems() {
  const keyword = serveSearchInput.value.trim();
  const filterValue = serveFilter.value;

  container.innerHTML = "";

  const filteredItems = allServeItems.filter((itemData) => {
    return matchesSearch(itemData, keyword) && matchesFilter(itemData, filterValue);
  });

  filteredItems.forEach((itemData) => {
    const {
      orderId,
      serveId,
      table,
      orderName,
      item,
      itemStatus,
      assignedTo,
      serveEntry
    } = itemData;

    if (itemStatus === "서빙 완료") return;

    const div = document.createElement("div");
    div.className = "item";

    if (itemStatus === "서빙 예정") div.classList.add("serving");
    if (itemStatus === "서빙 완료") div.classList.add("done");

    div.innerHTML = `
      <p><strong>${item.name}</strong></p>
      <p>테이블: ${table}</p>
      <p>입금자: ${orderName}</p>
      <p>상태: ${itemStatus}${assignedTo ? ` (${assignedTo})` : ""}</p>
    `;

    if (itemStatus === "주문 완료") {
      const btn = document.createElement("button");
      btn.textContent = "서빙 예정";
      btn.className = "assign";
      btn.onclick = async () => {
        await assignServe(orderId, serveId, serveEntry);
      };
      div.appendChild(btn);
    } else if (itemStatus === "서빙 예정" && assignedTo === currentUser) {
      const btn = document.createElement("button");
      btn.textContent = "서빙 완료";
      btn.className = "complete";
      btn.onclick = async () => {
        await completeServe(orderId, serveId, serveEntry);
      };
      div.appendChild(btn);
    }

    container.appendChild(div);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  currentUser = localStorage.getItem("serverName") || "";

  if (!currentUser) {
    currentUser = prompt("당신의 이름을 입력해 주세요 (서빙 담당자)");
    if (currentUser) {
      localStorage.setItem("serverName", currentUser);
    } else {
      location.reload();
      return;
    }
  }

  if (!appConfig.allowedNames.includes(currentUser)) {
    alert("접근 권한이 없습니다.");
    localStorage.removeItem("serverName");
    location.reload();
    return;
  }

  const q = query(
    collection(db, "orders"),
    where("completed", "==", true),
    orderBy("timestamp", "desc")
  );

  onSnapshot(q, (snapshot) => {
    allServeItems = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const orderId = docSnap.id;

      if (data.deleted) return;
      if (!Array.isArray(data.items)) return;

      const serveStatus = data.serveStatus || {};

      data.items.forEach((item, itemIndex) => {
        for (let countIndex = 0; countIndex < item.count; countIndex++) {
          const serveId = `${orderId}_${itemIndex}_${countIndex}`;
          const serveEntry = serveStatus[serveId] || {};
          const itemStatus = serveEntry.status || "주문 완료";
          const assignedTo = serveEntry.assignedTo || null;

          allServeItems.push({
            orderId,
            serveId,
            table: data.table,
            orderName: data.name,
            item,
            itemStatus,
            assignedTo,
            serveEntry
          });
        }
      });
    });

    renderServeItems();
  });

  serveSearchInput.addEventListener("input", renderServeItems);
  serveFilter.addEventListener("change", renderServeItems);
});