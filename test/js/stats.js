import { db } from "./common.js";
import {
  formatPrice,
  formatCount,
  formatDate,
  formatOrderItemCount,
  calculateOrderTotal,
  calculateOrderItemTotal
} from "./utils.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

const totalSalesEl = document.getElementById("totalSales");
const totalCountEl = document.getElementById("totalCount");
const totalOrdersEl = document.getElementById("totalOrders");
const averageSalesEl = document.getElementById("averageSales");
const averageServeTimeEl = document.getElementById("averageServeTime");
const completedServeCountEl = document.getElementById("completedServeCount");
const fastestServeTimeEl = document.getElementById("fastestServeTime");
const slowestServeTimeEl = document.getElementById("slowestServeTime");
const bestMenuEl = document.getElementById("bestMenu");
const topSalesMenuEl = document.getElementById("topSalesMenu");
const hourlyOrderStatsEl = document.getElementById("hourlyOrderStats");
const menuCountStatsEl = document.getElementById("menuCountStats");
const menuSalesStatsEl = document.getElementById("menuSalesStats");
const staffPerformanceStatsEl = document.getElementById("staffPerformanceStats");
const staffPerformanceDetailsEl = document.getElementById("staffPerformanceDetails");

function createHourlyMap() {
  const map = {};
  for (let hour = 0; hour < 24; hour += 1) {
    map[`${String(hour).padStart(2, "0")}시`] = 0;
  }
  return map;
}

function renderStatsList(container, dataMap, formatter) {
  container.innerHTML = "";

  const entries = Object.entries(dataMap);

  entries.forEach(([name, value]) => {
    const row = document.createElement("div");
    row.className = "stats-row";
    row.classList.add("stats-row-card");
    row.dataset.rowType = "default";

    const nameEl = document.createElement("span");
    nameEl.className = "stats-row-name";
    nameEl.classList.add("stats-row-label");
    nameEl.textContent = name;

    const valueEl = document.createElement("span");
    valueEl.className = "stats-row-value";
    valueEl.classList.add("stats-row-metric");
    valueEl.textContent = formatter(value);

    row.appendChild(nameEl);
    row.appendChild(valueEl);
    container.appendChild(row);
  });
}

function renderSortedStatsList(container, dataMap, formatter) {
  container.innerHTML = "";

  const entries = Object.entries(dataMap).sort((a, b) => b[1] - a[1]);

  entries.forEach(([name, value], index) => {
    const row = document.createElement("div");
    row.className = "stats-row";
    row.classList.add("stats-row-card");
    row.dataset.rowType = "ranked";

    const mainEl = document.createElement("div");
    mainEl.className = "stats-row-main";

    const rankEl = document.createElement("span");
    rankEl.className = "stats-row-rank";
    rankEl.textContent = String(index + 1).padStart(2, "0");

    const nameEl = document.createElement("span");
    nameEl.className = "stats-row-name";
    nameEl.classList.add("stats-row-label");
    nameEl.textContent = name;

    const valueEl = document.createElement("span");
    valueEl.className = "stats-row-value";
    valueEl.classList.add("stats-row-metric");
    valueEl.textContent = formatter(value);

    mainEl.appendChild(rankEl);
    mainEl.appendChild(nameEl);

    row.appendChild(mainEl);
    row.appendChild(valueEl);
    container.appendChild(row);
  });
}

function findTopEntry(dataMap, formatter) {
  const entries = Object.entries(dataMap).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0 || entries[0][1] === 0) {
    return "-";
  }

  const [name, value] = entries[0];
  return `${name} (${formatter(value)})`;
}

function getServeStaffName(entry) {
  return String(entry?.assignedTo || entry?.serverName || "담당자 미지정").trim() || "담당자 미지정";
}

function ensureStaffPerformanceEntry(map, staffName) {
  if (!map[staffName]) {
    map[staffName] = {
      completed: 0,
      inProgress: 0,
      details: []
    };
  }

  return map[staffName];
}

