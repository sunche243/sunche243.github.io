import { db } from "./common.js";
import {
  formatDate,
  formatPrice,
  normalizeTableNumber,
  isValidTableNumber,
  normalizeComboRule
} from "./utils.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";

const TABLE_COUNT = 100;
const DEFAULT_SEAT_FEE_PER_PERSON = 10000;
const ADMIN_EMAILS = ["starcj7@naver.com"];
const auth = getAuth();

const authRequiredBox = document.getElementById("authRequiredBox");
const tableManagerContent = document.getElementById("tableManagerContent");
const occupiedTableCountEl = document.getElementById("occupiedTableCount");
const emptyTableCountEl = document.getElementById("emptyTableCount");
const activeSessionCountEl = document.getElementById("activeSessionCount");
const tableGrid = document.getElementById("tableGrid");

let tablesMap = {};
let unsubscribeTables = null;

function isAdminEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  return ADMIN_EMAILS.some((adminEmail) => {
    return String(adminEmail).trim().toLowerCase() === normalizedEmail;
  });
}

function createSessionId(tableNumber) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `table-${tableNumber}-${window.crypto.randomUUID()}`;
  }

  return `table-${tableNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getDefaultTableData() {
  return {
    status: "empty",
    currentSessionId: null,
    headCount: null,
    paidSeatCount: null,
    seatFeePerPerson: DEFAULT_SEAT_FEE_PER_PERSON,
    startedAt: null,
    endedAt: null
  };
}

function getTableData(tableNumber) {
  return {
    ...getDefaultTableData(),
    ...(tablesMap[String(tableNumber)] || {})
  };
}

function parseCountInput(value, label, allowZero = false) {
  const raw = String(value ?? "").trim();

  if (!/^\d+$/.test(raw)) {
    alert(`${label}은 숫자로 입력해 주세요.`);
    return null;
  }

  const count = parseInt(raw, 10);

  if (allowZero) {
    if (count < 0) {
      alert(`${label}은 0명 이상이어야 합니다.`);
      return null;
    }
    return count;
  }

  if (count < 1) {
    alert(`${label}은 1명 이상이어야 합니다.`);
    return null;
  }

  return count;
}

function normalizeSeatFeePerPerson(value) {
  const seatFeePerPerson = parseInt(value, 10);

  if (!Number.isFinite(seatFeePerPerson) || seatFeePerPerson <= 0) {
    return DEFAULT_SEAT_FEE_PER_PERSON;
  }

  return seatFeePerPerson;
}

function getStoredCount(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const count = Number(value);

  if (!Number.isFinite(count) || count < 0) {
    return null;
  }

  return count;
}

function getSeatFeeChargedCount(tableData) {
  const paidSeatCount = getStoredCount(tableData?.paidSeatCount);

  if (paidSeatCount !== null) {
    return paidSeatCount;
  }

  return getStoredCount(tableData?.headCount) ?? 0;
}

function getSeatFeeTotal(tableData) {
  return getSeatFeeChargedCount(tableData) * normalizeSeatFeePerPerson(tableData?.seatFeePerPerson);
}

async function getConfiguredSeatFeePerPerson() {
  try {
    const settingsRef = doc(db, "settings", "public");
    const snapshot = await getDoc(settingsRef);

    if (!snapshot.exists()) {
      return DEFAULT_SEAT_FEE_PER_PERSON;
    }

    return normalizeSeatFeePerPerson(snapshot.data()?.seatFeePerPerson);
  } catch (error) {
    console.error("자릿세 설정 조회 실패:", error);
    return DEFAULT_SEAT_FEE_PER_PERSON;
  }
}

async function readLatestTableData(tableNumber) {
  const tableRef = doc(db, "tables", String(tableNumber));
  const snapshot = await getDoc(tableRef);

  if (!snapshot.exists()) {
    return getDefaultTableData();
  }

  return {
    ...getDefaultTableData(),
    ...snapshot.data()
  };
}

function hasUnfinishedServeItems(orderId, orderData) {
  if (orderData.deleted) {
    return false;
  }

  if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
    return false;
  }

  const serveStatus = orderData.serveStatus || {};

  for (let itemIndex = 0; itemIndex < orderData.items.length; itemIndex += 1) {
    const item = orderData.items[itemIndex];
    const comboRule = normalizeComboRule(item?.comboRule);

    if (comboRule) {
      const comboServeId = `${orderId}_${itemIndex}_combo`;
      const comboServeEntry = serveStatus[comboServeId];

      if (!comboServeEntry || comboServeEntry.status !== "서빙 완료") {
        return true;
      }

      continue;
    }

    const itemCount = Number(item.count) || 0;

    for (let countIndex = 0; countIndex < itemCount; countIndex += 1) {
      const serveId = `${orderId}_${itemIndex}_${countIndex}`;
      const serveEntry = serveStatus[serveId];

      if (!serveEntry || serveEntry.status !== "서빙 완료") {
        return true;
      }
    }
  }

  return false;
}

async function getExitBlockReason(sessionId) {
  const ordersQuery = query(
    collection(db, "orders"),
    where("sessionId", "==", String(sessionId))
  );
  const snapshot = await getDocs(ordersQuery);

  let hasPendingOrders = false;
  let hasPendingServeItems = false;

  snapshot.forEach((docSnap) => {
    const orderData = docSnap.data();

    if (orderData.deleted) {
      return;
    }

    if (orderData.completed !== true) {
      hasPendingOrders = true;
    }

    if (hasUnfinishedServeItems(docSnap.id, orderData)) {
      hasPendingServeItems = true;
    }
  });

  if (hasPendingOrders) {
    return "미확인 주문이 남아 있어 퇴장 처리할 수 없습니다.";
  }

  if (hasPendingServeItems) {
    return "서빙 완료되지 않은 항목이 남아 있어 퇴장 처리할 수 없습니다.";
  }

  return "";
}

function resetTableManagerState() {
  tablesMap = {};
  occupiedTableCountEl.textContent = "0개";
  emptyTableCountEl.textContent = `${TABLE_COUNT}개`;
  activeSessionCountEl.textContent = "0개";
  tableGrid.innerHTML = "";
}

function showLoggedOutUI() {
  authRequiredBox.textContent = "관리자 로그인이 필요합니다. menuManager에서 로그인 후 다시 접속해 주세요.";
  authRequiredBox.style.display = "block";
  tableManagerContent.style.display = "none";
}

function showUnauthorizedUI() {
  authRequiredBox.textContent = "테이블 관리 권한이 없습니다.";
  authRequiredBox.style.display = "block";
  tableManagerContent.style.display = "none";
}

function showLoggedInUI() {
  authRequiredBox.style.display = "none";
  tableManagerContent.style.display = "block";
}

function renderSummary() {
  let occupiedCount = 0;
  let activeSessionCount = 0;

  for (let tableNumber = 1; tableNumber <= TABLE_COUNT; tableNumber += 1) {
    const tableData = getTableData(tableNumber);

    if (tableData.status === "occupied" && tableData.currentSessionId) {
      occupiedCount += 1;
      activeSessionCount += 1;
    }
  }

  occupiedTableCountEl.textContent = `${occupiedCount}개`;
  emptyTableCountEl.textContent = `${TABLE_COUNT - occupiedCount}개`;
  activeSessionCountEl.textContent = `${activeSessionCount}개`;
}

function buildEmptyCard(tableNumber, tableData) {
  const endedAtText = tableData.endedAt ? formatDate(tableData.endedAt) : "-";

  return `
    <p><strong>${tableNumber}번 테이블</strong></p>
    <p>상태: 비어 있음</p>
    <p>마지막 퇴장: ${endedAtText}</p>

    <div class="section">
      <label><strong>입장 인원</strong></label>
      <input type="text" inputmode="numeric" data-field="headCount" placeholder="예: 4" />
    </div>

    <div class="buttons">
      <button class="confirm-btn" type="button" data-action="enter" data-table="${tableNumber}">입장 처리</button>
    </div>
  `;
}

function buildOccupiedCard(tableNumber, tableData) {
  const headCount = getStoredCount(tableData.headCount) ?? 0;
  const paidSeatCount = getSeatFeeChargedCount(tableData);
  const seatFeePerPerson = normalizeSeatFeePerPerson(tableData.seatFeePerPerson);
  const seatFeeTotal = getSeatFeeTotal(tableData);
  const sessionPreview = tableData.currentSessionId
    ? String(tableData.currentSessionId).slice(0, 12)
    : "-";

  return `
    <p><strong>${tableNumber}번 테이블</strong></p>
    <p>상태: 사용 중</p>
    <p>현재 세션: ${sessionPreview}</p>
    <p>입장 인원: ${headCount}명</p>
    <p><strong>자릿세 총액: ${formatPrice(seatFeeTotal)}</strong></p>
    ${paidSeatCount !== headCount ? `<p>자릿세 적용 인원: ${paidSeatCount}명</p>` : ""}
    <p>적용 단가: ${formatPrice(seatFeePerPerson)}</p>
    <p>입장 시간: ${formatDate(tableData.startedAt) || "-"}</p>

    <div class="buttons">
      <button class="back-btn" type="button" data-action="exit" data-table="${tableNumber}">퇴장 처리</button>
    </div>
  `;
}

function renderTables() {
  tableGrid.innerHTML = "";

  for (let tableNumber = 1; tableNumber <= TABLE_COUNT; tableNumber += 1) {
    const tableData = getTableData(tableNumber);
    const isOccupied = tableData.status === "occupied" && tableData.currentSessionId;

    const card = document.createElement("div");
    card.className = `order${isOccupied ? " completed" : ""}`;
    card.dataset.table = String(tableNumber);

    card.innerHTML = isOccupied
      ? buildOccupiedCard(tableNumber, tableData)
      : buildEmptyCard(tableNumber, tableData);

    tableGrid.appendChild(card);
  }
}

function startTableListener() {
  if (unsubscribeTables) {
    unsubscribeTables();
  }

  unsubscribeTables = onSnapshot(collection(db, "tables"), (snapshot) => {
    tablesMap = {};

    snapshot.forEach((docSnap) => {
      if (!isValidTableNumber(docSnap.id)) {
        return;
      }

      tablesMap[docSnap.id] = docSnap.data();
    });

    renderSummary();
    renderTables();
  });
}

async function handleEnter(tableNumber, card) {
  const headCountInput = card.querySelector('[data-field="headCount"]');

  const headCount = parseCountInput(headCountInput.value, "입장 인원");
  if (headCount === null) {
    return;
  }

  const latestTableData = await readLatestTableData(tableNumber);

  if (latestTableData.status === "occupied" && latestTableData.currentSessionId) {
    alert("이미 사용 중인 테이블입니다.");
    return;
  }

  const seatFeePerPerson = await getConfiguredSeatFeePerPerson();

  await setDoc(
    doc(db, "tables", String(tableNumber)),
    {
      status: "occupied",
      currentSessionId: createSessionId(tableNumber),
      headCount,
      paidSeatCount: headCount,
      seatFeePerPerson,
      startedAt: Date.now(),
      endedAt: null
    },
    { merge: true }
  );
}

async function handleExit(tableNumber) {
  const latestTableData = await readLatestTableData(tableNumber);

  if (latestTableData.status !== "occupied" || !latestTableData.currentSessionId) {
    alert("현재 사용 중인 테이블이 아닙니다.");
    return;
  }

  const blockReason = await getExitBlockReason(latestTableData.currentSessionId);

  if (blockReason) {
    alert(blockReason);
    return;
  }

  const refreshedTableData = await readLatestTableData(tableNumber);

  if (
    refreshedTableData.status !== "occupied" ||
    String(refreshedTableData.currentSessionId || "") !== String(latestTableData.currentSessionId)
  ) {
    alert("테이블 세션이 변경되어 퇴장 처리할 수 없습니다. 화면을 다시 확인해 주세요.");
    return;
  }

  await setDoc(
    doc(db, "tables", String(tableNumber)),
    {
      status: "empty",
      currentSessionId: null,
      endedAt: Date.now()
    },
    { merge: true }
  );
}

tableGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const tableNumber = normalizeTableNumber(button.dataset.table);

  if (!isValidTableNumber(tableNumber)) {
    alert("테이블 번호가 올바르지 않습니다.");
    return;
  }

  const card = button.closest(".order");
  button.disabled = true;

  try {
    if (action === "enter") {
      await handleEnter(tableNumber, card);
      return;
    }

    if (action === "exit") {
      await handleExit(tableNumber);
    }
  } catch (error) {
    console.error("테이블 상태 처리 실패:", error);
    alert("테이블 상태를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
  } finally {
    button.disabled = false;
  }
});

resetTableManagerState();

onAuthStateChanged(auth, (user) => {
  if (!user) {
    showLoggedOutUI();

    if (unsubscribeTables) {
      unsubscribeTables();
      unsubscribeTables = null;
    }

    resetTableManagerState();
    return;
  }

  if (!isAdminEmail(user.email)) {
    showUnauthorizedUI();

    if (unsubscribeTables) {
      unsubscribeTables();
      unsubscribeTables = null;
    }

    resetTableManagerState();
    return;
  }

  showLoggedInUI();
  startTableListener();
});
