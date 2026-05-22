import { db, storage } from "./common.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-storage.js";
import { normalizeMenuOptions, normalizeComboRule } from "./utils.js";

const auth = getAuth();

const authBox = document.getElementById("authBox");
const managerBox = document.getElementById("managerBox");

const loginEmailInput = document.getElementById("loginEmailInput");
const loginPasswordInput = document.getElementById("loginPasswordInput");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const currentAdminEmail = document.getElementById("currentAdminEmail");

const bankNameInput = document.getElementById("bankNameInput");
const accountNoInput = document.getElementById("accountNoInput");
const accountHolderInput = document.getElementById("accountHolderInput");
const seatFeePerPersonInput = document.getElementById("seatFeePerPersonInput");
const savePaymentBtn = document.getElementById("savePaymentBtn");

const menuNameInput = document.getElementById("menuNameInput");
const menuPriceInput = document.getElementById("menuPriceInput");
const menuTypeInput = document.getElementById("menuTypeInput");
const comboEnabledInput = document.getElementById("comboEnabledInput");
const comboUnitSizeSection = document.getElementById("comboUnitSizeSection");
const comboUnitSizeInput = document.getElementById("comboUnitSizeInput");
const menuOptionsList = document.getElementById("menuOptionsList");
const addMenuOptionBtn = document.getElementById("addMenuOptionBtn");
const menuSoldOutInput = document.getElementById("menuSoldOutInput");
const menuVisibleInput = document.getElementById("menuVisibleInput");
const saveMenuBtn = document.getElementById("saveMenuBtn");
const resetMenuFormBtn = document.getElementById("resetMenuFormBtn");

const menuImageFileInput = document.getElementById("menuImageFileInput");
const uploadMenuImageBtn = document.getElementById("uploadMenuImageBtn");
const currentMenuImage = document.getElementById("currentMenuImage");

const menuManagerList = document.getElementById("menuManagerList");

let editingMenuId = null;
let unsubscribeMenus = null;
let currentMenus = [];
const DEFAULT_SEAT_FEE_PER_PERSON = 10000;

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

function getMenuTypeLabel(type) {
  if (type === "main") return "메인";
  if (type === "side") return "사이드";
  if (type === "drink") return "음료";
  return type || "-";
}

