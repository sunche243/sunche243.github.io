import { db } from "./common.js";
import { priceMap } from "./menuData.js";

import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

const totalSalesEl = document.getElementById("totalSales");
const totalCountEl = document.getElementById("totalCount");
const menuStatsEl = document.getElementById("menuStats");

onSnapshot(collection(db, "orders"), (snapshot) => {

  let totalSales = 0;
  let totalCount = 0;
  const menuCount = {};

  snapshot.forEach(doc => {
    const data = doc.data();

    data.items.forEach(item => {
      totalCount += item.count;
      totalSales += (priceMap[item.name] || 0) * item.count;

      if (!menuCount[item.name]) menuCount[item.name] = 0;
      menuCount[item.name] += item.count;
    });
  });

  totalSalesEl.textContent = totalSales.toLocaleString() + "원";
  totalCountEl.textContent = totalCount + "개";

  menuStatsEl.innerHTML = "";

  Object.entries(menuCount).forEach(([name, count]) => {
    const div = document.createElement("div");
    div.textContent = `${name} : ${count}개`;
    menuStatsEl.appendChild(div);
  });
});