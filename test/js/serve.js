import { db } from "./common.js";
import { appConfig } from "./appConfig.js";
import {
  formatOrderItemCount,
  normalizeComboRule,
  normalizeItemOptions
} from "./utils.js";
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
const staffRequestsList = document.getElementById("staffRequestsList");
const serveSearchInput = document.getElementById("serveSearchInput");
const serveFilter = document.getElementById("serveFilter");

let currentUser = "";
let allServeItems = [];
let allStaffRequests = [];

function getRequestCreatedAt(data) {
  const rawCreatedAt = data?.createdAt ?? data?.timestamp;

  if (typeof rawCreatedAt === "number") {
    return Number.isFinite(rawCreatedAt) && rawCreatedAt > 0 ? rawCreatedAt : null;
  }

  if (typeof rawCreatedAt === "string") {
    const parsedCreatedAt = Number(rawCreatedAt.trim());
    return Number.isFinite(parsedCreatedAt) && parsedCreatedAt > 0 ? parsedCreatedAt : null;
  }

  if (rawCreatedAt && typeof rawCreatedAt.toMillis === "function") {
    const millis = Number(rawCreatedAt.toMillis());
    return Number.isFinite(millis) && millis > 0 ? millis : null;
  }

  if (rawCreatedAt && typeof rawCreatedAt === "object") {
    const seconds = Number(rawCreatedAt.seconds);
    const nanoseconds = Number(rawCreatedAt.nanoseconds);

    if (!Number.isFinite(seconds) || !Number.isFinite(nanoseconds)) {
      return null;
    }

    const millis = seconds * 1000 + nanoseconds / 1000000;
    return Number.isFinite(millis) && millis > 0 ? millis : null;
  }

  return null;
}

function getServeDelayMeta(orderData) {
  const createdAt = getRequestCreatedAt(orderData);

  if (!createdAt) {
    return {
      label: "접수 시간 확인 불가",
      className: "is-muted"
    };
  }

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));

  if (elapsedMinutes >= 30) {
    return {
      label: `${elapsedMinutes}분 경과 · 긴급`,
      className: "is-urgent"
    };
  }

  if (elapsedMinutes >= 20) {
    return {
      label: `${elapsedMinutes}분 경과 · 지연`,
      className: "is-delayed"
    };
  }

  if (elapsedMinutes >= 15) {
    return {
      label: `${elapsedMinutes}분 경과 · 주의`,
      className: "is-warning"
    };
  }

  return {
    label: `${elapsedMinutes}분 경과`,
    className: "is-normal"
  };
}

function formatRequestElapsed(createdAt) {
  if (!createdAt) {
    return "접수 시간 확인 불가";
  }

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));

  if (elapsedMinutes < 1) {
    return "방금 접수";
  }

  return `${elapsedMinutes}분 전 접수`;
}

function getServeStatusMeta(itemStatus) {
  if (itemStatus === "서빙 예정") {
    return {
      label: "서빙 예정",
      className: "is-serving"
    };
  }

  if (itemStatus === "서빙 완료") {
    return {
      label: "서빙 완료",
      className: "is-done"
    };
  }

  return {
    label: "미배정",
    className: "is-pending"
  };
}

function getServeUnitOptions(item, countIndex) {
  return normalizeItemOptions(item.options)
    .filter((option) => countIndex < option.count)
    .map((option) => ({
      label: option.label,
      price: option.price,
      count: 1
    }));
}

function appendItemOptions(container, options) {
  normalizeItemOptions(options).forEach((option) => {
    const optionRow = document.createElement("div");
    optionRow.className = "serve-item-option";
    optionRow.style.marginTop = "4px";
    optionRow.style.fontSize = "13px";
    optionRow.style.color = "#666";
    optionRow.textContent = `└ ${option.label} ${option.count}개`;
    container.appendChild(optionRow);
  });
}

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

async function resolveStaffRequest(requestId) {
  await updateDoc(doc(db, "tableRequests", requestId), {
    status: "resolved",
    resolvedAt: Date.now()
  });
}

