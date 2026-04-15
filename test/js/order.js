import { db } from "./common.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

let isSubmitting = false;

export async function saveOrder(orderData) {
  if (isSubmitting) {
    throw new Error("already-submitting");
  }

  isSubmitting = true;

  try {
    const docRef = await addDoc(collection(db, "orders"), {
      table: orderData.table,
      name: orderData.name,
      items: orderData.items,
      timestamp: Date.now(),
      completed: false,
      status: "주문 완료"
    });

    return docRef;
  } finally {
    isSubmitting = false;
  }
}