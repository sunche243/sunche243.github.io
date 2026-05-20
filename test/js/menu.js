import { db } from "./common.js";
import {
  validateName,
  formatPrice,
  formatOrderItemCount,
  calculateOrderTotal,
  normalizeComboRule,
  normalizeMenuOptions,
  normalizeTableNumber,
  isValidTableNumber,
  parseItems,
  readSessionStorageJSON,
  writeSessionStorageJSON
} from "./utils.js";
import { appConfig } from "./appConfig.js";
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  where
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

let currentMenus = [];
const PENDING_ORDER_KEY = "pendingOrder";

function hasValidSortOrder(menu) {
  return Number.isFinite(Number(menu?.sortOrder));
}

function getMenuCreatedAt(menu) {
  const createdAt = Number(menu?.createdAt);
  return Number.isFinite(createdAt) ? createdAt : null;
}

function getMenuName(menu) {
  return String(menu?.name || "").trim();
}

function compareMenusByFallback(a, b) {
  const aCreatedAt = getMenuCreatedAt(a);
  const bCreatedAt = getMenuCreatedAt(b);

  if (aCreatedAt !== null && bCreatedAt !== null && aCreatedAt !== bCreatedAt) {
    return aCreatedAt - bCreatedAt;
  }

  if (aCreatedAt !== null && bCreatedAt === null) {
    return -1;
  }

  if (aCreatedAt === null && bCreatedAt !== null) {
    return 1;
  }

  const nameCompare = getMenuName(a).localeCompare(getMenuName(b), "ko");
  if (nameCompare !== 0) {
    return nameCompare;
  }

  return String(a?.id || "").localeCompare(String(b?.id || ""), "ko");
}

function getSortedMenus(menus) {
  const menusWithSortOrder = [];
  const menusWithoutSortOrder = [];

  menus.forEach((menu) => {
    if (hasValidSortOrder(menu)) {
      menusWithSortOrder.push(menu);
      return;
    }

    menusWithoutSortOrder.push(menu);
  });

  menusWithSortOrder.sort((a, b) => {
    const sortDiff = Number(a.sortOrder) - Number(b.sortOrder);
    if (sortDiff !== 0) {
      return sortDiff;
    }

    return compareMenusByFallback(a, b);
  });

  menusWithoutSortOrder.sort(compareMenusByFallback);

  const sortedMenus = [];
  let orderedIndex = 1;
  let withSortIndex = 0;
  let withoutSortIndex = 0;

  while (
    withSortIndex < menusWithSortOrder.length ||
    withoutSortIndex < menusWithoutSortOrder.length
  ) {
    const nextWithSort = menusWithSortOrder[withSortIndex];

    if (nextWithSort && Number(nextWithSort.sortOrder) <= orderedIndex) {
      sortedMenus.push(nextWithSort);
      withSortIndex += 1;
      orderedIndex += 1;
      continue;
    }

    if (withoutSortIndex < menusWithoutSortOrder.length) {
      sortedMenus.push(menusWithoutSortOrder[withoutSortIndex]);
      withoutSortIndex += 1;
      orderedIndex += 1;
      continue;
    }

    sortedMenus.push(nextWithSort);
    withSortIndex += 1;
    orderedIndex += 1;
  }

  return sortedMenus;
}

