import { db } from "./common.js";
import { menuItems, priceMap } from "./menuData.js";
import {
  formatPrice,
  formatCount,
  calculateOrderTotal
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

function createEmptyMenuMap() {
  const map = {};
  menuItems.forEach((item) => {
    map[item.name] = 0;
  });
  return map;
}

function createHourlyMap() {
  const map = {};
  for (let hour = 0; hour < 24; hour += 1) {
    const key = `${String(hour).padStart(2, "0")}시`;
    map[key] = 0;
  }
  return map;
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

function renderStatsList(container, dataMap, formatter) {
  container.innerHTML = "";

  const entries = Object.entries(dataMap);

  entries.forEach(([name, value]) => {
    const row = document.createElement("div");
    row.className = "stats-row";

    const nameEl = document.createElement("span");
    nameEl.className = "stats-row-name";
    nameEl.textContent = name;

    const valueEl = document.createElement("span");
    valueEl.className = "stats-row-value";
    valueEl.textContent = formatter(value);

    row.appendChild(nameEl);
    row.appendChild(valueEl);
    container.appendChild(row);
  });
}

function renderSortedStatsList(container, dataMap, formatter) {
  container.innerHTML = "";

  const entries = Object.entries(dataMap).sort((a, b) => b[1] - a[1]);

  entries.forEach(([name, value]) => {
    const row = document.createElement("div");
    row.className = "stats-row";

    const nameEl = document.createElement("span");
    nameEl.className = "stats-row-name";
    nameEl.textContent = name;

    const valueEl = document.createElement("span");
    valueEl.className = "stats-row-value";
    valueEl.textContent = formatter(value);

    row.appendChild(nameEl);
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

onSnapshot(collection(db, "orders"), (snapshot) => {
  let totalSales = 0;
  let totalCount = 0;
  let totalOrders = 0;

  const hourlyOrderMap = createHourlyMap();
  const menuCountMap = createEmptyMenuMap();
  const menuSalesMap = createEmptyMenuMap();
  const serveDurations = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    if (data.deleted) return;
    if (!Array.isArray(data.items) || data.items.length === 0) return;

    totalOrders += 1;
    totalSales += calculateOrderTotal(data.items, priceMap);

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
      const itemPrice = priceMap[itemName] || 0;
      const itemSales = itemPrice * itemCount;

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
    Object.values(serveStatus).forEach((entry) => {
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
});