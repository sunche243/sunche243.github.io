import { db } from "./common.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

let isSubmitting = false;

function buildOrderPayload({ table, name, items }) {
  return {
    table,
    name,
    items,
    timestamp: Date.now(),
    completed: false,
    deleted: false,
    serveStatus: {}
  };
}

export async function saveOrder(orderData) {
  if (isSubmitting) {
    throw new Error("already-submitting");
  }

  isSubmitting = true;

  try {
    const payload = buildOrderPayload(orderData);
    const docRef = await addDoc(collection(db, "orders"), payload);
    return docRef;
  } catch (error) {
    console.error("주문 저장 실패:", error);
    throw error;
  } finally {
    isSubmitting = false;
  }
}