function renderMenus(mainSection, sideSection, drinkSection, menus) {
  mainSection.innerHTML = "";
  sideSection.innerHTML = "";
  drinkSection.innerHTML = "";

  menus.forEach((item) => {
    if (item.visible === false) return;
    if (!["main", "side", "drink"].includes(item.type)) return;

    const soldOutText = item.soldOut ? " (매진)" : "";
    const menuOptions = normalizeMenuOptions(item.options);
    const comboRule = normalizeComboRule(item.comboRule);
    const div = document.createElement("div");
    div.className = "menu-item";

    const title = document.createElement("strong");
    title.textContent = `${item.name} (${Number(item.price).toLocaleString()}원)${soldOutText}`;

    const menuCounter = document.createElement("div");
    menuCounter.className = "counter";
    menuCounter.dataset.role = "menu-counter";
    menuCounter.dataset.name = item.name;
    menuCounter.dataset.price = item.price;
    menuCounter.dataset.type = item.type;
    menuCounter.dataset.comboEnabled = comboRule ? "true" : "false";
    menuCounter.dataset.unitSize = comboRule ? String(comboRule.unitSize) : "";
    menuCounter.dataset.soldOut = item.soldOut ? "true" : "false";

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "minus";
    minusBtn.textContent = "-";
    minusBtn.disabled = item.soldOut === true || !!comboRule;

    const countEl = document.createElement("span");
    countEl.className = "count";
    countEl.textContent = "0";

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "plus";
    plusBtn.textContent = "+";
    plusBtn.disabled = item.soldOut === true || !!comboRule;

    menuCounter.appendChild(minusBtn);
    menuCounter.appendChild(countEl);
    menuCounter.appendChild(plusBtn);

    div.appendChild(title);
    div.appendChild(menuCounter);

    if (menuOptions.length > 0) {
      const optionList = document.createElement("div");
      optionList.className = "menu-option-list";
      optionList.style.display = comboRule ? "block" : "none";

      const optionTitle = document.createElement("div");
      optionTitle.className = "menu-option-title";
      optionTitle.textContent = comboRule
        ? `구성 수량 선택 (${comboRule.unitSize}개 단위)`
        : "옵션 수량 선택";
      optionList.appendChild(optionTitle);

      menuOptions.forEach((option) => {
        const optionRow = document.createElement("div");
        optionRow.className = "menu-option-row";

        const optionLabel = document.createElement("div");
        optionLabel.className = "menu-option-label";
        optionLabel.textContent = `${option.label} (+${Number(option.price).toLocaleString()}원)`;

        const optionCounter = document.createElement("div");
        optionCounter.className = "counter";
        optionCounter.dataset.role = "option-counter";
        optionCounter.dataset.label = option.label;
        optionCounter.dataset.price = option.price;

        const optionMinusBtn = document.createElement("button");
        optionMinusBtn.type = "button";
        optionMinusBtn.className = "minus";
        optionMinusBtn.textContent = "-";

        const optionCountEl = document.createElement("span");
        optionCountEl.className = "count";
        optionCountEl.textContent = "0";

        const optionPlusBtn = document.createElement("button");
        optionPlusBtn.type = "button";
        optionPlusBtn.className = "plus";
        optionPlusBtn.textContent = "+";

        optionCounter.appendChild(optionMinusBtn);
        optionCounter.appendChild(optionCountEl);
        optionCounter.appendChild(optionPlusBtn);

        optionRow.appendChild(optionLabel);
        optionRow.appendChild(optionCounter);
        optionList.appendChild(optionRow);
      });

      div.appendChild(optionList);
    }

    if (item.type === "main") {
      mainSection.appendChild(div);
      return;
    }

    if (item.type === "side") {
      sideSection.appendChild(div);
      return;
    }

    if (item.type === "drink") {
      drinkSection.appendChild(div);
    }
  });
}

function getMenuOptionCounters(menuItem) {
  return Array.from(
    menuItem?.querySelectorAll('.counter[data-role="option-counter"]') || []
  );
}

function getSelectedOptionsFromMenuItem(menuItem) {
  return getMenuOptionCounters(menuItem)
    .map((optionCounter) => ({
      label: optionCounter.dataset.label,
      price: Number(optionCounter.dataset.price) || 0,
      count: getCounterValue(optionCounter)
    }))
    .filter((option) => option.count > 0);
}

function getMenuSelectionState(menuItem) {
  const menuCounter = menuItem.querySelector('.counter[data-role="menu-counter"]');

  if (!menuCounter) {
    return null;
  }

  const comboRule = normalizeComboRule({
    enabled: menuCounter.dataset.comboEnabled === "true",
    unitSize: menuCounter.dataset.unitSize
  });
  const selectedOptions = getSelectedOptionsFromMenuItem(menuItem);
  const optionTotalCount = selectedOptions.reduce((sum, option) => {
    return sum + option.count;
  }, 0);

  if (comboRule) {
    const isValidCombo =
      optionTotalCount > 0 && optionTotalCount % comboRule.unitSize === 0;
    const count = isValidCombo ? optionTotalCount / comboRule.unitSize : 0;

    return {
      name: menuCounter.dataset.name,
      price: Number(menuCounter.dataset.price) || 0,
      count,
      options: selectedOptions,
      comboRule,
      isCombo: true,
      hasSelection: optionTotalCount > 0,
      isValidCombo,
      optionTotalCount
    };
  }

  const count = getCounterValue(menuCounter);

  return {
    name: menuCounter.dataset.name,
    price: Number(menuCounter.dataset.price) || 0,
    count,
    options: selectedOptions,
    comboRule: null,
    isCombo: false,
    hasSelection: count > 0,
    isValidCombo: true,
    optionTotalCount
  };
}