function sanitizePriceText(value) {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

function normalizeSeatFeePerPerson(value) {
  const seatFeePerPerson = parseInt(value, 10);

  if (!Number.isFinite(seatFeePerPerson) || seatFeePerPerson <= 0) {
    return DEFAULT_SEAT_FEE_PER_PERSON;
  }

  return seatFeePerPerson;
}

function updateComboRuleUI() {
  comboUnitSizeSection.hidden = !comboEnabledInput.checked;

  if (!comboEnabledInput.checked) {
    comboUnitSizeInput.value = "";
  }
}

function createMenuOptionRow(option = {}) {
  const row = document.createElement("div");
  row.className = "menu-option-editor-row";

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.className = "menu-option-editor-label";
  labelInput.placeholder = "옵션명 예: 밥 추가";
  labelInput.value = String(option.label || "").trim();

  const priceInput = document.createElement("input");
  priceInput.type = "text";
  priceInput.className = "menu-option-editor-price";
  priceInput.placeholder = "추가 금액";
  priceInput.value =
    Number.isFinite(Number(option.price)) && Number(option.price) >= 0
      ? String(Number(option.price))
      : "";
  priceInput.oninput = () => {
    priceInput.value = sanitizePriceText(priceInput.value);
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "삭제";
  deleteBtn.onclick = () => {
    row.remove();
  };

  row.appendChild(labelInput);
  row.appendChild(priceInput);
  row.appendChild(deleteBtn);

  return row;
}

function appendMenuOptionRow(option = {}) {
  menuOptionsList.appendChild(createMenuOptionRow(option));
}

function renderMenuOptionRows(options = []) {
  menuOptionsList.innerHTML = "";

  normalizeMenuOptions(options).forEach((option) => {
    appendMenuOptionRow(option);
  });
}

function readMenuOptionsFromForm() {
  const rows = Array.from(menuOptionsList.querySelectorAll(".menu-option-editor-row"));
  const options = [];

  rows.forEach((row) => {
    const labelInput = row.querySelector(".menu-option-editor-label");
    const priceInput = row.querySelector(".menu-option-editor-price");

    const label = String(labelInput?.value || "").trim();
    const rawPrice = String(priceInput?.value || "").trim();
    const normalizedPrice = sanitizePriceText(rawPrice);

    if (!label && !rawPrice) {
      return;
    }

    if (!label) {
      throw new Error("option-label-required");
    }

    if (!normalizedPrice) {
      throw new Error("option-price-required");
    }

    options.push({
      label,
      price: Number(normalizedPrice)
    });
  });

  return options;
}

function formatMenuOptionSummary(options) {
  const normalizedOptions = normalizeMenuOptions(options);

  if (normalizedOptions.length === 0) {
    return "";
  }

  return normalizedOptions
    .map((option) => `${option.label} (+${Number(option.price).toLocaleString()}원)`)
    .join(", ");
}

function formatComboRuleSummary(comboRule) {
  const normalizedComboRule = normalizeComboRule(comboRule);

  if (!normalizedComboRule) {
    return "";
  }

  return `${normalizedComboRule.unitSize}개 단위`;
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

function getNextSortOrder(menus) {
  const sortedMenus = getSortedMenus(menus);

  if (sortedMenus.length === 0) {
    return 1;
  }

  const lastMenu = sortedMenus[sortedMenus.length - 1];

  if (hasValidSortOrder(lastMenu)) {
    return Number(lastMenu.sortOrder) + 1;
  }

  return sortedMenus.length + 1;
}

async function assignSequentialSortOrders(menus) {
  const batch = writeBatch(db);
  let hasChanges = false;

  menus.forEach((menu, index) => {
    const nextSortOrder = index + 1;

    if (Number(menu.sortOrder) === nextSortOrder) {
      return;
    }

    batch.update(doc(db, "menus", menu.id), {
      sortOrder: nextSortOrder
    });
    hasChanges = true;
  });

  if (hasChanges) {
    await batch.commit();
  }

  return menus.map((menu, index) => ({
    ...menu,
    sortOrder: index + 1
  }));
}

async function swapMenuSortOrder(currentMenu, adjacentMenu) {
  const batch = writeBatch(db);

  batch.update(doc(db, "menus", currentMenu.id), {
    sortOrder: Number(adjacentMenu.sortOrder)
  });
  batch.update(doc(db, "menus", adjacentMenu.id), {
    sortOrder: Number(currentMenu.sortOrder)
  });

  await batch.commit();
}

async function moveMenu(menuId, direction) {
  const sortedMenus = getSortedMenus(currentMenus);
  const currentIndex = sortedMenus.findIndex((menu) => menu.id === menuId);

  if (currentIndex === -1) {
    return;
  }

  const targetIndex = currentIndex + direction;

  if (targetIndex < 0 || targetIndex >= sortedMenus.length) {
    return;
  }

  let workingMenus = sortedMenus;
  let currentMenu = workingMenus[currentIndex];
  let adjacentMenu = workingMenus[targetIndex];

  if (
    !hasValidSortOrder(currentMenu) ||
    !hasValidSortOrder(adjacentMenu) ||
    Number(currentMenu.sortOrder) === Number(adjacentMenu.sortOrder)
  ) {
    workingMenus = await assignSequentialSortOrders(sortedMenus);
    currentMenu = workingMenus[currentIndex];
    adjacentMenu = workingMenus[targetIndex];
  }

  await swapMenuSortOrder(currentMenu, adjacentMenu);
}

function resetForm() {
  editingMenuId = null;
  menuNameInput.value = "";
  menuPriceInput.value = "";
  menuTypeInput.value = "main";
  comboEnabledInput.checked = false;
  comboUnitSizeInput.value = "";
  updateComboRuleUI();
  renderMenuOptionRows();
  menuSoldOutInput.checked = false;
  menuVisibleInput.checked = true;
  saveMenuBtn.textContent = "저장";
}

function showLoggedOutUI() {
  authBox.style.display = "block";
  managerBox.style.display = "none";
}

function showLoggedInUI(email) {
  authBox.style.display = "none";
  managerBox.style.display = "block";
  currentAdminEmail.textContent = `${email} 로그인됨`;
}

async function loadSettings() {
  try {
    const settingsRef = doc(db, "settings", "public");
    const snapshot = await getDoc(settingsRef);

    seatFeePerPersonInput.value = String(DEFAULT_SEAT_FEE_PER_PERSON);

    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();

    if (data.menuImageUrl) {
      currentMenuImage.src = data.menuImageUrl;
    }

    if (data.bankName) {
      bankNameInput.value = data.bankName;
    }

    accountNoInput.value = data.accountNo || "";
    accountHolderInput.value = data.accountHolder || "";
    seatFeePerPersonInput.value = String(
      normalizeSeatFeePerPerson(data.seatFeePerPerson)
    );
  } catch (error) {
    console.error("설정 조회 실패:", error);
  }
}

function startMenuListener() {
  if (unsubscribeMenus) {
    unsubscribeMenus();
  }

  unsubscribeMenus = onSnapshot(collection(db, "menus"), (snapshot) => {
    menuManagerList.innerHTML = "";
    currentMenus = getSortedMenus(
      snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
    );

    currentMenus.forEach((menu, index) => {
      const data = menu;
      const id = menu.id;
      const isFirst = index === 0;
      const isLast = index === currentMenus.length - 1;
      const optionSummary = formatMenuOptionSummary(data.options);
      const comboSummary = formatComboRuleSummary(data.comboRule);

      const card = document.createElement("div");
      card.className = "order";

      card.innerHTML = `
        <p><strong>${data.name}</strong></p>
        <p>가격: ${Number(data.price).toLocaleString()}원</p>
        <p>구분: ${getMenuTypeLabel(data.type)}</p>
        ${comboSummary ? `<p>조합형: ${comboSummary}</p>` : ""}
        ${optionSummary ? `<p>옵션: ${optionSummary}</p>` : ""}
        <p>매진: ${data.soldOut ? "예" : "아니오"}</p>
        <p>표시: ${data.visible === false ? "숨김" : "표시"}</p>
        <button class="toggle-btn move-up-btn" ${isFirst ? "disabled" : ""}>위로</button>
        <button class="toggle-btn move-down-btn" ${isLast ? "disabled" : ""}>아래로</button>
        <button class="toggle-btn edit-btn">수정</button>
        <button class="delete-btn delete-menu-btn">삭제</button>
      `;

      const moveUpBtn = card.querySelector(".move-up-btn");
      const moveDownBtn = card.querySelector(".move-down-btn");
      const editBtn = card.querySelector(".edit-btn");
      const deleteBtn = card.querySelector(".delete-menu-btn");

      moveUpBtn.onclick = async () => {
        if (moveUpBtn.disabled) return;
        await moveMenu(id, -1);
      };

      moveDownBtn.onclick = async () => {
        if (moveDownBtn.disabled) return;
        await moveMenu(id, 1);
      };

      editBtn.onclick = () => {
        editingMenuId = id;
        menuNameInput.value = data.name || "";
        menuPriceInput.value = data.price ?? "";
        menuTypeInput.value = data.type || "main";
        const comboRule = normalizeComboRule(data.comboRule);
        comboEnabledInput.checked = !!comboRule;
        comboUnitSizeInput.value = comboRule ? String(comboRule.unitSize) : "";
        updateComboRuleUI();
        renderMenuOptionRows(data.options);
        menuSoldOutInput.checked = !!data.soldOut;
        menuVisibleInput.checked = data.visible !== false;
        saveMenuBtn.textContent = "수정 저장";
        window.scrollTo({ top: 0, behavior: "smooth" });
      };

      deleteBtn.onclick = async () => {
        const confirmed = confirm(`"${data.name}" 메뉴를 삭제할까요?`);
        if (!confirmed) return;

        await deleteDoc(doc(db, "menus", id));

        if (editingMenuId === id) {
          resetForm();
        }
      };

      menuManagerList.appendChild(card);
    });
  });
}

loginBtn.onclick = async () => {
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value.trim();

  if (!email || !password) {
    alert("이메일과 비밀번호를 입력해 주세요.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginPasswordInput.value = "";
  } catch (error) {
    console.error("로그인 실패:", error);
    alert("로그인에 실패했어요. 이메일과 비밀번호를 확인해 주세요.");
  }
};

logoutBtn.onclick = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("로그아웃 실패:", error);
    alert("로그아웃에 실패했어요.");
  }
};

savePaymentBtn.onclick = async () => {
  const bankName = bankNameInput.value;
  const accountNo = accountNoInput.value.replace(/[^0-9]/g, "");
  const accountHolder = accountHolderInput.value.trim();
  const seatFeePerPersonText = sanitizePriceText(seatFeePerPersonInput.value);
  const seatFeePerPerson = parseInt(seatFeePerPersonText, 10);

  if (!bankName) {
    alert("은행명을 선택해 주세요.");
    return;
  }

  if (!accountNo) {
    alert("계좌번호를 입력해 주세요.");
    return;
  }

  if (!accountHolder) {
    alert("예금주를 입력해 주세요.");
    return;
  }

  if (!Number.isFinite(seatFeePerPerson) || seatFeePerPerson <= 0) {
    alert("자릿세 단가를 올바르게 입력해 주세요.");
    return;
  }

  try {
    await setDoc(
      doc(db, "settings", "public"),
      {
        bankName,
        accountNo,
        accountHolder,
        seatFeePerPerson
      },
      { merge: true }
    );

    accountNoInput.value = accountNo;
    seatFeePerPersonInput.value = String(seatFeePerPerson);
    alert("결제 정보와 자릿세 단가가 저장되었습니다.");
  } catch (error) {
    console.error("설정 저장 실패:", error);
    alert("설정 저장에 실패했어요.");
  }
};

saveMenuBtn.onclick = async () => {
  const name = menuNameInput.value.trim();
  const price = Number(menuPriceInput.value);
  let options = [];
  let comboRule = null;

  if (!name) {
    alert("메뉴 이름을 입력해 주세요.");
    return;
  }

  if (!price || price < 0) {
    alert("가격을 올바르게 입력해 주세요.");
    return;
  }

  if (comboEnabledInput.checked) {
    const unitSize = parseInt(comboUnitSizeInput.value, 10);

    if (!Number.isFinite(unitSize) || unitSize <= 0) {
      alert("조합 단위 개수를 올바르게 입력해 주세요.");
      return;
    }

    comboRule = {
      enabled: true,
      unitSize
    };
  }

  try {
    options = readMenuOptionsFromForm();
  } catch (error) {
    if (error.message === "option-label-required") {
      alert("옵션 이름을 입력해 주세요.");
      return;
    }

    if (error.message === "option-price-required") {
      alert("옵션 가격을 올바르게 입력해 주세요.");
      return;
    }

    console.error("옵션 정보 확인 실패:", error);
    alert("옵션 정보를 확인해 주세요.");
    return;
  }

  if (comboRule && options.length === 0) {
    alert("조합형 메뉴는 구성 옵션을 한 개 이상 추가해 주세요.");
    return;
  }

  const payload = {
    name,
    price,
    type: menuTypeInput.value,
    options,
    soldOut: menuSoldOutInput.checked,
    visible: menuVisibleInput.checked
  };

  if (comboRule) {
    payload.comboRule = comboRule;
  } else if (editingMenuId) {
    payload.comboRule = deleteField();
  }

  try {
    if (editingMenuId) {
      await updateDoc(doc(db, "menus", editingMenuId), payload);
    } else {
      await addDoc(collection(db, "menus"), {
        ...payload,
        sortOrder: getNextSortOrder(currentMenus),
        createdAt: Date.now()
      });
    }

    resetForm();
  } catch (error) {
    console.error("메뉴 저장 실패:", error);
    alert("메뉴 저장에 실패했어요.");
  }
};

resetMenuFormBtn.onclick = () => {
  resetForm();
};

addMenuOptionBtn.onclick = () => {
  appendMenuOptionRow();
};

comboEnabledInput.onchange = () => {
  updateComboRuleUI();
};

comboUnitSizeInput.oninput = () => {
  comboUnitSizeInput.value = sanitizePriceText(comboUnitSizeInput.value);
};

seatFeePerPersonInput.oninput = () => {
  seatFeePerPersonInput.value = sanitizePriceText(seatFeePerPersonInput.value);
};

uploadMenuImageBtn.onclick = async () => {
  const file = menuImageFileInput.files[0];

  if (!file) {
    alert("업로드할 이미지 파일을 선택해 주세요.");
    return;
  }

  try {
    const storageRef = ref(storage, `menu-images/current-menu-${Date.now()}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    await setDoc(
      doc(db, "settings", "public"),
      { menuImageUrl: downloadURL },
      { merge: true }
    );

    currentMenuImage.src = downloadURL;
    menuImageFileInput.value = "";
    alert("메뉴판 이미지가 업로드되었습니다.");
  } catch (error) {
    console.error("메뉴판 이미지 업로드 실패:", error);
    alert("메뉴판 이미지 업로드에 실패했어요.");
  }
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showLoggedOutUI();

    if (unsubscribeMenus) {
      unsubscribeMenus();
      unsubscribeMenus = null;
    }

    menuManagerList.innerHTML = "";
    resetForm();
    return;
  }

  showLoggedInUI(user.email || "관리자");
  await loadSettings();
  startMenuListener();
});

updateComboRuleUI();
renderMenuOptionRows();
seatFeePerPersonInput.value = String(DEFAULT_SEAT_FEE_PER_PERSON);
