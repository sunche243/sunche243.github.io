import { db } from "./common.js";
import { priceMap } from "./menuData.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

const ordersDiv = document.getElementById("orders");

const q = query(
  collection(db, "orders"),
  orderBy("timestamp", "desc")
);

onSnapshot(q, (snapshot) => {
  ordersDiv.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;

    const total = (data.items || []).reduce((sum, item) => {
      return sum + (priceMap[item.name] || 0) * item.count;
    }, 0);

    const itemList = (data.items || [])
      .map((item) => `${item.name} ${item.count}개`)
      .join("<br>");

    const formattedDate = data.timestamp
      ? new Date(data.timestamp).toLocaleString("ko-KR")
      : "";

    const btnText = data.completed ? "확인취소" : "확인";

    const div = document.createElement("div");
    div.className = "order" + (data.completed ? " completed" : "");

    div.innerHTML = `
      <p><strong>테이블 ${data.table}</strong> | 입금자: ${data.name}</p>
      <p>주문:<br>${itemList}</p>
      <p><strong>총 금액: ${total.toLocaleString()}원</strong></p>
      <small>${formattedDate}</small><br>
      <button class="toggle-btn">${btnText}</button>
      <button class="delete-btn">삭제</button>
    `;

    div.querySelector(".toggle-btn").onclick = async () => {
      await updateDoc(doc(db, "orders", id), {
        completed: !data.completed
      });
    };

    div.querySelector(".delete-btn").onclick = async () => {
      if (confirm("정말로 삭제하시겠습니까?")) {
        await deleteDoc(doc(db, "orders", id));
      }
    };

    ordersDiv.appendChild(div);
  });
});