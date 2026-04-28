import { db } from "./common.js";
import {
  parseItems,
  formatPrice,
  calculateOrderTotal,
  getPageParams
} from "./utils.js";
import { appConfig } from "./appConfig.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

let paymentSettings = {
  bankName: "SC제일은행",
  accountNo: "10820272218",
  accountHolder: "박찬준"
};

function buildAccountText(settings) {
  return `${settings.bankName} ${settings.accountNo} (${settings.accountHolder})`;
}

function buildTossSendLink(amount, bankName, accountNo) {
  const encodedBank = encodeURIComponent(bankName);
  const cleanAccountNo = String(accountNo).replace(/[^0-9]/g, "");

  return `supertoss://send?amount=${amount}&bank=${encodedBank}&accountNo=${cleanAccountNo}&origin=qr`;
}

async function loadPaymentSettings() {
  try {
    const settingsRef = doc(db, "settings", "public");
    const snapshot = await getDoc(settingsRef);

    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();

    paymentSettings = {
      bankName: data.bankName || paymentSettings.bankName,
      accountNo: data.accountNo || paymentSettings.accountNo,
      accountHolder: data.accountHolder || paymentSettings.accountHolder
    };
  } catch (error) {
    console.error("결제 설정 불러오기 실패:", error);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadPaymentSettings();

  const params = getPageParams();

  const table = params.get("table") || "-";
  const name = params.get("name") || "-";
  const itemString = params.get("items") || "";

  const tableNumEl = document.getElementById("tableNum");
  const payerEl = document.getElementById("payer");
  const itemsEl = document.getElementById("items");
  const totalPriceEl = document.getElementById("totalPrice");
  const accountNumberEl = document.getElementById("accountNumber");
  const copyBtn = document.getElementById("copyBtn");
  const tossBtn = document.getElementById("tossBtn");
  const copyMsg = document.getElementById("copyMsg");

  tableNumEl.textContent = table;
  payerEl.textContent = name;

  const accountText = buildAccountText(paymentSettings);
  accountNumberEl.textContent = accountText;

  const items = parseItems(itemString);
  const total = calculateOrderTotal(items);

  itemsEl.innerHTML = "";

  if (items.length === 0) {
    itemsEl.textContent = "주문한 메뉴가 없어요.";
  } else {
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "check-item-row";

      const left = document.createElement("span");
      left.className = "check-item-name";
      left.textContent = item.name;

      const right = document.createElement("strong");
      right.className = "check-item-count";
      right.textContent = `${item.count}개`;

      row.appendChild(left);
      row.appendChild(right);
      itemsEl.appendChild(row);
    });
  }

  totalPriceEl.textContent = formatPrice(total);

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(accountText).then(() => {
      copyMsg.style.display = "block";

      setTimeout(() => {
        copyMsg.style.display = "none";
      }, 2000);
    });
  };

  tossBtn.onclick = () => {
    if (!total || total <= 0) {
      alert("송금할 금액을 확인할 수 없어요.");
      return;
    }

    const tossLink = buildTossSendLink(
      total,
      paymentSettings.bankName,
      paymentSettings.accountNo
    );

    window.location.href = tossLink;
  };
});