function getSelectionStates() {
  return Array.from(document.querySelectorAll(".menu-item"))
    .map((menuItem) => getMenuSelectionState(menuItem))
    .filter(Boolean);
}

function getInvalidComboSelections() {
  return getSelectionStates().filter((state) => {
    return state.isCombo && state.hasSelection && !state.isValidCombo;
  });
}

function buildInvalidComboAlertMessage(invalidStates) {
  if (invalidStates.length === 1) {
    const [state] = invalidStates;
    return `${state.name} 메뉴는 구성 수량 합계가 ${state.comboRule.unitSize}개 단위여야 합니다.`;
  }

  const details = invalidStates
    .map((state) => `- ${state.name}: ${state.comboRule.unitSize}개 단위`)
    .join("\n");

  return `조합형 메뉴의 구성 수량 합계를 확인해 주세요.\n${details}`;
}

function getCounterValue(counter) {
  return parseInt(counter?.querySelector(".count")?.textContent, 10) || 0;
}

function setCounterValue(counter, value) {
  const countEl = counter?.querySelector(".count");

  if (!countEl) {
    return;
  }

  countEl.textContent = String(Math.max(0, value));
}

function updateMenuOptionState(menuItem) {
  const menuCounter = menuItem.querySelector('.counter[data-role="menu-counter"]');
  const optionList = menuItem.querySelector(".menu-option-list");

  if (!menuCounter || !optionList) {
    return;
  }

  const comboRule = normalizeComboRule({
    enabled: menuCounter.dataset.comboEnabled === "true",
    unitSize: menuCounter.dataset.unitSize
  });
  const soldOut = menuCounter.dataset.soldOut === "true";

  if (comboRule) {
    const optionCounters = getMenuOptionCounters(menuItem);
    const optionTotalCount = optionCounters.reduce((sum, counter) => {
      return sum + getCounterValue(counter);
    }, 0);
    const isValidCombo =
      optionTotalCount > 0 && optionTotalCount % comboRule.unitSize === 0;
    const comboCount = isValidCombo ? optionTotalCount / comboRule.unitSize : 0;

    setCounterValue(menuCounter, comboCount);
    optionList.style.display = "block";

    optionCounters.forEach((counter) => {
      const minus = counter.querySelector(".minus");
      const plus = counter.querySelector(".plus");
      const currentCount = getCounterValue(counter);

      minus.disabled = soldOut || currentCount <= 0;
      plus.disabled = soldOut;
    });

    return;
  }

  const menuCount = getCounterValue(menuCounter);
  optionList.style.display = menuCount > 0 ? "block" : "none";

  optionList.querySelectorAll('.counter[data-role="option-counter"]').forEach((counter) => {
    const minus = counter.querySelector(".minus");
    const plus = counter.querySelector(".plus");
    const currentCount = Math.min(getCounterValue(counter), menuCount);

    setCounterValue(counter, currentCount);
    minus.disabled = currentCount <= 0;
    plus.disabled = menuCount <= 0 || currentCount >= menuCount;
  });
}

function syncAllMenuOptionStates() {
  document.querySelectorAll(".menu-item").forEach((menuItem) => {
    updateMenuOptionState(menuItem);
  });
}

function getSelectedItems() {
  return getSelectionStates()
    .filter((state) => state.count > 0)
    .map((state) => {
      const item = {
        name: state.name,
        count: state.count,
        price: state.price
      };

      if (state.options.length > 0) {
        item.options = state.options;
      }

      if (state.comboRule) {
        item.comboRule = state.comboRule;
      }

      return item;
    })
}

