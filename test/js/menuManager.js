import { db, storage } from "./common.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  getDoc
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
const savePaymentBtn = document.getElementById("savePaymentBtn");

const menuNameInput = document.getElementById("menuNameInput");
const menuPriceInput = document.getElementById("menuPriceInput");
const menuTypeInput = document.getElementById("menuTypeInput");
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

function resetForm() {
  editingMenuId = null;
  menuNameInput.value = "";
  menuPriceInput.value = "";
  menuTypeInput.value = "main";
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
  } catch (error) {
    console.error("설정 조회 실패:", error);
  }
}

function startMenuListener() {
  if (unsubscribeMenus) {
    unsubscribeMenus();
  }

  const q = query(collection(db, "menus"), orderBy("createdAt", "asc"));

  unsubscribeMenus = onSnapshot(q, (snapshot) => {
    menuManagerList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;

      const card = document.createElement("div");
      card.className = "order";

      card.innerHTML = `
        <p><strong>${data.name}</strong></p>
        <p>가격: ${Number(data.price).toLocaleString()}원</p>
        <p>구분: ${data.type === "main" ? "메인" : "사이드"}</p>
        <p>매진: ${data.soldOut ? "예" : "아니오"}</p>
        <p>표시: ${data.visible === false ? "숨김" : "표시"}</p>
        <button class="toggle-btn">수정</button>
        <button class="delete-btn">삭제</button>
      `;

      const editBtn = card.querySelector(".toggle-btn");
      const deleteBtn = card.querySelector(".delete-btn");

      editBtn.onclick = () => {
        editingMenuId = id;
        menuNameInput.value = data.name || "";
        menuPriceInput.value = data.price || "";
        menuTypeInput.value = data.type || "main";
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

  try {
    await setDoc(
      doc(db, "settings", "public"),
      {
        bankName,
        accountNo,
        accountHolder
      },
      { merge: true }
    );

    accountNoInput.value = accountNo;
    alert("결제 정보가 저장되었습니다.");
  } catch (error) {
    console.error("결제 정보 저장 실패:", error);
    alert("결제 정보 저장에 실패했어요.");
  }
};

saveMenuBtn.onclick = async () => {
  const name = menuNameInput.value.trim();
  const price = Number(menuPriceInput.value);

  if (!name) {
    alert("메뉴 이름을 입력해 주세요.");
    return;
  }

  if (!price || price < 0) {
    alert("가격을 올바르게 입력해 주세요.");
    return;
  }

  const payload = {
    name,
    price,
    type: menuTypeInput.value,
    soldOut: menuSoldOutInput.checked,
    visible: menuVisibleInput.checked
  };

  try {
    if (editingMenuId) {
      await updateDoc(doc(db, "menus", editingMenuId), payload);
    } else {
      await addDoc(collection(db, "menus"), {
        ...payload,
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