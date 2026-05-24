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
const DEBUG_TABLE_SORT = false;
const DEFAULT_TABLE_SORT = "startedAtDesc";
const OPERATION_MEMO_MAX_LENGTH = 100;
const auth = getAuth();

const authRequiredBox = document.getElementById("authRequiredBox");
const tableManagerContent = document.getElementById("tableManagerContent");
const occupiedTableCountEl = document.getElementById("occupiedTableCount");
const emptyTableCountEl = document.getElementById("emptyTableCount");
const activeSessionCountEl = document.getElementById("activeSessionCount");
const tableSortSelect = document.getElementById("tableSortSelect");
const tableStatusFilterSelect = document.getElementById("tableStatusFilterSelect");
const tableGrid = document.getElementById("tableGrid");

let tablesMap = {};
let ordersMap = {};
let tableRequestsMap = {};
let unsubscribeTables = null;
let unsubscribeOrders = null;
let unsubscribeTableRequests = null;
let currentTableSort = DEFAULT_TABLE_SORT;
let currentTableStatusFilter = "all";

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
    endedAt: null,
    operationMemo: ""
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

function isOccupiedTable(tableData) {
  return tableData.status === "occupied" && tableData.currentSessionId;
}

function getStartedAtSortValue(tableData) {
  const rawStartedAt = tableData?.startedAt;

  if (typeof rawStartedAt === "number") {
    if (!Number.isFinite(rawStartedAt) || rawStartedAt <= 0) {
      return null;
    }

    return rawStartedAt;
  }

  if (typeof rawStartedAt === "string") {
    const parsedStartedAt = Number(rawStartedAt.trim());

    if (!Number.isFinite(parsedStartedAt) || parsedStartedAt <= 0) {
      return null;
    }

    return parsedStartedAt;
  }

  if (rawStartedAt && typeof rawStartedAt.toMillis === "function") {
    const millis = Number(rawStartedAt.toMillis());

    if (!Number.isFinite(millis) || millis <= 0) {
      return null;
    }

    return millis;
  }

  if (rawStartedAt && typeof rawStartedAt === "object") {
    const seconds = Number(rawStartedAt.seconds);
    const nanoseconds = Number(rawStartedAt.nanoseconds);

    if (!Number.isFinite(seconds) || !Number.isFinite(nanoseconds)) {
      return null;
    }

    const millis = seconds * 1000 + nanoseconds / 1000000;

    if (!Number.isFinite(millis) || millis <= 0) {
      return null;
    }

    return millis;
  }

  return null;
}

function formatTableStayDuration(tableData) {
  const elapsedMinutes = getTableStayMinutes(tableData);

  if (!Number.isFinite(elapsedMinutes)) {
    return "입장 시간 확인 불가";
  }

  return `입장 후 ${elapsedMinutes}분 경과`;
}

