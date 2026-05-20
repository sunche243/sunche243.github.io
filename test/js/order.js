import { db } from "./common.js";
import { normalizeTableNumber, isValidTableNumber } from "./utils.js";
import {
  collection,
  doc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

let isSubmitting = false;

function buildOrderPayload({ table, sessionId, name, items, timestamp }) {
  return {
    table,
    sessionId,
    name,
    items,
    timestamp,
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
    const normalizedTable = normalizeTableNumber(orderData.table);

    if (!isValidTableNumber(normalizedTable)) {
      throw new Error("invalid-table");
    }

    if (!orderData.sessionId) {
      throw new Error("inactive-session");
    }

    const orderRef = doc(collection(db, "orders"));

    await runTransaction(db, async (transaction) => {
      const tableRef = doc(db, "tables", normalizedTable);
      const tableSnapshot = await transaction.get(tableRef);

      if (!tableSnapshot.exists()) {
        throw new Error("inactive-session");
      }

      const tableData = tableSnapshot.data();

      if (
        tableData.status !== "occupied" ||
        !tableData.currentSessionId ||
        String(tableData.currentSessionId) !== String(orderData.sessionId)
      ) {
        throw new Error("inactive-session");
      }

      const payload = buildOrderPayload({
        ...orderData,
        table: normalizedTable,
        timestamp: Date.now()
      });

      transaction.set(orderRef, payload);
    });

    return orderRef;
  } catch (error) {
    console.error("주문 저장 실패:", error);
    throw error;
  } finally {
    isSubmitting = false;
  }
}
