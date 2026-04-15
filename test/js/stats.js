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
const bestMenuEl = document.getElementById("bestMenu");
const topSalesMenuEl = document.getElementById("topSalesMenu");
const menuCountStatsEl = document.getElementById("menuCountStats");
const menuSalesStatsEl = document.getElementById("menuSalesStats");

function createEmptyMenuMap() {
  const map = {};
  menuItems.forEach((item) => {
    map[item.name] = 0;
  });
  return map;
}

function renderStatsList(container, dataMap, formatter) {
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

  const menuCountMap = createEmptyMenuMap();
  const menuSalesMap = createEmptyMenuMap();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return;
    }

    totalOrders += 1;
    totalSales += calculateOrderTotal(data.items, priceMap);

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
  });

  const averageSales = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

  totalSalesEl.textContent = formatPrice(totalSales);
  totalCountEl.textContent = formatCount(totalCount);
  totalOrdersEl.textContent = `${totalOrders}건`;
  averageSalesEl.textContent = formatPrice(averageSales);

  bestMenuEl.textContent = findTopEntry(menuCountMap, formatCount);
  topSalesMenuEl.textContent = findTopEntry(menuSalesMap, formatPrice);

  renderStatsList(menuCountStatsEl, menuCountMap, formatCount);
  renderStatsList(menuSalesStatsEl, menuSalesMap, formatPrice);
});