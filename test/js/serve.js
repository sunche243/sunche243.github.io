import { db } from "./common.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

const allowedNames = [
  "구광민", "김가연", "김민수", "김유찬", "김준겸", "김표수",
  "박건우", "박상민", "박재환", "박찬준", "박현서",
  "민수영", "육정민", "이지윤", "이현서", "장은우",
  "정지우", "한지오", "허영", "홍정우",
  "김민지", "김영인", "김은석", "김주아",
  "최민웅", "박상진", "신태민", "정유현", "이주형",
  "이현수", "장민", "정성혁", "정채원", "지현서", "허성빈"
];

window.addEventListener("DOMContentLoaded", () => {
  let currentUser = localStorage.getItem("serverName") || "";

  if (!currentUser) {
    currentUser = prompt("당신의 이름을 입력해 주세요 (서빙 담당자)");
    if (currentUser) {
      localStorage.setItem("serverName", currentUser);
    } else {
      location.reload();
      return;
    }
  }

  if (!allowedNames.includes(currentUser)) {
    alert("접근 권한이 없습니다.");
    localStorage.removeItem("serverName");
    location.reload();
    return;
  }

  const container = document.getElementById("orders");

  const q = query(
    collection(db, "orders"),
    where("completed", "==", true)
  );

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;

      if (!Array.isArray(data.items)) return;

      const serveStatus = data.serveStatus || {};

      data.items.forEach((item, itemIndex) => {
        for (let countIndex = 0; countIndex < item.count; countIndex++) {
          const serveId = `${docId}_${itemIndex}_${countIndex}`;
          const itemStatus = serveStatus[serveId]?.status || "주문 완료";
          const assignedTo = serveStatus[serveId]?.assignedTo || null;

          const div = document.createElement("div");
          div.className = "item";

          if (itemStatus === "서빙 예정") div.classList.add("serving");
          if (itemStatus === "서빙 완료") div.classList.add("done");

          div.innerHTML = `
            <p><strong>${item.name}</strong></p>
            <p>테이블: ${data.table}</p>
            <p>입금자: ${data.name}</p>
            <p>상태: ${itemStatus}${assignedTo ? ` (${assignedTo})` : ""}</p>
          `;

          if (itemStatus === "주문 완료") {
            const btn = document.createElement("button");
            btn.textContent = "서빙 예정";
            btn.className = "assign";

            btn.onclick = async () => {
              await updateDoc(doc(db, "orders", docId), {
                [`serveStatus.${serveId}`]: {
                  status: "서빙 예정",
                  assignedTo: currentUser
                }
              });
            };

            div.appendChild(btn);
          } else if (itemStatus === "서빙 예정" && assignedTo === currentUser) {
            const btn = document.createElement("button");
            btn.textContent = "서빙 완료";
            btn.className = "complete";

            btn.onclick = async () => {
              await updateDoc(doc(db, "orders", docId), {
                [`serveStatus.${serveId}`]: {
                  status: "서빙 완료",
                  assignedTo: currentUser
                }
              });
            };

            div.appendChild(btn);
          }

          if (itemStatus !== "서빙 완료") {
            container.appendChild(div);
          }
        }
      });
    });
  });
});