function parseServeId(orderId, serveId) {
  const prefix = `${orderId}_`;

  if (!String(serveId).startsWith(prefix)) {
    return null;
  }

  const parts = String(serveId).slice(prefix.length).split("_");
  const itemIndex = Number(parts[0]);

  if (!Number.isInteger(itemIndex) || itemIndex < 0) {
    return null;
  }

  if (parts[1] === "combo") {
    return {
      itemIndex,
      countIndex: null,
      isCombo: true
    };
  }

  const countIndex = Number(parts[1]);

  if (!Number.isInteger(countIndex) || countIndex < 0) {
    return null;
  }

  return {
    itemIndex,
    countIndex,
    isCombo: false
  };
}

function renderStaffPerformanceDetails(container, staffName, details) {
  container.innerHTML = "";

  const title = document.createElement("div");
  title.className = "stats-staff-details-title";
  title.textContent = `${staffName} 처리 상세 내역`;
  container.appendChild(title);

  if (details.length === 0) {
    const empty = document.createElement("div");
    empty.className = "stats-staff-details-empty";
    empty.textContent = "표시할 처리 내역이 없습니다.";
    container.appendChild(empty);
    return;
  }

  details.forEach((detail) => {
    const row = document.createElement("div");
    row.className = "stats-staff-detail-row";

    row.innerHTML = `
      <div class="stats-staff-detail-main">
        <strong>테이블 ${detail.table} · ${detail.menuName}</strong>
        <span>${detail.countText} · ${detail.status}</span>
      </div>
      <div class="stats-staff-detail-meta">
        <span>주문 ${detail.orderTime}</span>
        <span>배정 ${detail.assignedAt}</span>
        <span>완료 ${detail.completedAt}</span>
      </div>
    `;

    container.appendChild(row);
  });
}

function renderStaffPerformance(container, dataMap, totalCompletedCount) {
  container.innerHTML = "";
  staffPerformanceDetailsEl.innerHTML = "";

  const entries = Object.entries(dataMap).sort((a, b) => {
    const completedDiff = b[1].completed - a[1].completed;
    if (completedDiff !== 0) {
      return completedDiff;
    }

    return b[1].inProgress - a[1].inProgress;
  });

  if (entries.length === 0) {
    const emptyRow = document.createElement("div");
    emptyRow.className = "stats-row stats-row-card";
    emptyRow.textContent = "직원별 서빙 기록이 없습니다.";
    container.appendChild(emptyRow);
    return;
  }

  entries.forEach(([staffName, stats], index) => {
    const ratio = totalCompletedCount > 0
      ? Math.round((stats.completed / totalCompletedCount) * 100)
      : 0;
    const row = document.createElement("div");
    row.className = "stats-row stats-row-card stats-staff-row";
    row.dataset.rowType = "ranked";

    const mainEl = document.createElement("div");
    mainEl.className = "stats-row-main";

    const rankEl = document.createElement("span");
    rankEl.className = "stats-row-rank";
    rankEl.textContent = String(index + 1).padStart(2, "0");

    const nameEl = document.createElement("span");
    nameEl.className = "stats-row-name stats-row-label";
    nameEl.textContent = staffName;

    const metricsEl = document.createElement("div");
    metricsEl.className = "stats-staff-metrics";
    const completedEl = document.createElement("span");
    completedEl.textContent = `완료 ${stats.completed}건`;

    const inProgressEl = document.createElement("span");
    inProgressEl.textContent = `진행 ${stats.inProgress}건`;

    const ratioEl = document.createElement("strong");
    ratioEl.textContent = `${ratio}%`;

    const detailBtn = document.createElement("button");
    detailBtn.type = "button";
    detailBtn.className = "stats-staff-detail-btn";
    detailBtn.textContent = "상세 보기";
    detailBtn.onclick = () => {
      renderStaffPerformanceDetails(staffPerformanceDetailsEl, staffName, stats.details);
    };

    metricsEl.appendChild(completedEl);
    metricsEl.appendChild(inProgressEl);
    metricsEl.appendChild(ratioEl);
    metricsEl.appendChild(detailBtn);

    mainEl.appendChild(rankEl);
    mainEl.appendChild(nameEl);
    row.appendChild(mainEl);
    row.appendChild(metricsEl);
    container.appendChild(row);
  });
}

