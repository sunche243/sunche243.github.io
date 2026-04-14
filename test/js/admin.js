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

const q = query(collection(db, "orders"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
  ordersDiv.innerHTML = '';

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;

    const total = data.items.reduce((sum, item) => {
      return sum + (priceMap[item.name] || 0) * item.count;
    }, 0);

    const div = document.createElement("div");
    div.className = "order" + (data.completed ? " completed" : "");

    const itemList = data.items
      .map(item => `${item.name} ${item.count}개`)
      .join('<br>');

    div.innerHTML = `
      <p><strong>테이블 ${data.table}</strong> | ${data.name}</p>
      <p>${itemList}</p>
      <p><strong>${total.toLocaleString()}원</strong></p>
      <button class="toggle">확인</button>
      <button class="delete">삭제</button>
    `;

    div.querySelector(".toggle").onclick = async () => {
      await updateDoc(doc(db, "orders", id), {
        completed: !data.completed
      });
    };

    div.querySelector(".delete").onclick = async () => {
      if (confirm("삭제할까요?")) {
        await deleteDoc(doc(db, "orders", id));
      }
    };

    ordersDiv.appendChild(div);
  });
});