function getTableStayMinutes(tableData) {
  const startedAt = getStartedAtSortValue(tableData);

  if (!Number.isFinite(startedAt)) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function compareByTableNumber(left, right, descending = false) {
  if (descending) {
    return right.tableNumber - left.tableNumber;
  }

  return left.tableNumber - right.tableNumber;
}

function normalizeTableSortValue(value) {
  if (
    value === "tableNumberAsc" ||
    value === "tableNumberDesc" ||
    value === "startedAtAsc" ||
    value === "startedAtDesc"
  ) {
    return value;
  }

  return DEFAULT_TABLE_SORT;
}

function setCurrentTableSort(value) {
  const normalizedSort = normalizeTableSortValue(value);
  currentTableSort = normalizedSort;

  if (tableSortSelect && tableSortSelect.value !== normalizedSort) {
    tableSortSelect.value = normalizedSort;
  }

  return currentTableSort;
}

function formatRawStartedAtForDebug(rawStartedAt) {
  if (rawStartedAt === null || rawStartedAt === undefined) {
    return rawStartedAt;
  }

  if (typeof rawStartedAt === "number" || typeof rawStartedAt === "string") {
    return rawStartedAt;
  }

  if (typeof rawStartedAt.toMillis === "function") {
    const seconds = Number(rawStartedAt.seconds);
    const nanoseconds = Number(rawStartedAt.nanoseconds);

    if (Number.isFinite(seconds) && Number.isFinite(nanoseconds)) {
      return `Timestamp(seconds=${seconds}, nanoseconds=${nanoseconds})`;
    }

    return "Timestamp(toMillis)";
  }

  if (typeof rawStartedAt === "object") {
    const seconds = Number(rawStartedAt.seconds);
    const nanoseconds = Number(rawStartedAt.nanoseconds);

    if (Number.isFinite(seconds) && Number.isFinite(nanoseconds)) {
      return `{seconds:${seconds}, nanoseconds:${nanoseconds}}`;
    }
  }

  return String(rawStartedAt);
}

function logTableSortDebug(label, entries, includeRenderedOrderIndex = false) {
  if (!DEBUG_TABLE_SORT) {
    return;
  }

  console.log(`[tableManager sort debug] ${label}`);
  console.table(entries.map((entry, index) => {
    return {
      currentTableSort,
      currentTableStatusFilter,
      tableNumber: entry.tableNumber,
      isOccupied: entry.isOccupied,
      rawStartedAt: formatRawStartedAtForDebug(entry.tableData?.startedAt),
      normalizedStartedAt: getStartedAtSortValue(entry.tableData),
      renderedOrderIndex: includeRenderedOrderIndex ? index : "-"
    };
  }));
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

function countUnfinishedServeItems(orderId, orderData) {
  if (orderData.deleted) {
    return 0;
  }

  if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
    return 0;
  }

  const serveStatus = orderData.serveStatus || {};
  let unfinishedCount = 0;

  for (let itemIndex = 0; itemIndex < orderData.items.length; itemIndex += 1) {
    const item = orderData.items[itemIndex];
    const comboRule = normalizeComboRule(item?.comboRule);

    if (comboRule) {
      const comboServeId = `${orderId}_${itemIndex}_combo`;
      const comboServeEntry = serveStatus[comboServeId];

      if (!comboServeEntry || comboServeEntry.status !== "서빙 완료") {
        unfinishedCount += 1;
      }

      continue;
    }

    const itemCount = Number(item.count) || 0;

    for (let countIndex = 0; countIndex < itemCount; countIndex += 1) {
      const serveId = `${orderId}_${itemIndex}_${countIndex}`;
      const serveEntry = serveStatus[serveId];

      if (!serveEntry || serveEntry.status !== "서빙 완료") {
        unfinishedCount += 1;
      }
    }
  }

  return unfinishedCount;
}

function hasUnfinishedServeItems(orderId, orderData) {
  return countUnfinishedServeItems(orderId, orderData) > 0;
}

function getUnservedCountForSession(sessionId) {
  const normalizedSessionId = String(sessionId || "");

  if (!normalizedSessionId) {
    return 0;
  }

  return Object.entries(ordersMap).reduce((totalCount, [orderId, orderData]) => {
    if (String(orderData?.sessionId || "") !== normalizedSessionId) {
      return totalCount;
    }

    return totalCount + countUnfinishedServeItems(orderId, orderData);
  }, 0);
}

function hasPendingStaffRequestForTable(tableNumber) {
  const normalizedTableNumber = String(tableNumber || "");

  return Object.values(tableRequestsMap).some((requestData) => {
    return (
      String(requestData?.table || "") === normalizedTableNumber &&
      requestData?.type === "staff" &&
      requestData?.status === "pending"
    );
  });
}

function getTableRiskMeta(tableNumber, tableData, unservedCount) {
  const hasStaffRequest = hasPendingStaffRequestForTable(tableNumber);
  const stayMinutes = getTableStayMinutes(tableData);
  const hasManyUnserved = unservedCount >= 5;
  const hasLongStay = Number.isFinite(stayMinutes) && stayMinutes >= 90;
  const badges = [];

  if (hasStaffRequest) {
    badges.push({
      label: "🔔 직원 호출",
      className: "is-staff"
    });
  }

  if (hasManyUnserved) {
    badges.push({
      label: `미서빙 ${unservedCount}건`,
      className: "is-unserved"
    });
  }

  if (hasLongStay) {
    badges.push({
      label: `${stayMinutes}분 이용`,
      className: "is-long"
    });
  }

  if (hasStaffRequest) {
    return {
      main: {
        label: "🔔 직원 호출",
        className: "is-staff"
      },
      subBadges: badges.filter((badge) => badge.label !== "🔔 직원 호출")
    };
  }

  if (hasManyUnserved) {
    return {
      main: {
        label: "미서빙 많음",
        className: "is-unserved"
      },
      subBadges: badges.filter((badge) => badge.className !== "is-unserved")
    };
  }

  if (hasLongStay) {
    return {
      main: {
        label: "장시간 이용",
        className: "is-long"
      },
      subBadges: badges.filter((badge) => badge.className !== "is-long")
    };
  }

  return {
    main: {
      label: "정상",
      className: "is-normal"
    },
    subBadges: []
  };
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
  ordersMap = {};
  tableRequestsMap = {};
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

    if (isOccupiedTable(tableData)) {
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
    <div class="table-card-header">
      <div class="table-card-title-row">
        <div class="table-card-table">테이블 ${tableNumber}</div>
        <div class="table-card-status is-empty">비어 있음</div>
      </div>
      <div class="table-card-subtitle">마지막 퇴장 ${endedAtText}</div>
    </div>

    <div class="table-card-section">
      <div class="table-card-section-label">입장 준비</div>
      <div class="table-card-input">
        <label><strong>입장 인원</strong></label>
        <input type="text" inputmode="numeric" data-field="headCount" placeholder="예: 4" />
      </div>
    </div>

    <div class="buttons table-card-actions">
      <button class="confirm-btn" type="button" data-action="enter" data-table="${tableNumber}">입장 처리</button>
    </div>
  `;
}

function buildOccupiedCard(tableNumber, tableData) {
  const headCount = getStoredCount(tableData.headCount) ?? 0;
  const paidSeatCount = getSeatFeeChargedCount(tableData);
  const seatFeePerPerson = normalizeSeatFeePerPerson(tableData.seatFeePerPerson);
  const seatFeeTotal = getSeatFeeTotal(tableData);
  const unservedCount = getUnservedCountForSession(tableData.currentSessionId);
  const unservedClassName = unservedCount > 0 ? "is-pending" : "is-clear";
  const riskMeta = getTableRiskMeta(tableNumber, tableData, unservedCount);
  const operationMemo = String(tableData.operationMemo || "").trim();
  const escapedOperationMemo = escapeHTML(operationMemo);
  const sessionPreview = tableData.currentSessionId
    ? String(tableData.currentSessionId).slice(0, 12)
    : "-";

  return `
    <div class="table-card-header">
      <div class="table-card-title-row">
        <div class="table-card-table">테이블 ${tableNumber}</div>
        <div class="table-card-status is-occupied">사용 중</div>
      </div>
      <div class="table-card-risk">
        <div class="table-card-risk-main ${riskMeta.main.className}">${riskMeta.main.label}</div>
        ${riskMeta.subBadges.length > 0 ? `
          <div class="table-card-risk-sub-list">
            ${riskMeta.subBadges.map((badge) => `
              <span class="table-card-risk-sub ${badge.className}">${badge.label}</span>
            `).join("")}
          </div>
        ` : ""}
      </div>
      <div class="table-card-session">세션 ${sessionPreview}</div>
      <div class="table-card-unserved ${unservedClassName}">미서빙 ${unservedCount}건</div>
    </div>

    <div class="table-card-meta">
      <div class="table-card-meta-item">
        <div class="table-card-meta-label">입장 인원</div>
        <div class="table-card-meta-value">${headCount}명</div>
      </div>
      <div class="table-card-meta-item">
        <div class="table-card-meta-label">체류 시간</div>
        <div class="table-card-meta-value">${formatTableStayDuration(tableData)}</div>
      </div>
    </div>

    <div class="table-card-fee">
      <div class="table-card-fee-label">자릿세 총액</div>
      <div class="table-card-fee-value">${formatPrice(seatFeeTotal)}</div>
    </div>

    <div class="table-card-details">
      ${paidSeatCount !== headCount ? `
        <div class="table-card-detail-row">
          <div class="table-card-detail-label">자릿세 적용 인원</div>
          <div class="table-card-detail-value">${paidSeatCount}명</div>
        </div>
      ` : ""}
      <div class="table-card-detail-row">
        <div class="table-card-detail-label">적용 단가</div>
        <div class="table-card-detail-value">${formatPrice(seatFeePerPerson)}</div>
      </div>
    </div>

    <div class="table-card-memo">
      <div class="table-card-section-label">운영 메모</div>
      <div class="table-card-memo-display">${escapedOperationMemo || "메모 없음"}</div>
      <textarea
        data-field="operationMemo"
        maxlength="${OPERATION_MEMO_MAX_LENGTH}"
        placeholder="예: 소주 2, 맥주 3 보관"
      >${escapedOperationMemo}</textarea>
      <div class="buttons table-card-memo-actions">
        <button class="toggle-btn" type="button" data-action="saveMemo" data-table="${tableNumber}">메모 저장</button>
      </div>
    </div>

    <div class="buttons table-card-actions">
      <button class="back-btn" type="button" data-action="exit" data-table="${tableNumber}">퇴장 처리</button>
    </div>
  `;
}

function getRenderableTables() {
  let tableSort = currentTableSort;

  if (tableSortSelect) {
    tableSort = setCurrentTableSort(tableSortSelect.value);
  } else {
    tableSort = normalizeTableSortValue(currentTableSort);
    currentTableSort = tableSort;
  }

  const tableEntries = [];

  for (let tableNumber = 1; tableNumber <= TABLE_COUNT; tableNumber += 1) {
    const tableData = getTableData(tableNumber);

    tableEntries.push({
      tableNumber,
      tableData,
      isOccupied: isOccupiedTable(tableData)
    });
  }

  const filteredEntries = tableEntries
    .filter((entry) => {
      if (currentTableStatusFilter === "empty") {
        return !entry.isOccupied;
      }

      if (currentTableStatusFilter === "occupied") {
        return entry.isOccupied;
      }

      return true;
    });

  logTableSortDebug("before-sort", filteredEntries, false);

  const sortedEntries = filteredEntries.sort((left, right) => {
      if (tableSort === "tableNumberDesc") {
        return compareByTableNumber(left, right, true);
      }

      if (tableSort === "startedAtAsc" || tableSort === "startedAtDesc") {
        const leftStartedAt = getStartedAtSortValue(left.tableData);
        const rightStartedAt = getStartedAtSortValue(right.tableData);
        const leftHasStartedAt = Number.isFinite(leftStartedAt);
        const rightHasStartedAt = Number.isFinite(rightStartedAt);

        if (leftHasStartedAt && rightHasStartedAt && leftStartedAt !== rightStartedAt) {
          if (tableSort === "startedAtAsc") {
            return leftStartedAt - rightStartedAt;
          }

          return rightStartedAt - leftStartedAt;
        }

        if (leftHasStartedAt !== rightHasStartedAt) {
          return leftHasStartedAt ? -1 : 1;
        }
      }

      return compareByTableNumber(left, right);
    });

  logTableSortDebug("after-sort", sortedEntries, true);

  return sortedEntries;
}

function renderTables() {
  tableGrid.innerHTML = "";

  for (const { tableNumber, tableData, isOccupied } of getRenderableTables()) {
    const card = document.createElement("div");
    card.className = `order table-card${isOccupied ? " completed" : ""}`;
    card.dataset.table = String(tableNumber);
    card.dataset.status = isOccupied ? "occupied" : "empty";

    card.innerHTML = isOccupied
      ? buildOccupiedCard(tableNumber, tableData)
      : buildEmptyCard(tableNumber, tableData);

    tableGrid.appendChild(card);
  }
}

if (tableSortSelect) {
  setCurrentTableSort(tableSortSelect.value);

  const handleTableSortChange = (event) => {
    setCurrentTableSort(event.currentTarget.value);
    renderTables();
  };

  tableSortSelect.addEventListener("change", handleTableSortChange);
  tableSortSelect.addEventListener("input", handleTableSortChange);
}

if (tableStatusFilterSelect) {
  tableStatusFilterSelect.addEventListener("change", () => {
    const nextFilter = tableStatusFilterSelect.value;

    if (nextFilter === "empty" || nextFilter === "occupied") {
      currentTableStatusFilter = nextFilter;
    } else {
      currentTableStatusFilter = "all";
    }

    renderTables();
  });
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

function startOrderListener() {
  if (unsubscribeOrders) {
    unsubscribeOrders();
  }

  unsubscribeOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
    ordersMap = {};

    snapshot.forEach((docSnap) => {
      ordersMap[docSnap.id] = docSnap.data();
    });

    renderTables();
  });
}

function startTableRequestListener() {
  if (unsubscribeTableRequests) {
    unsubscribeTableRequests();
  }

  unsubscribeTableRequests = onSnapshot(collection(db, "tableRequests"), (snapshot) => {
    tableRequestsMap = {};

    snapshot.forEach((docSnap) => {
      const requestData = docSnap.data();

      if (requestData?.type !== "staff" || requestData?.status !== "pending") {
        return;
      }

      tableRequestsMap[docSnap.id] = requestData;
    });

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
      endedAt: null,
      operationMemo: ""
    },
    { merge: true }
  );
}

async function handleSaveMemo(tableNumber, card) {
  const memoInput = card.querySelector('[data-field="operationMemo"]');
  const operationMemo = String(memoInput?.value || "").trim();

  if (operationMemo.length > OPERATION_MEMO_MAX_LENGTH) {
    alert(`운영 메모는 ${OPERATION_MEMO_MAX_LENGTH}자 이하로 입력해 주세요.`);
    return;
  }

  await setDoc(
    doc(db, "tables", String(tableNumber)),
    { operationMemo },
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
      endedAt: Date.now(),
      operationMemo: ""
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

    if (action === "saveMemo") {
      await handleSaveMemo(tableNumber, card);
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

    if (unsubscribeOrders) {
      unsubscribeOrders();
      unsubscribeOrders = null;
    }

    if (unsubscribeTableRequests) {
      unsubscribeTableRequests();
      unsubscribeTableRequests = null;
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

    if (unsubscribeOrders) {
      unsubscribeOrders();
      unsubscribeOrders = null;
    }

    if (unsubscribeTableRequests) {
      unsubscribeTableRequests();
      unsubscribeTableRequests = null;
    }

    resetTableManagerState();
    return;
  }

  showLoggedInUI();
  startTableListener();
  startOrderListener();
  startTableRequestListener();
});
