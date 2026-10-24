import { localDay } from "./calendar.js";
export function validDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function taskOrder(projects, day = localDay()) {
  return projects
    .filter((p) => p.status === "active")
    .flatMap((p) =>
      p.tasks.filter((t) => !t.done).map((task) => ({ task, project: p })),
    )
    .sort((a, b) => {
      const rank = (t) =>
        t.dueDate && t.dueDate < day
          ? 0
          : t.plannedFor === day || t.dueDate === day
            ? 1
            : 2;
      return (
        rank(a.task) - rank(b.task) ||
        (b.task.priority || 0) - (a.task.priority || 0) ||
        (a.task.dueDate || "9999").localeCompare(b.task.dueDate || "9999") ||
        a.project.createdAt.localeCompare(b.project.createdAt)
      );
    });
}
export function isToday(task, day = localDay()) {
  return task.plannedFor === day || !!(task.dueDate && task.dueDate <= day);
}
export function remainingMs(timer, now = Date.now()) {
  return timer.running
    ? Math.max(0, timer.endAt - now)
    : Math.max(0, timer.remainingMs);
}
export function timerText(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
export function pauseTimer(timer, now = Date.now()) {
  return {
    ...timer,
    running: false,
    remainingMs: remainingMs(timer, now),
    endAt: null,
  };
}
export function startTimer(timer, now = Date.now()) {
  return { ...timer, running: true, endAt: now + timer.remainingMs };
}
export function makeTimer(projectId, taskId, minutes = 15) {
  return {
    projectId,
    taskId,
    totalMs: minutes * 60000,
    remainingMs: minutes * 60000,
    running: false,
    endAt: null,
  };
}
export function noteTitle(text) {
  return (
    text.trim().split("\n").find(Boolean)?.slice(0, 70) || "잠깐 떠오른 생각"
  );
}
export function validateTaskExtras(task) {
  for (const key of ["dueDate", "plannedFor"])
    if (task[key] !== undefined && task[key] !== "" && !validDay(task[key]))
      throw Error("올바른 날짜를 입력해 주세요.");
  if (task.priority !== undefined && ![0, 1, 2].includes(task.priority))
    throw Error("중요도를 확인해 주세요.");
  return task;
}
export function createDraftStore(storage, scope) {
  const prefix = `savepoint.draft.${scope}.`;
  return {
    get(key) {
      try {
        const raw = storage.getItem(prefix + key),
          value = raw ? JSON.parse(raw) : null;
        return value &&
          typeof value === "object" &&
          value.fields &&
          typeof value.fields === "object"
          ? value
          : null;
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        storage.setItem(prefix + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        storage.removeItem(prefix + key);
      } catch {}
    },
    clear() {
      try {
        for (let j = storage.length - 1; j >= 0; j--) {
          const k = storage.key(j);
          if (k?.startsWith(prefix)) storage.removeItem(k);
        }
      } catch {}
    },
  };
}
