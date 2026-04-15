import { saveOrder } from "./order.js";
import { parseItems } from "./utils.js";
import { priceMap } from "./menuData.js";

window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);

  const table = params.get("table") || "-";
  const name = params.get("name") || "-";
  const itemString = params.get("items") || "";

  document.getElementById("tableNum").textContent = table;
  document.getElementById("payer").textContent = name;

  const items = parseItems(itemString);

  let total = 0;

  const listHtml = items.map(item => {
    const price = priceMap[item.name] || 0;
    total += price * item.count;
    return `${item.name} ${item.count}개`;
  }).join("<br>");

  document.getElementById("items").innerHTML = listHtml;
  document.getElementById("totalPrice").textContent = `총 금액: ${total.toLocaleString()}원`;

  document.getElementById("goBack").onclick = () => {
    const query = new URLSearchParams({ table, name, items: itemString }).toString();
    window.location.href = `menu.html?${query}`;
  };

  document.getElementById("goConfirm").onclick = async () => {
    const spinner = document.getElementById("spinner");
    const btn = document.getElementById("goConfirm");

    spinner.style.display = "block";
    btn.disabled = true;

    try {
      await saveOrder({
        table,
        name,
        items
      });
    } catch (e) {
      alert("주문 실패");
      spinner.style.display = "none";
      btn.disabled = false;
      return;
    }

    const query = new URLSearchParams({ table, name, items: itemString }).toString();
    window.location.href = `thankyou.html?${query}`;
  };
});