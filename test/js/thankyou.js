import { parseItems } from "./utils.js";
import { priceMap } from "./menuData.js";

window.addEventListener("DOMContentLoaded", () => {

  const params = new URLSearchParams(window.location.search);

  const table = params.get("table") || "-";
  let name = params.get("name") || "-";
  const itemString = params.get("items") || "";

  document.getElementById("tableNum").textContent = table;
  document.getElementById("payer").textContent = name;

  const items = parseItems(itemString);

  let total = 0;
  let html = "";

  items.forEach(item => {
    const price = priceMap[item.name] || 0;
    total += price * item.count;
    html += `${item.name} ${item.count}개<br>`;
  });

  document.getElementById("items").innerHTML = html;
  document.getElementById("totalPrice").textContent = `총 금액: ${total.toLocaleString()}원`;

  document.getElementById("copyBtn").onclick = () => {
    const text = "SC제일은행 10820272218 (박찬준)";

    navigator.clipboard.writeText(text).then(() => {
      const msg = document.getElementById("copyMsg");
      msg.style.display = "block";

      setTimeout(() => {
        msg.style.display = "none";
      }, 2000);
    });
  };

});