function hasRequiredFirstOrderItems(selectedItems) {
  const menuTypeByName = new Map(
    currentMenus.map((menu) => [String(menu.name || "").trim(), menu.type])
  );

  let mainCount = 0;
  let sideCount = 0;

  selectedItems.forEach((item) => {
    const menuType = menuTypeByName.get(String(item.name || "").trim());
    const itemCount = Number(item.count) || 0;

    if (menuType === "main") {
      mainCount += itemCount;
    }

    if (menuType === "side") {
      sideCount += itemCount;
    }
  });

  return (
    (mainCount >= 1 && sideCount >= 1) ||
    mainCount >= 2 ||
    sideCount >= 3
  );
}

function calculateEstimatedTotal() {
  return calculateOrderTotal(getSelectedItems());
}

function updateEstimatedTotal() {
  const estimatedTotalPriceEl = document.getElementById("estimatedTotalPrice");
  estimatedTotalPriceEl.textContent = formatPrice(calculateEstimatedTotal());
}

function updateSelectedMenuSummary() {
  const summaryEl = document.getElementById("selectedMenuSummary");
  const selectionStates = getSelectionStates().filter((state) => state.hasSelection);

  if (selectionStates.length === 0) {
    summaryEl.className = "menu-summary-empty";
    summaryEl.textContent = "아직 선택한 메뉴가 없어요.";
    return;
  }

  summaryEl.className = "menu-summary-list";
  summaryEl.innerHTML = "";

  selectionStates.forEach((state) => {
    const itemBlock = document.createElement("div");

    const row = document.createElement("div");
    row.className = "menu-summary-row";

    const nameEl = document.createElement("span");
    nameEl.textContent = state.name;

    const countEl = document.createElement("strong");
    countEl.textContent = state.isCombo && !state.isValidCombo
      ? "조합 미완성"
      : formatOrderItemCount(state);

    row.appendChild(nameEl);
    row.appendChild(countEl);
    itemBlock.appendChild(row);

    state.options.forEach((option) => {
      const optionRow = document.createElement("div");
      optionRow.className = "menu-summary-options";
      optionRow.textContent = `└ ${option.label} ${option.count}개 (+${Number(option.price).toLocaleString()}원)`;
      itemBlock.appendChild(optionRow);
    });

    summaryEl.appendChild(itemBlock);
  });
}

function refreshMenuPreview() {
  syncAllMenuOptionStates();
  updateEstimatedTotal();
  updateSelectedMenuSummary();
}

function resetAllCounters() {
  document.querySelectorAll(".counter .count").forEach((countEl) => {
    countEl.textContent = "0";
  });
  refreshMenuPreview();
}

function findMenuItemByName(name) {
  const counters = Array.from(
    document.querySelectorAll('.counter[data-role="menu-counter"]')
  );

  const counter = counters.find((itemCounter) => {
    return itemCounter.dataset.name === String(name || "");
  });

  return counter ? counter.closest(".menu-item") : null;
}

function restorePendingOrderSelection(pendingOrder, scannedTable, payerNameInput) {
  if (!pendingOrder || String(pendingOrder.table || "") !== String(scannedTable)) {
    return;
  }

  const restoredItems = parseItems(JSON.stringify(pendingOrder.items || []));

  if (pendingOrder.name) {
    payerNameInput.value = String(pendingOrder.name);
  }

  restoredItems.forEach((item) => {
    const menuItem = findMenuItemByName(item.name);

    if (!menuItem) {
      return;
    }

    const menuCounter = menuItem.querySelector('.counter[data-role="menu-counter"]');

    if (!menuCounter) {
      return;
    }

    const comboRule = normalizeComboRule({
      enabled: menuCounter.dataset.comboEnabled === "true",
      unitSize: menuCounter.dataset.unitSize
    });

    if (!comboRule) {
      setCounterValue(menuCounter, Number(item.count) || 0);
    }

    const optionCounters = getMenuOptionCounters(menuItem);
    const selectedOptions = new Map(
      (item.options || []).map((option) => [String(option.label || ""), Number(option.count) || 0])
    );

    optionCounters.forEach((optionCounter) => {
      const optionLabel = String(optionCounter.dataset.label || "");
      const optionCount = selectedOptions.get(optionLabel) || 0;
      setCounterValue(optionCounter, optionCount);
    });

    updateMenuOptionState(menuItem);
  });

  refreshMenuPreview();
}

