import test from "node:test";
import assert from "node:assert/strict";
import {
  taskOrder,
  isToday,
  validDay,
  validateTaskExtras,
  makeTimer,
  startTimer,
  pauseTimer,
  remainingMs,
  timerText,
  noteTitle,
  createDraftStore,
} from "./productivity.js";
import { newProject, validateContent, localDay } from "./domain.js";
test("planner prioritizes overdue over high-priority future work, excludes finished and paused projects", () => {
  const a = newProject({ title: "진행중" }),
    b = newProject({ title: "쉬는중" });
  b.status = "paused";
  a.tasks = [
    {
      id: crypto.randomUUID(),
      text: "나중에",
      done: false,
      priority: 2,
      dueDate: "2026-11-01",
    },
    {
      id: crypto.randomUUID(),
      text: "기한 지남",
      done: false,
      dueDate: "2026-10-24",
    },
    {
      id: crypto.randomUUID(),
      text: "오늘 선택",
      done: false,
      plannedFor: "2026-10-25",
    },
    {
      id: crypto.randomUUID(),
      text: "완료",
      done: true,
      dueDate: "2026-10-20",
    },
  ];
  b.tasks = [{ id: crypto.randomUUID(), text: "쉬는 프로젝트", done: false }];
  assert.deepEqual(
    taskOrder([a, b], "2026-10-25").map((x) => x.task.text),
    ["기한 지남", "오늘 선택", "나중에"],
  );
  assert.equal(isToday(a.tasks[1], "2026-10-25"), true);
  assert.equal(isToday(a.tasks[0], "2026-10-25"), false);
});
test("invalid calendar dates or restored priorities cannot enter stored records; old records remain compatible", () => {
  assert.equal(validDay("2026-02-29"), false);
  assert.equal(validDay("2028-02-29"), true);
  assert.equal(validDay("2026-02-31"), false);
  assert.equal(validDay("2026-10-25"), true);
  assert.throws(() => validateTaskExtras({ dueDate: "2026-02-31" }));
  assert.throws(() => validateTaskExtras({ priority: "2" }));
  const p = newProject();
  p.tasks = [{ id: crypto.randomUUID(), text: "이전 할 일", done: false }];
  assert.equal(validateContent(p), p);
  assert.equal(localDay(new Date("2026-10-24T16:00:00Z")), "2026-10-25");
});
test("focus clock uses elapsed wall time, survives a suspended tab and pause/resume without losing time", () => {
  const initial = makeTimer("p", "t", 5),
    running = startTimer(initial, 1000);
  assert.equal(remainingMs(running, 61000), 240000);
  const paused = pauseTimer(running, 61000);
  assert.equal(remainingMs(paused, 900000), 240000);
  const resumed = startTimer(paused, 900000);
  assert.equal(remainingMs(resumed, 960000), 180000);
  assert.equal(remainingMs(resumed, 2000000), 0);
  assert.equal(timerText(1), "00:01");
  assert.equal(timerText(0), "00:00");
});
test("draft scopes stay isolated, corrupt data and unavailable storage fail without crashing", () => {
  const map = new Map(),
    storage = {
      get length() {
        return map.size;
      },
      getItem: (k) => map.get(k) || null,
      setItem: (k, v) => map.set(k, v),
      removeItem: (k) => map.delete(k),
      key: (j) => [...map.keys()][j],
    };
  const a = createDraftStore(storage, "a"),
    b = createDraftStore(storage, "b");
  a.set("capture", { fields: { text: "개인 메모" } });
  b.set("capture", { fields: { text: "다른 메모" } });
  assert.equal(a.get("capture").fields.text, "개인 메모");
  a.clear();
  assert.equal(a.get("capture"), null);
  assert.equal(b.get("capture").fields.text, "다른 메모");
  storage.setItem("savepoint.draft.b.corrupt", "{broken");
  assert.equal(b.get("corrupt"), null);
  const noStorage = createDraftStore(
    {
      setItem() {
        throw Error("quota");
      },
    },
    "c",
  );
  assert.equal(noStorage.set("capture", {}), false);
  assert.equal(noStorage.get("capture"), null);
});
test("quick thought titles are readable and capped without needing a title field", () => {
  assert.equal(noteTitle("\n  첫 아이디어\n뒷부분"), "첫 아이디어");
  assert.equal(noteTitle("x".repeat(100)).length, 70);
});
