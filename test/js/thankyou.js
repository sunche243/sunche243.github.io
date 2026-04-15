import {
  parseItems,
  formatPrice,
  calculateOrderTotal,
  getPageParams
} from "./utils.js";
import { priceMap } from "./menuData.js";
import { appConfig } from "./appConfig.js";

window.addEventListener("DOMContentLoaded", () => {
  const params = getPageParams();

  const table = params.get("table") || "-";
  const name = params.get("name") || "-";
  const itemString = params.get("items") || "";

  document.getElementById("tableNum").textContent = table;
  document.getElementById("payer").textContent = name;
  document.getElementById("accountNumber").textContent = appConfig.accountText;

  const items = parseItems(itemString);
  const total = calculateOrderTotal(items, priceMap);

  const html = items
    .map((item) => `${item.name} ${item.count}개`)
    .join("<br>");

  document.getElementById("items").innerHTML = html;
  document.getElementById("totalPrice").textContent = `총 금액: ${formatPrice(total)}`;

  document.getElementById("copyBtn").onclick = () => {
    navigator.clipboard.writeText(appConfig.accountText).then(() => {
      const msg = document.getElementById("copyMsg");
      msg.style.display = "block";

      setTimeout(() => {
        msg.style.display = "none";
      }, 2000);
    });
  };
});