function bindCounterEvents() {
  document.querySelectorAll(".menu-item").forEach((menuItem) => {
    const menuCounter = menuItem.querySelector('.counter[data-role="menu-counter"]');

    if (!menuCounter) {
      return;
    }

    const menuMinus = menuCounter.querySelector(".minus");
    const menuPlus = menuCounter.querySelector(".plus");
    const soldOut = menuCounter.dataset.soldOut === "true";
    const comboRule = normalizeComboRule({
      enabled: menuCounter.dataset.comboEnabled === "true",
      unitSize: menuCounter.dataset.unitSize
    });

    if (soldOut) {
      setCounterValue(menuCounter, 0);
      updateMenuOptionState(menuItem);
      return;
    }

    if (!comboRule) {
      menuMinus.onclick = () => {
        const current = getCounterValue(menuCounter);

        if (current > 0) {
          setCounterValue(menuCounter, current - 1);
          refreshMenuPreview();
        }
      };

      menuPlus.onclick = () => {
        setCounterValue(menuCounter, getCounterValue(menuCounter) + 1);
        refreshMenuPreview();
      };
    }

    menuItem.querySelectorAll('.counter[data-role="option-counter"]').forEach((optionCounter) => {
      const optionMinus = optionCounter.querySelector(".minus");
      const optionPlus = optionCounter.querySelector(".plus");

      optionMinus.onclick = () => {
        const current = getCounterValue(optionCounter);

        if (current > 0) {
          setCounterValue(optionCounter, current - 1);
          refreshMenuPreview();
        }
      };

      optionPlus.onclick = () => {
        const current = getCounterValue(optionCounter);

        if (comboRule) {
          setCounterValue(optionCounter, current + 1);
          refreshMenuPreview();
          return;
        }

        const menuCount = getCounterValue(menuCounter);

        if (current < menuCount) {
          setCounterValue(optionCounter, current + 1);
          refreshMenuPreview();
        }
      };
    });

    updateMenuOptionState(menuItem);
  });
}

function validateTableMatch(inputName, scannedTable) {
  const tableMatch = inputName.match(/\((\d{1,3})\)$/);

  if (!tableMatch) {
    alert("입금자명에서 테이블 번호를 확인할 수 없습니다.");
    return false;
  }

  const inputTable = normalizeTableNumber(tableMatch[1]);

  if (!isValidTableNumber(inputTable)) {
    alert("테이블 번호는 1번부터 100번까지만 가능합니다.");
    return false;
  }

  if (scannedTable !== "unknown" && inputTable !== scannedTable) {
    const proceed = confirm(
      `입력하신 테이블번호(${inputTable})와 스캔된 테이블번호(${scannedTable})가 다릅니다.\n정확한 테이블 번호를 입력하셨는지 확인해 주세요.\n\n계속 진행하시겠습니까?`
    );

    if (!proceed) {
      return false;
    }
  }

  return true;
}

