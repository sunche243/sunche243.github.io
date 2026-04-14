import { db } from "./common.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

let isSubmitting = false;

export async function saveOrder({ table, name, items }) {
  if (isSubmitting) return;
  isSubmitting = true;

  await addDoc(collection(db, "orders"), {
    table,
    name,
    items,
    timestamp: Date.now(),
    completed: false,
    status: "주문 완료"
  });
}