function renderStaffRequests() {
  if (!staffRequestsList) {
    return;
  }

  staffRequestsList.innerHTML = "";

  if (allStaffRequests.length === 0) {
    const empty = document.createElement("div");
    empty.className = "serve-staff-request-empty";
    empty.textContent = "대기 중인 직원 호출이 없습니다.";
    staffRequestsList.appendChild(empty);
    return;
  }

  allStaffRequests.forEach((request) => {
    const card = document.createElement("div");
    card.className = "serve-staff-request-card";
    card.dataset.requestId = request.id;

    const content = document.createElement("div");
    content.className = "serve-staff-request-content";

    const title = document.createElement("div");
    title.className = "serve-staff-request-title";
    title.textContent = `🔔 ${request.table}번 테이블 직원 호출`;

    const meta = document.createElement("div");
    meta.className = "serve-staff-request-meta";
    meta.textContent = formatRequestElapsed(request.createdAt);

    content.appendChild(title);
    content.appendChild(meta);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "serve-staff-request-resolve";
    button.textContent = "처리 완료";
    button.onclick = async () => {
      button.disabled = true;

      try {
        await resolveStaffRequest(request.id);
      } catch (error) {
        console.error("직원 호출 처리 실패:", error);
        alert("직원 호출 처리에 실패했어요.");
        button.disabled = false;
      }
    };

    card.appendChild(content);
    card.appendChild(button);
    staffRequestsList.appendChild(card);
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
      countText,
      itemStatus,
      assignedTo,
      serveEntry,
      displayOptions,
      isCombo,
      delayMeta
    } = itemData;

    if (itemStatus === "서빙 완료") return;

    const statusMeta = getServeStatusMeta(itemStatus);

    const div = document.createElement("div");
    div.className = "item";
    div.dataset.status = statusMeta.className;
    div.dataset.delayStatus = delayMeta.className;

    if (itemStatus === "서빙 예정") div.classList.add("serving");
    if (itemStatus === "서빙 완료") div.classList.add("done");

    const header = document.createElement("div");
    header.className = "serve-item-header";

    const titleRow = document.createElement("div");
    titleRow.className = "serve-item-title-row";

    const menuName = document.createElement("div");
    menuName.className = "serve-item-menu";
    menuName.textContent = item.name;

    const statusLabel = document.createElement("div");
    statusLabel.className = `serve-item-status ${statusMeta.className}`;
    statusLabel.textContent = statusMeta.label;

    titleRow.appendChild(menuName);
    titleRow.appendChild(statusLabel);

    const metaRow = document.createElement("div");
    metaRow.className = "serve-item-meta";

    const tableLabel = document.createElement("div");
    tableLabel.className = "serve-item-table";
    tableLabel.textContent = `테이블 ${table}`;

    metaRow.appendChild(tableLabel);

    const delayLabel = document.createElement("div");
    delayLabel.className = `serve-item-delay ${delayMeta.className}`;
    delayLabel.textContent = delayMeta.label;
    metaRow.appendChild(delayLabel);

    if (isCombo) {
      const countLabel = document.createElement("div");
      countLabel.className = "serve-item-count";
      countLabel.textContent = countText;
      metaRow.appendChild(countLabel);
    }

    const payerLabel = document.createElement("div");
    payerLabel.className = "serve-item-payer";
    payerLabel.textContent = `입금자 ${orderName}`;

    const assigneeLabel = document.createElement("div");
    assigneeLabel.className = "serve-item-assignee";
    assigneeLabel.textContent = assignedTo ? `담당 ${assignedTo}` : "담당 미배정";

    header.appendChild(titleRow);
    header.appendChild(metaRow);
    header.appendChild(payerLabel);
    header.appendChild(assigneeLabel);

    div.appendChild(header);

    if (displayOptions.length > 0) {
      const optionBlock = document.createElement("div");
      optionBlock.className = "serve-item-options";
      optionBlock.style.marginBottom = "8px";
      appendItemOptions(optionBlock, displayOptions);
      div.appendChild(optionBlock);
    }

    if (itemStatus === "주문 완료") {
      const btn = document.createElement("button");
      btn.textContent = "서빙 예정";
      btn.className = "assign";
      btn.onclick = async () => {
        await assignServe(orderId, serveId, serveEntry);
      };

      const actionRow = document.createElement("div");
      actionRow.className = "serve-item-actions";
      actionRow.appendChild(btn);
      div.appendChild(actionRow);
    } else if (itemStatus === "서빙 예정" && assignedTo === currentUser) {
      const btn = document.createElement("button");
      btn.textContent = "서빙 완료";
      btn.className = "complete";
      btn.onclick = async () => {
        await completeServe(orderId, serveId, serveEntry);
      };

      const actionRow = document.createElement("div");
      actionRow.className = "serve-item-actions";
      actionRow.appendChild(btn);
      div.appendChild(actionRow);
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
      const delayMeta = getServeDelayMeta(data);

      data.items.forEach((item, itemIndex) => {
        const comboRule = normalizeComboRule(item.comboRule);

        if (comboRule) {
          const serveId = `${orderId}_${itemIndex}_combo`;
          const serveEntry = serveStatus[serveId] || {};
          const itemStatus = serveEntry.status || "주문 완료";
          const assignedTo = serveEntry.assignedTo || null;

          allServeItems.push({
            orderId,
            serveId,
            table: data.table,
            orderName: data.name,
            item,
            countText: formatOrderItemCount(item),
            displayOptions: normalizeItemOptions(item.options),
            isCombo: true,
            itemStatus,
            assignedTo,
            serveEntry,
            delayMeta
          });
          return;
        }

        for (let countIndex = 0; countIndex < item.count; countIndex++) {
          const serveId = `${orderId}_${itemIndex}_${countIndex}`;
          const serveEntry = serveStatus[serveId] || {};
          const itemStatus = serveEntry.status || "주문 완료";
          const assignedTo = serveEntry.assignedTo || null;
          const displayOptions = getServeUnitOptions(item, countIndex);

          allServeItems.push({
            orderId,
            serveId,
            table: data.table,
            orderName: data.name,
            item,
            countText: "1개",
            displayOptions,
            isCombo: false,
            itemStatus,
            assignedTo,
            serveEntry,
            delayMeta
          });
        }
      });
    });

    renderServeItems();
  });

  const staffRequestsQuery = query(
    collection(db, "tableRequests"),
    where("type", "==", "staff"),
    where("status", "==", "pending")
  );

  onSnapshot(staffRequestsQuery, (snapshot) => {
    allStaffRequests = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();

        return {
          id: docSnap.id,
          table: String(data.table || ""),
          createdAt: getRequestCreatedAt(data)
        };
      })
      .sort((left, right) => {
        const leftCreatedAt = left.createdAt ?? Number.MAX_SAFE_INTEGER;
        const rightCreatedAt = right.createdAt ?? Number.MAX_SAFE_INTEGER;

        if (leftCreatedAt !== rightCreatedAt) {
          return leftCreatedAt - rightCreatedAt;
        }

        return Number(left.table) - Number(right.table);
      });

    renderStaffRequests();
  });

  serveSearchInput.addEventListener("input", renderServeItems);
  serveFilter.addEventListener("change", renderServeItems);
});