function formatMinutes(ms) {
  if (!ms || ms < 0) return "-";

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}초`;
  }

  return `${minutes}분 ${seconds}초`;
}

onSnapshot(collection(db, "orders"), (snapshot) => {
  let totalSales = 0;
  let totalCount = 0;
  let totalOrders = 0;

  const hourlyOrderMap = createHourlyMap();
  const menuCountMap = {};
  const menuSalesMap = {};
  const staffPerformanceMap = {};
  const serveDurations = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    if (data.deleted) return;
    if (!Array.isArray(data.items) || data.items.length === 0) return;

    totalOrders += 1;
    totalSales += calculateOrderTotal(data.items);

    if (data.timestamp) {
      const hour = new Date(data.timestamp).getHours();
      const hourKey = `${String(hour).padStart(2, "0")}시`;
      if (hourlyOrderMap[hourKey] !== undefined) {
        hourlyOrderMap[hourKey] += 1;
      }
    }

    data.items.forEach((item) => {
      const itemName = item.name;
      const itemCount = Number(item.count) || 0;
      const itemSales = calculateOrderItemTotal(item);

      totalCount += itemCount;

      if (menuCountMap[itemName] === undefined) {
        menuCountMap[itemName] = 0;
      }

      if (menuSalesMap[itemName] === undefined) {
        menuSalesMap[itemName] = 0;
      }

      menuCountMap[itemName] += itemCount;
      menuSalesMap[itemName] += itemSales;
    });

    const serveStatus = data.serveStatus || {};
    Object.entries(serveStatus).forEach(([serveId, entry]) => {
      if (entry?.status === "서빙 완료" || entry?.status === "서빙 예정") {
        const staffName = getServeStaffName(entry);
        const staffStats = ensureStaffPerformanceEntry(
          staffPerformanceMap,
          staffName
        );

        if (entry.status === "서빙 완료") {
          staffStats.completed += 1;
        } else {
          staffStats.inProgress += 1;
        }

        const parsedServeId = parseServeId(docSnap.id, serveId);
        const item = parsedServeId ? data.items[parsedServeId.itemIndex] : null;

        staffStats.details.push({
          table: data.table || "-",
          orderTime: data.timestamp ? formatDate(data.timestamp) : "-",
          menuName: item?.name || "메뉴 확인 불가",
          countText: item
            ? (parsedServeId?.isCombo ? formatOrderItemCount(item) : "1개")
            : "-",
          status: entry.status,
          assignedAt: entry.assignedAt ? formatDate(entry.assignedAt) : "-",
          completedAt: entry.completedAt ? formatDate(entry.completedAt) : "-"
        });
      }

      if (
        entry &&
        entry.status === "서빙 완료" &&
        typeof entry.completedAt === "number" &&
        typeof data.timestamp === "number"
      ) {
        const duration = entry.completedAt - data.timestamp;
        if (duration >= 0) {
          serveDurations.push(duration);
        }
      }
    });
  });

  const averageSales = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

  let averageServeTime = "-";
  let fastestServeTime = "-";
  let slowestServeTime = "-";

  if (serveDurations.length > 0) {
    const totalServeTime = serveDurations.reduce((sum, value) => sum + value, 0);
    const avgServeMs = Math.round(totalServeTime / serveDurations.length);
    const minServeMs = Math.min(...serveDurations);
    const maxServeMs = Math.max(...serveDurations);

    averageServeTime = formatMinutes(avgServeMs);
    fastestServeTime = formatMinutes(minServeMs);
    slowestServeTime = formatMinutes(maxServeMs);
  }

  totalSalesEl.textContent = formatPrice(totalSales);
  totalCountEl.textContent = formatCount(totalCount);
  totalOrdersEl.textContent = `${totalOrders}건`;
  averageSalesEl.textContent = formatPrice(averageSales);
  averageServeTimeEl.textContent = averageServeTime;
  completedServeCountEl.textContent = formatCount(serveDurations.length);
  fastestServeTimeEl.textContent = fastestServeTime;
  slowestServeTimeEl.textContent = slowestServeTime;

  bestMenuEl.textContent = findTopEntry(menuCountMap, formatCount);
  topSalesMenuEl.textContent = findTopEntry(menuSalesMap, formatPrice);

  renderStatsList(hourlyOrderStatsEl, hourlyOrderMap, (value) => `${value}건`);
  renderSortedStatsList(menuCountStatsEl, menuCountMap, formatCount);
  renderSortedStatsList(menuSalesStatsEl, menuSalesMap, formatPrice);
  renderStaffPerformance(staffPerformanceStatsEl, staffPerformanceMap, serveDurations.length);
});
