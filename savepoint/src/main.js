import "./style.css";
import {
  taskOrder,
  isToday,
  remainingMs,
  timerText,
  pauseTimer,
  startTimer,
  makeTimer,
  noteTitle,
  createDraftStore,
  validateTaskExtras,
} from "./productivity.js";
import { db, loadProjects, persistProject, removeProject } from "./backend.js";
import {
  categories,
  colors,
  escapeHTML as h,
  newProject,
  validateContent,
  progress,
  matches,
  resumePrompt,
  parseConversationFile,
  extractSuggestions,
  safeURL,
  demoProjects,
  localDay,
} from "./domain.js";
import { icon as i } from "./icons.js";
const root = document.querySelector("#app"),
  modal = document.querySelector("#modal");
let user = null,
  projects = [],
  view = "home",
  filter = "all",
  search = "",
  demo = false,
  busy = false,
  loadError = "",
  authGeneration = 0;
const categoryIcon = { project: "folder", study: "book", life: "leaf" };
const today = () =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
const date = (d) => {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "short",
      day: "numeric",
    }).format(new Date(d));
  } catch {
    return "";
  }
};
let toastTimer;
function toast(text) {
  const el = document.querySelector("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}
function button(action, text, icon = "plus", cls = "btn", extra = "") {
  return `<button type="button" class="${cls}" data-action="${action}" ${extra}>${i(icon)}<span>${text}</span></button>`;
}
function logo() {
  return `<span class="brand-symbol">${i("bookmark")}</span><span class="brand-name">savepoint<span>생각을 저장하고, 다음 장면으로.</span></span>`;
}
function login(message = "") {
  root.innerHTML = `<main class="login-page"><section class="login-story"><a href="/savepoint/" class="brand">${logo()}</a><div class="login-story-body"><span class="eyebrow">YOUR PERSONAL WORKSPACE</span><h1>좋은 생각에는<br>다음 장면이<br>필요하니까.</h1><p>어디까지 했는지, 무엇을 정했는지.<br>다시 시작하는 순간을 조금 더 가볍게.</p><div class="paper-scene"><div class="paper-back"></div><div class="paper-front"><span class="paper-top">MY NEXT CHAPTER <span>↗</span></span><div class="paper-line long"></div><div class="paper-line"></div><div class="paper-todo">${i("check")} 생각을 기록하고</div><div class="paper-todo">${i("check")} 맥락을 이어가고</div><div class="paper-todo empty">${i("plus")} 다음 한 걸음으로</div><div class="paper-stamp">keep<br>going.</div></div><span class="scene-star">✳</span></div></div><span class="login-foot">작은 실행이 모여, 나의 이야기가 됩니다.</span></section><section class="login-main"><div class="login-card"><span class="lock-badge">${i("lock")} PRIVATE SPACE</span><h2>나만의 작업실에<br>돌아온 걸 환영해요.</h2><p class="muted">초대된 계정으로 로그인하고, 이야기를 이어가세요.</p><form id="login-form"><label>이메일<input name="email" type="email" autocomplete="username" placeholder="이메일 주소" required maxlength="254"></label><label>비밀번호<div class="password-wrap"><input name="password" type="password" autocomplete="current-password" placeholder="비밀번호를 입력해 주세요" required minlength="6"><button type="button" data-action="toggle-password" aria-label="비밀번호 표시">보기</button></div></label><p id="login-error" class="form-error" role="alert">${h(message)}</p><button class="btn primary full" type="submit">작업실 들어가기 ${i("arrow")}</button></form><p class="login-hint">기존 회계인의 밤 계정으로 로그인할 수 있어요.<br>허용된 계정만 개인 기록에 접근할 수 있습니다.</p><div class="divider"><span>먼저 구경하고 싶다면</span></div>${button("demo", "예시 작업실 둘러보기", "arrow", "btn quiet full")}<p class="privacy-copy">${i("lock")} 개인 기록은 로그인 후에만 불러옵니다.</p></div><span class="login-copyright">SAVE YOUR PROGRESS. MAKE YOUR NEXT MOVE.</span></section></main>`;
}
function sidebar() {
  return `<aside class="sidebar"><a class="brand" href="#home" data-action="nav" data-view="home" aria-label="세이브포인트 홈">${logo()}</a><div class="workspace-label">MY WORKSPACE <span>01</span></div><nav aria-label="작업실 메뉴">${[
    ["home", "home", "오늘의 작업실"],
    ["today", "check", "오늘 할 일"],
    ["focus", "clock", "한 가지에 집중"],
    ["projects", "folder", "모든 프로젝트"],
    ["notes", "note", "기억 보관함"],
    ["wins", "flag", "내가 해낸 것"],
  ]
    .map(
      ([id, ic, t]) =>
        `<button data-action="nav" data-view="${id}" class="nav-item ${view === id ? "active" : ""}">${i(ic)}${t}${id === "projects" ? `<span class="nav-count">${projects.length}</span>` : ""}</button>`,
    )
    .join(
      "",
    )}</nav><div class="sidebar-label">나의 영역</div><div class="areas">${Object.entries(
    categories,
  )
    .map(
      ([key, t]) =>
        `<button data-action="category" data-category="${key}"><span class="area-dot ${key}"></span>${t}<span>${projects.filter((p) => p.category === key && p.status === "active").length}</span></button>`,
    )
    .join(
      "",
    )}</div><div class="sidebar-bottom"><div class="private-note">${i("lock")}<div>오직 나만의 공간<span>${demo ? "예시 데이터로 둘러보는 중" : "기록은 내 계정에 안전하게 보관돼요"}</span></div></div>${button("settings", "작업실 설정", "settings", "nav-item")}<div class="user-profile"><div class="avatar">${demo ? "S" : "찬"}</div><div><b>${demo ? "예시 작업실" : "찬준의 작업실"}</b><span>${demo ? "DEMO WORKSPACE" : "PERSONAL WORKSPACE"}</span></div><button class="icon-btn" data-action="logout" aria-label="${demo ? "둘러보기 종료" : "로그아웃"}">${i("logout")}</button></div></div></aside>`;
}
function shell(content) {
  root.innerHTML = `<div class="app-shell">${sidebar()}<div class="main-shell"><header class="topbar"><button class="icon-btn mobile-menu" data-action="menu" aria-label="메뉴 열기">${i("menu")}</button><span class="breadcrumb">내 공간 <span>/</span> ${typeof view === "object" ? "프로젝트" : { home: "오늘의 작업실", today: "오늘 할 일", focus: "한 가지에 집중", projects: "모든 프로젝트", notes: "기억 보관함", wins: "내가 해낸 것" }[view] || "오늘의 작업실"}</span><div class="top-actions"><span class="cloud-status"><span></span>${demo ? "둘러보기 모드" : "계정에 연결됨"}</span><button class="icon-btn" data-action="search" aria-label="전체 검색">${i("search")}</button><div class="top-avatar">${demo ? "S" : "찬"}</div></div></header>${demo ? '<div class="demo-banner">예시 데이터로 둘러보는 중이에요. 변경 사항은 이 화면에서만 유지돼요.<button data-action="logout">로그인하기 →</button></div>' : ""}${loadError ? `<div class="error-banner" role="alert">${h(loadError)} ${button("reload", "다시 불러오기", "arrow", "btn small")}</div>` : ""}<main id="main-content" class="content">${content}</main><footer class="app-footer"><span>조금씩, 나의 다음 장면으로.</span><span>savepoint <span class="tiny-star">✳</span> made for your next move</span></footer></div></div>`;
  restoreVisibleDrafts(root);
}
function card(p) {
  const done = p.tasks.filter((t) => t.done).length;
  return `<article class="project-card ${p.color}"><div class="card-top"><span class="project-icon">${i(categoryIcon[p.category])}</span><span class="status-badge ${p.status}">${{ active: "진행 중", paused: "잠시 쉬는 중", done: "완료" }[p.status]}</span></div><button class="card-title" data-action="open" data-id="${p.id}">${h(p.title)}</button><p class="card-description">${h(p.description || "이 프로젝트의 이야기를 채워보세요.")}</p><div class="card-next"><span>다음 한 걸음</span><p>${h(p.nextAction || p.tasks.find((t) => !t.done)?.text || "다음에 할 일을 정해볼까요?")}</p></div><div class="card-progress"><div><span>${categories[p.category]}</span><span>${done} / ${p.tasks.length} 완료</span></div><div class="progress-track"><span style="width:${progress(p)}%"></span></div></div><div class="card-bottom"><span>${date(p.updatedAt)} 기록</span><button data-action="open" data-id="${p.id}">이어서 하기 ${i("arrow")}</button></div></article>`;
}
function heading(title, desc, action = true) {
  return `<div class="section-heading"><div><h2>${title}</h2><p>${desc}</p></div>${action ? button("new", "새 프로젝트", "plus", "btn primary") : ""}</div>`;
}
function render() {
  rememberVisibleDrafts();
  if (!user && !demo) {
    login();
    return;
  }
  if (view === "today") {
    renderToday();
    return;
  }
  if (view === "focus") {
    renderFocus();
    return;
  }
  const active = projects.filter((p) => p.status === "active"),
    tasks = taskOrder(projects).map(({ task, project }) => ({
      ...task,
      project,
    })),
    completed = projects.flatMap((p) => p.tasks.filter((t) => t.done));
  if (typeof view === "object") {
    renderDetail(projects.find((p) => p.id === view.id));
    return;
  }
  let content = "";
  if (view === "home") {
    const latest = [...active].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
    content = `<div class="page-intro"><div><span class="eyebrow">${today()} <span class="date-dot">·</span> MY SAVEPOINT</span><h1>${demo ? "반가워요." : "찬준, 반가워."}<span class="greeting-sun">${i("sun")}</span></h1><p>어제의 생각을 이어, 오늘의 한 걸음을 만들어볼까요?</p></div>${button("capture", "생각 남기기", "plus", "btn outline")}</div>${quickCaptureHTML()}<section class="welcome-card"><div class="welcome-copy"><span class="welcome-tag">A LITTLE PROGRESS, EVERY DAY</span><h2>멈췄던 곳에서,<br>다시 시작하면 돼요.</h2><p>기억해야 할 것들은 여기 두고,<br>지금 할 수 있는 한 가지에 집중해요.</p>${button(latest.length ? "continue" : "new", latest.length ? "마지막 작업 이어가기" : "첫 프로젝트 시작하기", "arrow", "btn dark")}</div><div class="welcome-art" aria-hidden="true"><div class="art-orbit"></div><div class="art-orbit small"></div><div class="art-book"><span>THE NEXT<br>CHAPTER</span><div class="book-lines"></div><span class="book-number">01 — ∞</span></div><span class="art-flower">✳</span><div class="art-chip">${i("check")} saved. ready for next.</div><span class="art-plus">+</span></div></section><div class="stats-row"><div>${i("folder")}<span>진행 중인 프로젝트</span><b>${active.length}<small>개</small></b></div><div>${i("check")}<span>완료한 한 걸음</span><b>${completed.length}<small>개</small></b></div><div>${i("note")}<span>쌓아둔 기억</span><b>${projects.reduce((n, p) => n + p.notes.length + p.decisions.length, 0)}<small>개</small></b></div></div><section>${heading("이야기를 이어갈 곳", "머릿속에 흩어져 있던 일들을, 한눈에.")}<div class="project-grid">${latest.slice(0, 3).map(card).join("") || empty("아직 시작하지 않은 이야기가 있어요.", "작은 생각 하나로 첫 프로젝트를 만들어보세요.", "new", "프로젝트 만들기")}</div>${active.length > 3 ? button("all", "모든 프로젝트 보기", "arrow", "btn quiet all-projects") : ""}</section><div class="lower-grid"><section class="panel next-panel"><div class="panel-heading"><h2>먼저 볼 한 걸음 <span>${tasks.length}</span></h2>${i("spark")}</div>${
      tasks
        .slice(0, 4)
        .map(
          (t) =>
            `<div class="todo-row"><button class="check-button" data-action="task" data-id="${t.project.id}" data-task="${t.id}" aria-label="${h(t.text)} 완료">${i("check")}</button><button class="todo-text" data-action="open" data-id="${t.project.id}"><b>${h(t.text)}</b><span><span class="area-dot ${t.project.category}"></span>${h(t.project.title)}</span></button></div>`,
        )
        .join("") ||
      '<div class="gentle-empty">오늘의 한 걸음을 프로젝트에 남겨보세요.<br>작은 일 하나면 충분해요.</div>'
    }</section><section class="memory-invite"><span class="eyebrow">DON’T LOSE THE CONTEXT</span><h2>그때, 무슨 이야기 했더라?</h2><p>대화와 메모를 가져오면,<br>다음에 다시 설명하지 않아도 돼요.</p>${button("import", "대화 가져오기", "upload", "btn outline")}<div class="memory-doodles" aria-hidden="true"><span>✷</span><span>→</span><span>↗</span></div></section></div>`;
  } else if (view === "projects") {
    const list = projects.filter(
      (p) =>
        (filter === "all" || p.category === filter || p.status === filter) &&
        matches(p, search),
    );
    content = `${heading("모든 프로젝트", "각자의 속도로 자라고 있는 나의 이야기들.")}<div class="list-toolbar"><div class="tabs">${[["all", "전체"], ...Object.entries(categories), ["done", "완료"]].map(([k, t]) => `<button class="${filter === k ? "selected" : ""}" data-action="filter" data-filter="${k}">${t}</button>`).join("")}</div><label class="search-field">${i("search")}<input id="project-search" placeholder="프로젝트와 기록 검색" value="${h(search)}" aria-label="프로젝트 검색"></label></div><div class="project-grid all-grid">${list.map(card).join("") || empty("아직 이곳은 비어 있어요.", "새 프로젝트를 시작하거나 다른 검색어로 찾아보세요.", "new", "프로젝트 만들기")}</div>`;
  } else if (view === "notes") {
    const notes = projects
      .flatMap((p) => p.notes.map((n) => ({ ...n, project: p })))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    content = `${heading("기억 보관함", "다시 꺼내볼 대화, 잊고 싶지 않은 생각.", false)}<div class="toolbar-actions">${button("import", "대화 가져오기", "upload", "btn primary")}${button("capture", "메모 남기기", "plus", "btn outline")}</div><div class="notes-grid">${notes.map((n) => `<article class="note-card"><div class="note-meta">${i("note")}<span>${h(n.project.title)}</span><time>${date(n.createdAt)}</time></div><button data-action="note" data-id="${n.project.id}" data-note="${n.id}"><h3>${h(n.title)}</h3><p>${h(n.text.slice(0, 230))}</p></button></article>`).join("") || empty("기억해두고 싶은 순간이 있나요?", "대화나 메모를 프로젝트에 연결해 보관해요.", "capture", "첫 메모 남기기")}</div>`;
  } else if (view === "wins") {
    const wins = projects
      .flatMap((p) =>
        p.tasks.filter((t) => t.done).map((t) => ({ ...t, project: p })),
      )
      .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
    content = `${heading("내가 해낸 것", "작아 보였던 한 걸음도, 모아보면 나의 이야기가 돼요.", false)}<div class="wins-hero"><span class="wins-flower">✳</span><div><span class="eyebrow">LOOK HOW FAR YOU’VE COME</span><h2>벌써 <b>${wins.length}번</b>의 한 걸음을 해냈어요.</h2><p>완료한 프로젝트 ${projects.filter((p) => p.status === "done").length}개 · 기록한 기억 ${projects.reduce((s, p) => s + p.notes.length, 0)}개</p></div>${button("report", "활동 기록 내보내기", "download", "btn outline")}</div><div class="timeline">${wins.map((t) => `<div class="timeline-item"><span class="timeline-dot">${i("check")}</span><div><span class="eyebrow">${date(t.completedAt || t.project.updatedAt)} · ${categories[t.project.category]}</span><h3>${h(t.text)}</h3><button data-action="open" data-id="${t.project.id}">${h(t.project.title)} ${i("arrow")}</button></div></div>`).join("") || empty("첫 번째 한 걸음을 기다리고 있어요.", "프로젝트에서 할 일을 완료하면 여기에 쌓여요.", "all", "프로젝트 보기")}</div>`;
  }
  shell(content);
}
function empty(title, desc, action, label) {
  return `<div class="empty-state">${i("bookmark")}<h3>${title}</h3><p>${desc}</p>${button(action, label, "plus", "btn outline")}</div>`;
}
function renderDetail(p) {
  if (!p) {
    view = "projects";
    render();
    return;
  }
  const tasks = p.tasks
    .map(
      (t) =>
        `<div class="todo-row ${t.done ? "completed" : ""}"><button class="check-button ${t.done ? "checked" : ""}" data-action="task" data-id="${p.id}" data-task="${t.id}" aria-label="${h(t.text)} ${t.done ? "완료 취소" : "완료"}">${i("check")}</button><button class="task-label task-edit-link" data-action="edit-task" data-id="${p.id}" data-task="${t.id}">${h(t.text)}${taskMeta(t)}</button>${!t.done ? button("focus-task", "집중", "clock", "btn quiet small", `data-id="${p.id}" data-task="${t.id}"`) : ""}<button class="icon-btn subtle" data-action="delete-task" data-id="${p.id}" data-task="${t.id}" aria-label="할 일 삭제">${i("close")}</button></div>`,
    )
    .join("");
  shell(
    `<button class="back-link" data-action="all">${i("back")} 모든 프로젝트</button><div class="detail-intro"><div class="detail-project-icon ${p.color}">${i(categoryIcon[p.category])}</div><div><span class="eyebrow">${categories[p.category]} <span class="date-dot">·</span> ${date(p.updatedAt)}에 저장</span><h1>${h(p.title)}</h1><p>${h(p.description)}</p></div><div class="detail-controls">${button("edit", "프로젝트 편집", "edit", "btn outline", `data-id="${p.id}"`)}<select id="project-status" aria-label="프로젝트 상태"><option value="active" ${p.status === "active" ? "selected" : ""}>진행 중</option><option value="paused" ${p.status === "paused" ? "selected" : ""}>잠시 쉬는 중</option><option value="done" ${p.status === "done" ? "selected" : ""}>완료</option></select></div></div><div class="resume-banner"><div><span class="eyebrow">YOUR NEXT MOVE</span><h2>${h(p.nextAction || "다음 한 걸음은 무엇인가요?")}</h2><p>정해둔 맥락을 챙겨, 바로 이어서 시작해요.</p></div>${button("resume", "이어서 할 맥락 보기", "arrow", "btn primary", `data-id="${p.id}"`)}</div><div class="detail-grid"><div><section class="panel"><div class="panel-heading"><h2>다음에 할 일 <span>${p.tasks.filter((t) => !t.done).length}</span></h2><span class="muted">${progress(p)}% 완료</span></div><div class="progress-track detail-progress"><span style="width:${progress(p)}%"></span></div>${tasks || '<p class="gentle-empty">가볍게 시작할 일 하나를 적어보세요.</p>'}<form id="add-task" class="inline-form" data-id="${p.id}"><input name="text" placeholder="새로운 한 걸음 적기…" aria-label="새 할 일" required maxlength="300"><button class="icon-btn" aria-label="할 일 추가">${i("plus")}</button></form></section><section class="panel"><div class="panel-heading"><h2>기억해둘 대화와 메모</h2>${button("capture", "추가", "plus", "btn quiet small", `data-id="${p.id}"`)}</div>${
      p.notes
        .slice()
        .reverse()
        .map(
          (n) =>
            `<button class="detail-note" data-action="note" data-id="${p.id}" data-note="${n.id}"><span>${i("note")}</span><div><b>${h(n.title)}</b><p>${h(n.text.slice(0, 110))}</p><time>${date(n.createdAt)}</time></div>${i("arrow")}</button>`,
        )
        .join("") ||
      '<div class="gentle-empty">대화를 붙여넣거나 메모를 남겨보세요.</div>'
    }</section></div><div><section class="panel decisions-panel"><div class="panel-heading"><h2>이미 정한 것</h2>${i("bookmark")}</div>${p.decisions.map((d) => `<div class="decision-row">${i("check")}<button class="decision-edit" data-action="edit-decision" data-id="${p.id}" data-decision="${d.id}">${h(d.text)}</button><button class="icon-btn subtle" data-action="delete-decision" data-id="${p.id}" data-decision="${d.id}" aria-label="결정 사항 삭제">${i("close")}</button></div>`).join("") || '<p class="gentle-empty">다시 고민하지 않아도 될 것들을 적어둬요.</p>'}<form id="add-decision" class="inline-form" data-id="${p.id}"><input name="text" placeholder="확정한 내용 적기…" aria-label="결정 사항" maxlength="400" required><button class="icon-btn" aria-label="결정 사항 추가">${i("plus")}</button></form></section><section class="panel"><div class="panel-heading"><h2>함께 볼 자료</h2>${button("link", "추가", "plus", "btn quiet small", `data-id="${p.id}"`)}</div>${p.links.map((l, index) => `<div class="resource-row"><a href="${h(safeURL(l.url) || "#")}" target="_blank" rel="noopener noreferrer">${i("link")}<span>${h(l.title)}</span>${i("arrow")}</a><button class="icon-btn subtle" data-action="delete-link" data-id="${p.id}" data-index="${index}" aria-label="자료 링크 삭제">${i("close")}</button></div>`).join("") || '<p class="gentle-empty">문서나 웹사이트 링크를 모아두세요.</p>'}</section><div class="detail-save-note">${i("lock")} ${demo ? "예시 데이터 · 저장되지 않아요" : "수정한 기록은 내 계정에 저장돼요"}</div></div></div>`,
  );
}
async function save(p) {
  if (busy) throw Error("이전 기록을 저장하고 있어요. 잠시 기다려 주세요.");
  busy = true;
  try {
    validateContent(p);
    const generation = authGeneration;
    p.updatedAt = new Date().toISOString();
    const saved = demo
      ? { ...p, version: (p.version || 0) + 1 }
      : await persistProject(p, user.id);
    if (generation !== authGeneration)
      throw Error("로그인 상태가 바뀌었어요. 다시 로그인해 주세요.");
    projects = projects.some((x) => x.id === p.id)
      ? projects.map((x) => (x.id === p.id ? saved : x))
      : [saved, ...projects];
    return saved;
  } finally {
    busy = false;
  }
}
function showModal(title, content, cls = "") {
  rememberVisibleDrafts();
  modal.className = cls;
  modal.innerHTML = `<div class="modal-heading"><div><span class="eyebrow">SAVE YOUR NEXT CHAPTER</span><h2>${title}</h2></div><button type="button" data-action="close-modal" class="icon-btn" aria-label="닫기">${i("close")}</button></div>${content}`;
  modal.showModal();
  restoreVisibleDrafts(modal);
}
function projectForm(p) {
  showModal(
    p ? "프로젝트 편집" : "새로운 이야기를 시작해요",
    `<form id="project-form" data-id="${p?.id || ""}"><label>프로젝트 이름<input name="title" value="${h(p?.title || "")}" placeholder="어떤 이야기를 이어갈까요?" maxlength="100" required autofocus></label><div class="form-two"><label>나의 영역<select name="category">${Object.entries(
      categories,
    )
      .map(
        ([k, t]) =>
          `<option value="${k}" ${p?.category === k ? "selected" : ""}>${t}</option>`,
      )
      .join(
        "",
      )}</select></label><label>프로젝트 색<select name="color">${colors.map((c, index) => `<option value="${c}" ${p?.color === c ? "selected" : ""}>${["초록", "살구", "파랑", "라벤더"][index]}</option>`).join("")}</select></label></div><label>어떤 프로젝트인가요?<textarea name="description" rows="2" placeholder="이 일을 시작한 이유, 이루고 싶은 것." maxlength="1000">${h(p?.description || "")}</textarea></label><label>다음 한 걸음<input name="nextAction" value="${h(p?.nextAction || "")}" placeholder="지금 할 수 있는 가장 작은 일 하나" maxlength="300"></label><p class="form-error" role="alert"></p><div class="modal-actions">${p ? button("delete-project", "프로젝트 삭제", "trash", "btn danger", `data-id="${p.id}"`) : ""}<button type="button" data-action="close-modal" class="btn quiet">취소</button><button class="btn primary" type="submit">${i("check")} 저장하기</button></div></form>`,
  );
}
function captureForm(id, text = "", title = "") {
  showModal(
    "지금의 생각을 저장해요",
    `<form id="capture-form" data-id="${id || "inbox"}" data-skip-draft="${text ? "yes" : ""}"><label>어디에 남길까요?<select name="project"><option value="inbox" ${!id ? "selected" : ""}>생각 수집함 · 나중에 분류하기</option>${projects.map((p) => `<option value="${p.id}" ${p.id === id ? "selected" : ""}>${h(p.title)}</option>`).join("")}</select></label><label>제목<input name="title" placeholder="비워두면 첫 문장으로 만들어요" value="${h(title)}" maxlength="100"></label><label>대화 또는 메모<textarea name="text" rows="9" maxlength="200000" placeholder="나눈 대화나 떠오른 생각을 그대로 붙여넣어도 좋아요." required>${h(text)}</textarea></label><button type="button" data-action="suggest" class="btn quiet">${i("spark")} 결정 사항과 할 일 후보 찾기</button><div id="suggestions"></div><p class="field-hint">문장 속 표현으로 후보를 찾아요. 선택한 내용만 프로젝트에 추가돼요.</p><p class="form-error" role="alert"></p><div class="modal-actions"><button type="button" data-action="close-modal" class="btn quiet">취소</button><button type="submit" class="btn primary">${i("bookmark")} 기억 저장하기</button></div></form>`,
  );
}
function importModal() {
  showModal(
    "나누었던 대화 가져오기",
    `<p class="muted">텍스트 파일 또는 ChatGPT에서 내보낸 conversations.json을 선택해 주세요. 대화 목록에서 하나를 골라 프로젝트에 보관할 수 있어요.</p><label class="file-drop">${i("upload")}<strong>파일을 선택해 주세요</strong><span>.txt · .md · .json / 최대 20MB</span><input id="conversation-file" type="file" accept=".txt,.md,.json,text/plain,application/json"></label><div id="import-results"></div><p class="form-error" role="alert"></p><p class="field-hint">파일은 이 브라우저에서 읽어요. 선택하고 저장한 대화만 계정으로 전송합니다.</p>`,
  );
}
function settings() {
  showModal(
    "나만의 작업실 설정",
    `<div class="settings-block"><h3>${i("lock")} 나만 볼 수 있는 기록</h3><p>${demo ? "지금은 예시 작업실을 둘러보고 있어요." : "Supabase 계정으로 로그인했어요. 기록은 허용된 계정만 읽고 수정할 수 있어요."}</p>${!demo ? `<span class="account-pill">${h(user.email)}</span>` : ""}</div><div class="settings-block"><h3>${i("download")} 내 기록 백업</h3><p>프로젝트, 할 일, 결정 사항과 메모를 JSON 파일로 내려받아요. 백업 파일에는 개인 기록이 포함돼요.</p>${button("backup", "백업 다운로드", "download", "btn outline")}<label class="restore-label">백업에서 새 프로젝트로 가져오기<input id="restore-file" type="file" accept=".json,application/json"></label></div><div class="settings-block"><h3>사용 방법</h3><p>프로젝트 안에서 결정 사항과 다음 행동을 남겨보세요. ‘이어서 할 맥락 보기’로 내용을 복사해 새 대화에서 바로 이어갈 수 있어요. 대화 자동 동기화와 AI 답변 생성은 아직 연결되어 있지 않아요.</p></div>`,
  );
}
function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function refresh() {
  rememberVisibleDrafts();
  const g = ++authGeneration;
  try {
    loadError = "";
    const data = await loadProjects(user.id);
    if (g !== authGeneration) return;
    projects = data;
    render();
  } catch (e) {
    if (g !== authGeneration) return;
    loadError = e.message;
    render();
  }
}
async function enter(nextUser) {
  user = nextUser;
  demo = false;
  root.innerHTML = '<div class="boot">나의 기록을 불러오고 있어요…</div>';
  await refresh();
}
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("맥락을 복사했어요. 새 대화에 붙여넣어 주세요.");
  } catch {
    toast("복사 권한을 확인하거나 내용을 직접 선택해 주세요.");
  }
}
async function onAction(e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  if (busy) {
    toast("기록을 저장 중이에요. 잠시만 기다려 주세요.");
    return;
  }
  const a = el.dataset.action;
  const p = projects.find((p) => p.id === el.dataset.id);
  try {
    if (await personalAction(a, el, p)) return;
    if (a === "close-modal") {
      rememberVisibleDrafts();
      modal.close();
      return;
    }
    if (a === "toggle-password") {
      const input = document.querySelector("input[name=password]");
      input.type = input.type === "password" ? "text" : "password";
      el.textContent = input.type === "password" ? "보기" : "숨기기";
      return;
    }
    if (a === "demo") {
      demo = true;
      projects = demoProjects();
      view = "home";
      filter = "all";
      search = "";
      loadError = "";
      render();
      return;
    }
    if (a === "logout") {
      if (busy) {
        toast("저장이 끝난 뒤 로그아웃해 주세요.");
        return;
      }
      clearPrivateSession();
      ++authGeneration;
      user = null;
      projects = [];
      view = "home";
      demo = false;
      loadError = "";
      modal.close();
      login();
      const { error } = await db.auth.signOut({ scope: "local" });
      if (error) toast("로그아웃 연결을 확인해 주세요.");
      return;
    }
    if (a === "menu") {
      document.querySelector(".sidebar").classList.toggle("mobile-open");
      return;
    }
    if (a === "nav") {
      view = el.dataset.view;
      filter = "all";
      search = "";
      render();
      return;
    }
    if (a === "category") {
      view = "projects";
      filter = el.dataset.category;
      search = "";
      render();
      return;
    }
    if (a === "filter") {
      filter = el.dataset.filter;
      render();
      return;
    }
    if (a === "search") {
      view = "projects";
      filter = "all";
      render();
      document.querySelector("#project-search").focus();
      return;
    }
    if (a === "all") {
      view = "projects";
      filter = "all";
      search = "";
      render();
      return;
    }
    if (a === "open") {
      rememberLastProject(p.id);
      view = { id: p.id };
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (a === "continue") {
      const active = projects
        .filter((p) => p.status === "active")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const last = tabStorage().getItem(`savepoint.last.${scope()}`);
      view = { id: active.find((p) => p.id === last)?.id || active[0].id };
      render();
      return;
    }
    if (a === "new") {
      projectForm();
      return;
    }
    if (a === "edit") {
      projectForm(p);
      return;
    }
    if (a === "capture") {
      captureForm(p?.id || (typeof view === "object" ? view.id : ""));
      return;
    }
    if (a === "import") {
      importModal();
      return;
    }
    if (a === "settings") {
      settings();
      return;
    }
    if (a === "reload") {
      if (!demo && user) await refresh();
      return;
    }
    if (a === "suggest") {
      const text = modal.querySelector("[name=text]").value;
      const s = extractSuggestions(text);
      modal.querySelector("#suggestions").innerHTML =
        [
          ...s.decisions.map((text) => ({ kind: "decision", text })),
          ...s.tasks.map((text) => ({ kind: "task", text })),
        ]
          .map(
            ({ kind, text }) =>
              `<label class="suggestion"><input type="checkbox" name="${kind}" value="${h(text)}"><span><small>${kind === "decision" ? "결정 사항" : "할 일"}</small>${h(text)}</span></label>`,
          )
          .join("") ||
        '<p class="field-hint">뚜렷한 후보를 찾지 못했어요. 저장 후 직접 추가할 수 있어요.</p>';
      return;
    }
    if (a === "task") {
      const next = structuredClone(p),
        t = next.tasks.find((t) => t.id === el.dataset.task);
      t.done = !t.done;
      t.completedAt = t.done ? new Date().toISOString() : null;
      el.disabled = true;
      await save(next);
      render();
      toast(
        t.done ? "한 걸음 더 나아갔어요. 잘했어요!" : "다시 할 일로 옮겼어요.",
      );
      return;
    }
    if (a === "delete-task" || a === "delete-decision" || a === "delete-link") {
      const next = structuredClone(p);
      if (a === "delete-task")
        next.tasks = next.tasks.filter((t) => t.id !== el.dataset.task);
      else if (a === "delete-decision")
        next.decisions = next.decisions.filter(
          (d) => d.id !== el.dataset.decision,
        );
      else next.links.splice(Number(el.dataset.index), 1);
      await save(next);
      render();
      toast("기록을 삭제했어요.");
      return;
    }
    if (a === "link") {
      showModal(
        "함께 볼 자료 추가",
        `<form id="link-form" data-id="${p.id}"><label>자료 이름<input name="title" maxlength="150" required placeholder="어떤 자료인가요?"></label><label>주소<input name="url" type="url" required placeholder="https://…"></label><p class="form-error" role="alert"></p><div class="modal-actions"><button class="btn primary" type="submit">자료 저장하기</button></div></form>`,
      );
      return;
    }
    if (a === "note") {
      const n = p.notes.find((n) => n.id === el.dataset.note);
      showModal(
        h(n.title),
        `<div class="note-reader-meta">${h(p.title)} · ${date(n.createdAt)}</div><pre class="note-reader">${h(n.text)}</pre><div class="modal-actions">${button("edit-note", "메모 수정", "edit", "btn outline", `data-id="${p.id}" data-note="${n.id}"`)}${button("copy-to-project", "프로젝트에 복사", "folder", "btn quiet", `data-id="${p.id}" data-note="${n.id}"`)}${button("copy-note", "내용 복사", "copy", "btn outline", `data-id="${p.id}" data-note="${n.id}"`)}${button("delete-note", "메모 삭제", "trash", "btn danger", `data-id="${p.id}" data-note="${n.id}"`)}</div>`,
        "wide-modal",
      );
      return;
    }
    if (a === "copy-note") {
      await copy(p.notes.find((n) => n.id === el.dataset.note).text);
      return;
    }
    if (a === "delete-note") {
      showModal(
        "이 메모를 삭제할까요?",
        `<p class="muted">삭제한 메모는 복구할 수 없어요.</p><div class="modal-actions">${button("close-modal", "취소", "close", "btn quiet")}${button("confirm-delete-note", "삭제하기", "trash", "btn danger", `data-id="${p.id}" data-note="${el.dataset.note}"`)}</div>`,
      );
      return;
    }
    if (a === "confirm-delete-note") {
      const next = structuredClone(p);
      next.notes = next.notes.filter((n) => n.id !== el.dataset.note);
      await save(next);
      modal.close();
      render();
      toast("메모를 삭제했어요.");
      return;
    }
    if (a === "resume") {
      showModal(
        "바로 이어갈 수 있도록",
        `<p class="muted">이 맥락을 복사해 새 대화에 붙여넣으면, 다시 설명할 필요 없이 이어갈 수 있어요.</p><textarea class="resume-text" readonly rows="14">${h(resumePrompt(p))}</textarea><div class="modal-actions">${button("copy-resume", "맥락 복사하기", "copy", "btn primary", `data-id="${p.id}"`)}</div>`,
        "wide-modal",
      );
      return;
    }
    if (a === "copy-resume") {
      await copy(resumePrompt(p));
      return;
    }
    if (a === "delete-project") {
      showModal(
        "프로젝트를 삭제할까요?",
        `<p class="muted">‘${h(p.title)}’의 메모, 결정 사항과 할 일이 함께 삭제돼요. 먼저 백업을 내려받는 것을 권해요.</p><div class="modal-actions">${button("close-modal", "취소", "close", "btn quiet")}${button("confirm-delete", "영구 삭제", "trash", "btn danger", `data-id="${p.id}"`)}</div>`,
      );
      return;
    }
    if (a === "confirm-delete") {
      if (!demo) await removeProject(p, user.id);
      projects = projects.filter((x) => x.id !== p.id);
      view = "projects";
      modal.close();
      render();
      toast("프로젝트를 삭제했어요.");
      return;
    }
    if (a === "backup") {
      download(
        `savepoint-${localDay()}.json`,
        JSON.stringify(
          {
            format: "savepoint-v1",
            exportedAt: new Date().toISOString(),
            projects: projects.map(({ version, ...p }) => p),
          },
          null,
          2,
        ),
      );
      toast("백업 파일을 내려받았어요.");
      return;
    }
    if (a === "report") {
      const text = `# 나의 활동 기록\n\n${projects
        .map(
          (p) =>
            `## ${p.title}\n${p.description}\n\n${
              p.tasks
                .filter((t) => t.done)
                .map((t) => "- " + t.text)
                .join("\n") || "- 완료한 활동 없음"
            }`,
        )
        .join("\n\n")}`;
      download(
        `savepoint-활동기록-${localDay()}.md`,
        text,
        "text/markdown;charset=utf-8",
      );
      return;
    }
  } catch (error) {
    toast(error.message || "잠시 후 다시 시도해 주세요.");
    el.disabled = false;
  }
}
document.addEventListener("click", onAction);
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    const r = modal.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      modal.close();
  }
});
document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target,
    data = new FormData(form),
    submit = form.querySelector("[type=submit],button:not([type])");
  const errorEl = form.querySelector(".form-error");
  if (errorEl) errorEl.textContent = "";
  if (submit) submit.disabled = true;
  const formControls = [...form.elements].map((element) => ({
    element,
    disabled: element.disabled,
  }));
  formControls.forEach(({ element }) => {
    element.disabled = true;
  });
  try {
    if (await personalSubmit(form, data)) return;
    if (form.id === "login-form") {
      submit.innerHTML = "작업실 여는 중…";
      const { data: auth, error } = await db.auth.signInWithPassword({
        email: String(data.get("email")).trim(),
        password: data.get("password"),
      });
      if (error) throw Error("이메일과 비밀번호를 확인해 주세요.");
      form.reset();
      await enter(auth.user);
      return;
    }
    if (form.id === "project-form") {
      const old = projects.find((p) => p.id === form.dataset.id);
      const p = old ? structuredClone(old) : newProject();
      for (const k of [
        "title",
        "description",
        "nextAction",
        "category",
        "color",
      ])
        p[k] = String(data.get(k)).trim();
      const saved = await save(p);
      clearFormDraft(form);
      modal.close();
      view = { id: saved.id };
      render();
      toast("다음 장면을 저장했어요.");
    }
    if (form.id === "capture-form") {
      const p =
        data.get("project") === "inbox"
          ? inboxProject()
          : structuredClone(projects.find((p) => p.id === data.get("project")));
      p.notes.push({
        id: crypto.randomUUID(),
        title:
          String(data.get("title")).trim() ||
          noteTitle(String(data.get("text"))),
        text: String(data.get("text")),
        createdAt: new Date().toISOString(),
      });
      for (const text of data.getAll("decision"))
        p.decisions.push({ id: crypto.randomUUID(), text });
      for (const text of data.getAll("task"))
        p.tasks.push({ id: crypto.randomUUID(), text, done: false });
      await save(p);
      clearFormDraft(form);
      modal.close();
      render();
      toast("생각을 안전하게 보관했어요.");
    }
    if (form.id === "add-task" || form.id === "add-decision") {
      const p = structuredClone(projects.find((p) => p.id === form.dataset.id)),
        text = String(data.get("text")).trim();
      if (!text) throw Error("내용을 입력해 주세요.");
      if (form.id === "add-task")
        p.tasks.push({ id: crypto.randomUUID(), text, done: false });
      else p.decisions.push({ id: crypto.randomUUID(), text });
      await save(p);
      clearFormDraft(form);
      render();
      document.querySelector("#" + form.id + " input")?.focus();
    }
    if (form.id === "link-form") {
      const p = structuredClone(projects.find((p) => p.id === form.dataset.id));
      const url = safeURL(String(data.get("url")));
      if (!url) throw Error("http 또는 https 주소를 입력해 주세요.");
      p.links.push({
        id: crypto.randomUUID(),
        title: String(data.get("title")).trim(),
        url,
      });
      await save(p);
      clearFormDraft(form);
      modal.close();
      render();
      toast("자료를 연결했어요.");
    }
  } catch (error) {
    if (errorEl) errorEl.textContent = error.message;
    else if (form.id === "login-form")
      document.querySelector("#login-error").textContent = error.message;
    else toast(error.message);
  } finally {
    formControls.forEach(({ element, disabled }) => {
      element.disabled = disabled;
    });
    if (submit) {
      submit.disabled = false;
      if (form.id === "login-form")
        submit.innerHTML = `작업실 들어가기 ${i("arrow")}`;
    }
  }
});
document.addEventListener("input", (e) => {
  const form = e.target.closest("form");
  if (form) rememberFormDraft(form, true);
  if (e.target.id === "project-search") {
    const pos = e.target.selectionStart;
    search = e.target.value;
    render();
    const input = document.querySelector("#project-search");
    input.focus();
    input.setSelectionRange(pos, pos);
  }
});
document.addEventListener("change", async (e) => {
  const form = e.target.closest("form");
  if (form) rememberFormDraft(form, true);
  try {
    if (e.target.id === "project-status") {
      const p = structuredClone(projects.find((p) => p.id === view.id));
      p.status = e.target.value;
      await save(p);
      render();
      toast("프로젝트 상태를 바꿨어요.");
    }
    if (e.target.id === "conversation-file") {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 20000000) throw Error("20MB 이하 파일을 선택해 주세요.");
      const items = parseConversationFile(await file.text());
      if (!items.length) throw Error("가져올 대화를 찾지 못했어요.");
      const target = document.querySelector("#import-results");
      target.innerHTML = `<p class="field-hint">${items.length}개의 대화를 찾았어요. 보관할 대화를 선택해 주세요.</p><div class="import-list">${items.map((c, index) => `<button type="button" data-import-index="${index}">${i("note")}<span>${h(c.title)}</span>${i("arrow")}</button>`).join("")}</div>`;
      target.onclick = (ev) => {
        const el = ev.target.closest("[data-import-index]");
        if (el) {
          const c = items[Number(el.dataset.importIndex)];
          if (c.text.length > 200000) {
            toast(
              "긴 대화의 앞 20만 자를 불러왔어요. 나머지는 나누어 저장해 주세요.",
            );
          }
          modal.close();
          captureForm("", c.text.slice(0, 200000), c.title);
        }
      };
    }
    if (e.target.id === "restore-file") {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 20000000) throw Error("20MB 이하 백업을 선택해 주세요.");
      const backup = JSON.parse(await file.text());
      if (
        backup.format !== "savepoint-v1" ||
        !Array.isArray(backup.projects) ||
        backup.projects.length > 100
      )
        throw Error("세이브포인트 백업 파일을 선택해 주세요.");
      const validated = backup.projects.map((p) => {
        const { version, ...data } = p;
        return validateContent({
          ...data,
          id: crypto.randomUUID(),
          title: (p.title + " (복원)").slice(0, 100),
        });
      });
      for (const p of validated) await save(p);
      modal.close();
      render();
      toast(`${validated.length}개의 프로젝트를 새 사본으로 복원했어요.`);
    }
  } catch (error) {
    const el = modal.querySelector(".form-error");
    if (el) el.textContent = error.message;
    else toast(error.message);
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    const form = e.target.closest("form");
    if (form && form.id !== "login-form") {
      e.preventDefault();
      form.requestSubmit();
    }
    return;
  }
  if (modal.open) return;
  if ((e.metaKey || e.ctrlKey) && e.key === "k" && (user || demo)) {
    e.preventDefault();
    view = "projects";
    render();
    document.querySelector("#project-search")?.focus();
  }
});
window.addEventListener("offline", () =>
  toast("인터넷 연결이 끊겼어요. 연결 후 다시 저장해 주세요."),
);
window.addEventListener("pagehide", () => {
  rememberVisibleDrafts();
  modal.close();
  root.style.visibility = "hidden";
});
window.addEventListener("pageshow", (e) => {
  root.style.visibility = "";
  if (e.persisted && !demo) {
    user = null;
    projects = [];
    login();
    init();
  }
});
db.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    clearPrivateSession();
    ++authGeneration;
    user = null;
    projects = [];
    if (!demo) {
      modal.close();
      login();
    }
  }
});
async function init() {
  const generation = authGeneration;
  try {
    const { data, error } = await db.auth.getUser();
    if (generation !== authGeneration || demo) return;
    if (error || !data.user) {
      login();
      return;
    }
    await enter(data.user);
  } catch {
    login("연결 상태를 확인한 뒤 다시 로그인해 주세요.");
  }
}
// Personal workflow tools. Private drafts and timer state remain in this tab.
let focusTimer = null;
const draftForms = new Set([
  "quick-capture",
  "capture-form",
  "project-form",
  "note-edit-form",
  "task-edit-form",
  "decision-edit-form",
  "focus-finish",
  "add-task",
  "add-decision",
]);
const draftFields = new Set([
  "text",
  "title",
  "description",
  "nextAction",
  "category",
  "color",
  "project",
  "dueDate",
  "plannedFor",
  "priority",
  "next",
  "summary",
  "done",
]);
function scope() {
  return demo ? "demo" : user?.id || "signed-out";
}
function tabStorage() {
  try {
    return sessionStorage;
  } catch {
    return {
      length: 0,
      getItem: () => null,
      setItem: () => {
        throw Error("storage unavailable");
      },
      removeItem: () => {},
      key: () => null,
    };
  }
}
function drafts() {
  return createDraftStore(tabStorage(), scope());
}
function draftKey(form) {
  return `${form.id}:${form.dataset.id || "new"}:${form.dataset.task || form.dataset.note || ""}`;
}
function rememberFormDraft(form, edited = false) {
  if (!draftForms.has(form.id) || (!user && !demo)) return;
  if (edited) {
    form.dataset.dirty = "yes";
    delete form.dataset.saved;
  }
  if (form.dataset.dirty !== "yes" || form.dataset.saved) return;
  const fields = {};
  for (const element of form.elements)
    if (draftFields.has(element.name))
      fields[element.name] =
        element.type === "checkbox" ? element.checked : element.value;
  const ok = drafts().set(draftKey(form), {
    fields,
    baseVersion: form.dataset.baseVersion || "",
    savedAt: new Date().toISOString(),
  });
  let status = form.querySelector(".draft-status");
  if (!status) {
    status = document.createElement("div");
    status.className = "draft-status";
    status.setAttribute("role", "status");
    form.append(status);
  }
  status.innerHTML = ok
    ? `이 탭에 작성 중 내용을 임시 보관했어요. ${button("discard-draft", "임시 내용 비우기", "close", "btn quiet small")}`
    : "이 브라우저에서는 임시 보관을 사용할 수 없어요. 닫기 전에 저장해 주세요.";
}
function rememberVisibleDrafts() {
  document.querySelectorAll("form").forEach((form) => rememberFormDraft(form));
}
function restoreVisibleDrafts(container) {
  container.querySelectorAll("form").forEach((form) => {
    if (!draftForms.has(form.id) || (!user && !demo)) return;
    const p = projects.find((p) => p.id === form.dataset.id);
    form.dataset.baseVersion = String(p?.version || "");
    const draft = drafts().get(draftKey(form));
    if (!draft || form.dataset.skipDraft === "yes") return;
    if (draft.baseVersion && draft.baseVersion !== form.dataset.baseVersion) {
      const notice = document.createElement("div");
      notice.className = "draft-status";
      notice.innerHTML = `다른 곳에서 저장된 내용이 있어 임시 내용을 자동으로 덮어쓰지 않았어요. ${button("review-draft", "임시 내용 보기", "note", "btn quiet small")}`;
      form.append(notice);
      return;
    }
    for (const element of form.elements)
      if (
        draftFields.has(element.name) &&
        (typeof draft.fields[element.name] === "string" ||
          (element.type === "checkbox" &&
            typeof draft.fields[element.name] === "boolean"))
      ) {
        if (element.type === "checkbox")
          element.checked = draft.fields[element.name];
        else element.value = draft.fields[element.name];
      }
    form.dataset.dirty = "yes";
    rememberFormDraft(form);
  });
}
function clearFormDraft(form) {
  drafts().remove(draftKey(form));
  form.dataset.saved = "yes";
  delete form.dataset.dirty;
  form.querySelector(".draft-status")?.remove();
  form.reset();
}
function rememberLastProject(id) {
  try {
    tabStorage().setItem(`savepoint.last.${scope()}`, id);
  } catch {}
}
function clearPrivateSession() {
  drafts().clear();
  tabStorage().removeItem(`savepoint.last.${scope()}`);
  tabStorage().removeItem(`savepoint.focus.${scope()}`);
  focusTimer = null;
}
function inboxProject() {
  const existing = projects.find((p) => p.isInbox);
  if (existing) return structuredClone(existing);
  const p = newProject({
    title: "생각 수집함",
    category: "life",
    color: "peach",
    description:
      "아직 분류하지 않아도 괜찮아요. 떠오른 생각을 먼저 모아두는 곳.",
  });
  p.isInbox = true;
  return p;
}
function quickCaptureHTML() {
  const count = projects.find((p) => p.isInbox)?.notes.length || 0;
  return `<section class="quick-capture"><div><span class="eyebrow">CATCH IT BEFORE IT GOES</span><h2>떠오른 생각, 일단 여기.</h2><p>제목이나 분류는 나중에 해도 괜찮아요.</p></div><form id="quick-capture"><label class="sr-only" for="quick-thought">지금 떠오른 생각</label><textarea id="quick-thought" name="text" rows="2" maxlength="20000" required placeholder="문득 떠오른 아이디어, 할 일, 잊기 싫은 것…"></textarea><div class="quick-actions">${button("inbox", `생각 수집함 ${count}`, "note", "btn quiet small")}<span class="quick-shortcut">⌘ / Ctrl + Enter</span><button type="submit" class="btn primary small">${i("bookmark")} 바로 담기</button></div><p class="form-error" role="alert"></p></form></section>`;
}
function taskMeta(task) {
  const day = localDay();
  return `<span class="task-metadata">${task.priority ? `<span class="priority-label level-${task.priority}">${task.priority === 2 ? "중요" : "먼저"}</span>` : ""}${task.plannedFor === day ? '<span class="planned-label">오늘 할 일</span>' : ""}${task.dueDate ? `<time class="${task.dueDate < day && !task.done ? "overdue-label" : ""}">${h(task.dueDate)}${task.dueDate < day && !task.done ? " · 기한 지남" : task.dueDate === day ? " · 오늘까지" : ""}</time>` : ""}</span>`;
}
function plannerRow({ task, project }) {
  return `<div class="planner-row"><button class="check-button" data-action="task" data-id="${project.id}" data-task="${task.id}" aria-label="${h(task.text)} 완료">${i("check")}</button><div class="planner-description"><button class="planner-task-name" data-action="edit-task" data-id="${project.id}" data-task="${task.id}">${h(task.text)}</button><button class="planner-project" data-action="open" data-id="${project.id}">${h(project.title)}</button>${taskMeta(task)}</div><div class="planner-controls">${button("plan-task", task.plannedFor === localDay() ? "오늘 지정 해제" : "오늘 하기", "plus", "btn quiet small", `data-id="${project.id}" data-task="${task.id}"`)}${button("focus-task", "집중하기", "clock", "btn outline small", `data-id="${project.id}" data-task="${task.id}"`)}</div></div>`;
}
function renderToday() {
  const ordered = taskOrder(projects),
    planned = ordered.filter(({ task }) => isToday(task)),
    others = ordered.filter(({ task }) => !isToday(task));
  shell(
    `${heading("오늘 할 일", "기한이 지난 일과 오늘 정한 일을 먼저. 나머지는 천천히.", false)}<div class="today-summary"><span>${today()}</span><b>오늘 먼저 볼 일 ${planned.length}개</b><span>모든 일을 오늘 끝낼 필요는 없어요.</span></div><section class="panel planner-panel"><div class="panel-heading"><h2>오늘의 한 걸음</h2>${i("sun")}</div>${planned.map(plannerRow).join("") || '<div class="gentle-empty">아래 목록에서 오늘 할 일 한두 개만 골라보세요.</div>'}</section><section class="panel planner-panel"><div class="panel-heading"><h2>남겨둔 다음 한 걸음 <span>${others.length}</span></h2></div>${others.map(plannerRow).join("") || '<div class="gentle-empty">남겨둔 할 일이 없어요.</div>'}</section>`,
  );
}
function editTaskForm(p, task) {
  showModal(
    "한 걸음을 다듬어요",
    `<form id="task-edit-form" data-id="${p.id}" data-task="${task.id}"><label>할 일<input name="text" value="${h(task.text)}" maxlength="300" required></label><div class="form-two"><label>언제까지?<input type="date" name="dueDate" value="${h(task.dueDate || "")}"></label><label>언제 해볼까요?<input type="date" name="plannedFor" value="${h(task.plannedFor || "")}"></label></div><label>중요도<select name="priority"><option value="0" ${!task.priority ? "selected" : ""}>보통</option><option value="1" ${task.priority === 1 ? "selected" : ""}>먼저 할 일</option><option value="2" ${task.priority === 2 ? "selected" : ""}>중요한 일</option></select></label><p class="field-hint">날짜를 비워두면 기한 없이 보관해요. 오늘 할 일 화면에 함께 반영돼요.</p><p class="form-error" role="alert"></p><div class="modal-actions"><button class="btn primary" type="submit">${i("check")} 변경 저장하기</button></div></form>`,
  );
}
function storeTimer() {
  if (focusTimer)
    try {
      tabStorage().setItem(
        `savepoint.focus.${scope()}`,
        JSON.stringify(focusTimer),
      );
    } catch {}
}
function recoverTimer() {
  if (focusTimer) return;
  try {
    const candidate = JSON.parse(
      tabStorage().getItem(`savepoint.focus.${scope()}`),
    );
    if (
      candidate &&
      typeof candidate.projectId === "string" &&
      typeof candidate.taskId === "string" &&
      Number.isFinite(candidate.totalMs) &&
      candidate.totalMs > 0 &&
      candidate.totalMs <= 3600000 &&
      Number.isFinite(candidate.remainingMs) &&
      candidate.remainingMs >= 0 &&
      typeof candidate.running === "boolean" &&
      (!candidate.running || Number.isFinite(candidate.endAt))
    )
      focusTimer = candidate;
  } catch {}
}
function renderFocus() {
  recoverTimer();
  const p = projects.find((p) => p.id === focusTimer?.projectId),
    t = p?.tasks.find((t) => t.id === focusTimer?.taskId);
  if (!p || !t || t.done) {
    focusTimer = null;
    const candidates = taskOrder(projects);
    shell(
      `${heading("한 가지에 집중", "지금 할 한 가지를 고르고, 다른 생각은 잠시 내려놓아요.", false)}<section class="panel planner-panel">${candidates.map(plannerRow).join("") || empty("지금 할 일을 먼저 적어볼까요?", "프로젝트에서 한 가지 일을 추가해 보세요.", "all", "프로젝트 보기")}</section>`,
    );
    return;
  }
  const remaining = remainingMs(focusTimer);
  shell(
    `<button class="back-link" data-action="nav" data-view="today">${i("back")} 오늘 할 일</button><section class="focus-card"><span class="eyebrow">JUST ONE THING, RIGHT NOW</span><span class="focus-project">${h(p.title)}</span><h1>${h(t.text)}</h1><p>완벽하게 끝내기보다, 다음 장면을 조금 열어봐요.</p><div class="focus-timer" id="focus-timer" role="timer" aria-label="남은 집중 시간">${timerText(remaining)}</div><p id="focus-status" class="focus-status">${remaining === 0 ? "정한 시간이 지났어요. 어디까지 했는지 남겨볼까요?" : focusTimer.running ? "지금 한 가지에 집중하고 있어요." : "준비되면 가볍게 시작해요."}</p><div class="timer-presets">${[5, 15, 25].map((m) => `<button data-action="timer-duration" data-minutes="${m}" class="${focusTimer.totalMs === m * 60000 ? "selected" : ""}">${m}분</button>`).join("")}</div><div class="focus-controls">${button("timer-toggle", focusTimer.running ? "잠깐 멈추기" : remaining === 0 ? "다시 시작하기" : "집중 시작", "clock", "btn primary")}${button("focus-stop", "집중 화면 닫기", "back", "btn quiet")}</div><span class="field-hint">다른 화면을 보거나 새로고침해도 이 탭의 시간은 이어져요. 알림 권한은 요청하지 않아요.</span></section><section class="panel focus-finish-panel"><div class="panel-heading"><h2>다음의 나에게 남기는 한 줄</h2>${i("bookmark")}</div><form id="focus-finish" data-id="${p.id}" data-task="${t.id}"><label>어디까지 했나요?<textarea name="summary" maxlength="2000" rows="3" placeholder="찾아본 내용, 해결한 것, 막힌 지점…"></textarea></label><label>다음에 바로 할 일<input name="next" maxlength="300" placeholder="다시 돌아왔을 때 시작할 곳"></label><label class="finish-checkbox"><input name="done" type="checkbox">이 할 일도 완료했어요</label><p class="form-error" role="alert"></p><div class="modal-actions"><button class="btn primary" type="submit">기록하고 마치기 ${i("check")}</button></div></form></section>`,
  );
}
async function personalAction(action, el, p) {
  if (action === "discard-draft") {
    clearFormDraft(el.closest("form"));
    toast("임시로 적어둔 내용을 비웠어요.");
    return true;
  }
  if (action === "review-draft") {
    const form = el.closest("form"),
      draft = drafts().get(draftKey(form));
    showModal(
      "이전에 적어둔 내용",
      `<p class="muted">현재 저장된 기록은 바꾸지 않았어요. 필요한 내용을 복사해서 다시 반영해 주세요.</p><pre class="note-reader">${h(
        Object.entries(draft?.fields || {})
          .map(([name, value]) => `${name}\n${value}`)
          .join("\n\n"),
      )}</pre>`,
    );
    return true;
  }
  if (action === "inbox") {
    const p = inboxProject();
    if (!projects.some((x) => x.id === p.id)) await save(p);
    view = { id: p.id };
    render();
    return true;
  }
  if (action === "edit-task") {
    editTaskForm(
      p,
      p.tasks.find((t) => t.id === el.dataset.task),
    );
    return true;
  }
  if (action === "plan-task") {
    const next = structuredClone(p),
      t = next.tasks.find((t) => t.id === el.dataset.task);
    t.plannedFor = t.plannedFor === localDay() ? "" : localDay();
    await save(next);
    render();
    toast(
      t.plannedFor
        ? "오늘 할 일에 담았어요."
        : t.dueDate && t.dueDate <= localDay()
          ? "오늘 지정은 해제했어요. 기한 때문에 목록에는 남아 있어요."
          : "오늘 할 일에서 뺐어요.",
    );
    return true;
  }
  if (action === "edit-note") {
    const n = p.notes.find((n) => n.id === el.dataset.note);
    showModal(
      "메모 수정",
      `<form id="note-edit-form" data-id="${p.id}" data-note="${n.id}"><label>제목<input name="title" value="${h(n.title)}" maxlength="100" required></label><label>내용<textarea name="text" rows="12" maxlength="200000" required>${h(n.text)}</textarea></label><p class="form-error" role="alert"></p><div class="modal-actions"><button type="submit" class="btn primary">변경 저장하기</button></div></form>`,
      "wide-modal",
    );
    return true;
  }
  if (action === "edit-decision") {
    const d = p.decisions.find((d) => d.id === el.dataset.decision);
    showModal(
      "결정 사항 수정",
      `<form id="decision-edit-form" data-id="${p.id}" data-note="${d.id}"><label>결정 사항<textarea name="text" rows="4" maxlength="400" required>${h(d.text)}</textarea></label><p class="form-error" role="alert"></p><div class="modal-actions"><button type="submit" class="btn primary">변경 저장하기</button></div></form>`,
    );
    return true;
  }
  if (action === "copy-to-project") {
    const n = p.notes.find((n) => n.id === el.dataset.note);
    showModal(
      "다른 프로젝트에도 보관하기",
      `<form id="copy-note-form" data-id="${p.id}" data-note="${n.id}"><label>어느 프로젝트에 연결할까요?<select name="project" required><option value="">선택해 주세요</option>${projects
        .filter((x) => x.id !== p.id)
        .map((x) => `<option value="${x.id}">${h(x.title)}</option>`)
        .join(
          "",
        )}</select></label><p class="field-hint">‘${h(n.title)}’의 사본을 저장해요. 원래 메모도 그대로 남겨둬요.</p><p class="form-error" role="alert"></p><div class="modal-actions"><button type="submit" class="btn primary">사본 저장하기</button></div></form>`,
    );
    return true;
  }
  if (action === "focus-task") {
    rememberLastProject(p.id);
    rememberVisibleDrafts();
    recoverTimer();
    if (
      focusTimer?.running &&
      (focusTimer.projectId !== p.id || focusTimer.taskId !== el.dataset.task)
    ) {
      view = "focus";
      render();
      toast("진행 중인 집중을 먼저 마무리해 주세요.");
      return true;
    }
    if (
      !focusTimer ||
      focusTimer.projectId !== p.id ||
      focusTimer.taskId !== el.dataset.task
    )
      focusTimer = makeTimer(p.id, el.dataset.task);
    storeTimer();
    view = "focus";
    render();
    window.scrollTo(0, 0);
    return true;
  }
  if (action === "timer-duration") {
    focusTimer = makeTimer(
      focusTimer.projectId,
      focusTimer.taskId,
      Number(el.dataset.minutes),
    );
    storeTimer();
    render();
    return true;
  }
  if (action === "timer-toggle") {
    rememberVisibleDrafts();
    if (focusTimer.running) focusTimer = pauseTimer(focusTimer);
    else {
      if (remainingMs(focusTimer) === 0)
        focusTimer.remainingMs = focusTimer.totalMs;
      focusTimer = startTimer(focusTimer);
    }
    storeTimer();
    render();
    return true;
  }
  if (action === "focus-stop") {
    if (focusTimer?.running) focusTimer = pauseTimer(focusTimer);
    storeTimer();
    view = "today";
    render();
    return true;
  }
  return false;
}
async function personalSubmit(form, data) {
  if (form.id === "quick-capture") {
    const text = String(data.get("text")).trim();
    if (!text) throw Error("떠오른 생각을 한 줄 적어주세요.");
    const p = inboxProject();
    p.notes.push({
      id: crypto.randomUUID(),
      title: noteTitle(text),
      text,
      createdAt: new Date().toISOString(),
    });
    await save(p);
    clearFormDraft(form);
    render();
    toast("생각 수집함에 담았어요.");
    return true;
  }
  if (form.id === "task-edit-form") {
    const p = structuredClone(projects.find((p) => p.id === form.dataset.id)),
      task = p.tasks.find((t) => t.id === form.dataset.task);
    Object.assign(task, {
      text: String(data.get("text")).trim(),
      dueDate: String(data.get("dueDate")),
      plannedFor: String(data.get("plannedFor")),
      priority: Number(data.get("priority")),
    });
    if (!task.text) throw Error("할 일을 입력해 주세요.");
    validateTaskExtras(task);
    await save(p);
    clearFormDraft(form);
    modal.close();
    render();
    toast("할 일과 일정을 저장했어요.");
    return true;
  }
  if (form.id === "note-edit-form" || form.id === "decision-edit-form") {
    const p = structuredClone(projects.find((p) => p.id === form.dataset.id)),
      text = String(data.get("text")).trim();
    if (!text) throw Error("내용을 입력해 주세요.");
    const item = (form.id === "note-edit-form" ? p.notes : p.decisions).find(
      (n) => n.id === form.dataset.note,
    );
    item.text = text;
    if (form.id === "note-edit-form") {
      item.title = String(data.get("title")).trim();
      item.updatedAt = new Date().toISOString();
    }
    await save(p);
    clearFormDraft(form);
    modal.close();
    render();
    toast("변경한 내용을 저장했어요.");
    return true;
  }
  if (form.id === "copy-note-form") {
    const source = projects.find((p) => p.id === form.dataset.id),
      note = source.notes.find((n) => n.id === form.dataset.note),
      target = projects.find((p) => p.id === data.get("project"));
    if (!target || target.id === source.id)
      throw Error("다른 프로젝트를 선택해 주세요.");
    const next = structuredClone(target);
    next.notes.push({
      ...note,
      id: crypto.randomUUID(),
      sourceProjectId: source.id,
      createdAt: new Date().toISOString(),
    });
    await save(next);
    modal.close();
    render();
    toast("선택한 프로젝트에 사본을 보관했어요.");
    return true;
  }
  if (form.id === "focus-finish") {
    const p = structuredClone(projects.find((p) => p.id === form.dataset.id)),
      t = p.tasks.find((t) => t.id === form.dataset.task);
    const summary = String(data.get("summary")).trim(),
      next = String(data.get("next")).trim(),
      done = data.get("done") === "on";
    if (!summary && !next && !done)
      throw Error(
        "진행한 내용이나 다음 행동을 남기거나, 완료를 체크해 주세요.",
      );
    p.notes.push({
      id: crypto.randomUUID(),
      title: ("집중 기록 · " + t.text).slice(0, 100),
      text: `한 가지에 집중: ${t.text}\n\n어디까지 했는지\n${summary || "기록 없음"}\n\n다음 한 걸음\n${next || "기록 없음"}`,
      createdAt: new Date().toISOString(),
    });
    if (next) p.nextAction = next;
    if (done) {
      t.done = true;
      t.completedAt = new Date().toISOString();
    }
    await save(p);
    clearFormDraft(form);
    focusTimer = null;
    tabStorage().removeItem(`savepoint.focus.${scope()}`);
    view = { id: p.id };
    render();
    toast("이번 집중의 맥락을 저장했어요.");
    return true;
  }
  return false;
}
setInterval(() => {
  if (!focusTimer || (!user && !demo)) return;
  const ms = remainingMs(focusTimer),
    clock = document.querySelector("#focus-timer");
  if (clock) clock.textContent = timerText(ms);
  if (ms === 0 && focusTimer.running) {
    focusTimer = pauseTimer(focusTimer);
    storeTimer();
    const text = document.querySelector("#focus-status");
    if (text)
      text.textContent = "정한 시간이 지났어요. 어디까지 했는지 남겨볼까요?";
    const button = document.querySelector('[data-action="timer-toggle"] span');
    if (button) button.textContent = "다시 시작하기";
    toast("집중 시간이 지났어요. 오늘 한 걸음을 기록해 봐요.");
  }
}, 1000);
window.addEventListener("beforeunload", (e) => {
  rememberVisibleDrafts();
  if (busy) {
    e.preventDefault();
    e.returnValue = "";
  }
});

init();