async function getActiveTableSession(tableNumber) {
  const tableRef = doc(db, "tables", String(tableNumber));
  const snapshot = await getDoc(tableRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  if (data.status !== "occupied" || !data.currentSessionId) {
    return null;
  }

  return {
    table: String(tableNumber),
    sessionId: String(data.currentSessionId)
  };
}

async function isFirstSessionOrder(sessionId) {
  const ordersQuery = query(
    collection(db, "orders"),
    where("sessionId", "==", String(sessionId))
  );
  const snapshot = await getDocs(ordersQuery);

  return !snapshot.docs.some((docSnap) => docSnap.data().deleted !== true);
}

async function loadMenuImage() {
  const menuImageEl = document.getElementById("menuImage");

  try {
    const settingsRef = doc(db, "settings", "public");
    const snapshot = await getDoc(settingsRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.menuImageUrl) {
        menuImageEl.src = data.menuImageUrl;
      }
    }
  } catch (error) {
    console.error("메뉴판 이미지 불러오기 실패:", error);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const noticeModal = document.getElementById("noticeModal");
  const closeModal = document.getElementById("closeModal");
  const menuModal = document.getElementById("menuModal");
  const menuViewBtn = document.getElementById("menuViewBtn");
  const closeMenuModal = document.getElementById("closeMenuModal");
  const resetMenuBtn = document.getElementById("resetMenuBtn");
  const orderForm = document.getElementById("orderForm");
  const payerNameInput = document.getElementById("payerName");
  const tableInfo = document.getElementById("tableInfo");
  const mainSection = document.getElementById("mainMenuSection");
  const sideSection = document.getElementById("sideMenuSection");
  const drinkSection = document.getElementById("drinkMenuSection");
  const noticeMessage = document.getElementById("noticeMessage");
  const submitBtn = orderForm.querySelector(".submit-btn");
  let pendingOrderRestored = false;

  const scannedTableParam = new URLSearchParams(window.location.search).get("table");
  const scannedTable = normalizeTableNumber(scannedTableParam) || "unknown";

  if (noticeMessage) {
    noticeMessage.innerHTML = appConfig.noticeMessage;
  }

  if (noticeModal) {
    noticeModal.style.display = "flex";
  }

  if (closeModal) {
    closeModal.onclick = () => {
      noticeModal.style.display = "none";
    };
  }

  if (tableInfo) {
    tableInfo.textContent = `내 테이블 번호: ${scannedTable}`;
  }

  loadMenuImage();

  onSnapshot(collection(db, "menus"), (snapshot) => {
    currentMenus = getSortedMenus(
      snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
    );

    renderMenus(mainSection, sideSection, drinkSection, currentMenus);
    bindCounterEvents();
    refreshMenuPreview();

    if (!pendingOrderRestored) {
      pendingOrderRestored = true;
      restorePendingOrderSelection(
        readSessionStorageJSON(PENDING_ORDER_KEY),
        scannedTable,
        payerNameInput
      );
    }
  });

  if (resetMenuBtn) {
    resetMenuBtn.onclick = () => {
      const selectionStates = getSelectionStates().filter((state) => state.hasSelection);

      if (selectionStates.length === 0) {
        return;
      }

      const confirmed = confirm("선택한 메뉴를 모두 초기화할까요?");
      if (!confirmed) {
        return;
      }

      resetAllCounters();
    };
  }

  orderForm.onsubmit = async (e) => {
    e.preventDefault();

    if (submitBtn.disabled) {
      return;
    }

    if (scannedTable === "unknown") {
      alert("유효한 테이블 QR로 접속해 주세요.");
      return;
    }

    if (!isValidTableNumber(scannedTable)) {
      alert("테이블 번호는 1번부터 100번까지만 가능합니다.");
      return;
    }

    let name = payerNameInput.value.trim();
    name = validateName(name);

    if (!name) {
      alert("입금자명은 '이름(테이블번호)' 형식으로 입력해 주세요. 예: 홍길동(3)");
      return;
    }

    if (!validateTableMatch(name, scannedTable)) {
      return;
    }

    const invalidComboSelections = getInvalidComboSelections();

    if (invalidComboSelections.length > 0) {
      alert(buildInvalidComboAlertMessage(invalidComboSelections));
      return;
    }

    const items = getSelectedItems();

    if (items.length === 0) {
      alert("메뉴를 한 개 이상 선택해 주세요.");
      return;
    }

    submitBtn.disabled = true;

    try {
      const activeSession = await getActiveTableSession(scannedTable);

      if (!activeSession) {
        alert("현재 입장 처리되지 않은 테이블입니다. 테이블 담당자에게 문의해 주세요.");
        return;
      }

      const firstOrder = await isFirstSessionOrder(activeSession.sessionId);

      if (firstOrder && !hasRequiredFirstOrderItems(items)) {
        alert("첫 주문 시에는 메인 1개 이상 + 사이드 1개 이상, 메인 2개 이상, 또는 사이드 3개 이상 주문해 주세요.");
        return;
      }

      writeSessionStorageJSON(PENDING_ORDER_KEY, {
        table: scannedTable,
        sessionId: String(activeSession.sessionId),
        name,
        items,
        savedAt: Date.now()
      });

      window.location.href = `check.html?table=${encodeURIComponent(scannedTable)}`;
    } catch (error) {
      console.error("테이블 세션 확인 실패:", error);
      alert("테이블 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      submitBtn.disabled = false;
    }
  };

  if (menuViewBtn) {
    menuViewBtn.onclick = () => {
      menuModal.style.display = "flex";
    };
  }

  if (closeMenuModal) {
    closeMenuModal.onclick = () => {
      menuModal.style.display = "none";
    };
  }
});
