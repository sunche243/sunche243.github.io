import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeFloorPlan } from './floorPlan';
import { exportProjectPng } from './exportPng';
import {
  autoAssignPeople,
  createEmptyProject,
  findDuplicateTableNames,
  generateLayout,
  getAllSeats,
  getUnassignedPeople,
  movePerson,
  removeMissingAssignments,
} from './layout';
import { SeatCanvas } from './SeatCanvas';
import { consumeSeatingTransfer } from './transfer';
import type {
  FloorPlanDraft,
  SeatingPerson,
  SeatingProjectPayload,
  SeatingProjectRecord,
  SeatingSettings,
  WorkbookPreview,
} from './types';
import { readWorkbook, workbookRowsToPeople } from './workbook';

type WorkspaceTab = 'setup' | 'people' | 'layout';

interface HistoryState {
  past: SeatingProjectPayload[];
  present: SeatingProjectPayload;
  future: SeatingProjectPayload[];
}

const EMPTY_NOOP = () => undefined;
const LOCAL_PROJECTS_KEY = 'suncheme:seating-projects:v1';
const LOCAL_CURRENT_PROJECT_KEY = 'suncheme:seating-current-project:v1';

function makeRecord(payload: SeatingProjectPayload, id = crypto.randomUUID()): SeatingProjectRecord {
  const now = new Date().toISOString();
  return { id, name: payload.name, payload, createdAt: now, updatedAt: now };
}

function loadLocalProjects(): SeatingProjectRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_PROJECTS_KEY) ?? '[]') as SeatingProjectRecord[];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.payload?.schemaVersion === 1) : [];
  } catch { return []; }
}

function persistLocalProjects(projects: SeatingProjectRecord[], currentId: string): boolean {
  try {
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
    localStorage.setItem(LOCAL_CURRENT_PROJECT_KEY, currentId);
    return true;
  } catch { return false; }
}

function initialWorkspace(): { records: SeatingProjectRecord[]; current: SeatingProjectRecord; message: string } {
  const existing = loadLocalProjects();
  const transfer = consumeSeatingTransfer();
  if (transfer?.people.length) {
    const record = makeRecord({ ...createEmptyProject('회계인의 밤 선정자 배치'), people: transfer.people });
    const records = [record, ...existing];
    persistLocalProjects(records, record.id);
    return { records, current: record, message: `선정자 ${transfer.people.length}명을 불러왔습니다. 설정을 확인한 뒤 자동 배치를 실행해 주세요.` };
  }
  const preferredId = localStorage.getItem(LOCAL_CURRENT_PROJECT_KEY);
  const current = existing.find((item) => item.id === preferredId) ?? existing[0] ?? makeRecord(createEmptyProject());
  const records = existing.length ? existing : [current];
  return { records, current, message: '' };
}

const INITIAL_WORKSPACE = initialWorkspace();

function numberValue(value: string, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number(value) || min));
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

export function TableApp() {
  const [tab, setTab] = useState<WorkspaceTab>('setup');
  const [history, setHistory] = useState<HistoryState>({ past: [], present: INITIAL_WORKSPACE.current.payload, future: [] });
  const [currentId, setCurrentId] = useState(INITIAL_WORKSPACE.current.id);
  const [projects, setProjects] = useState<SeatingProjectRecord[]>(INITIAL_WORKSPACE.records);
  const [dirty, setDirty] = useState(false);
  const [statusMessage, setStatusMessage] = useState(INITIAL_WORKSPACE.message);
  const [error, setError] = useState('');
  const [workbook, setWorkbook] = useState<WorkbookPreview | null>(null);
  const [floorPlanDraft, setFloorPlanDraft] = useState<FloorPlanDraft | null>(null);
  const [analyzingFloorPlan, setAnalyzingFloorPlan] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmptySeats, setShowEmptySeats] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const project = history.present;

  const commit = useCallback((update: (current: SeatingProjectPayload) => SeatingProjectPayload) => {
    setHistory((current) => {
      const next = update(current.present);
      if (next === current.present) return current;
      return { past: [...current.past.slice(-39), current.present], present: next, future: [] };
    });
    setDirty(true);
  }, []);

  const resetProject = useCallback((payload: SeatingProjectPayload, id: string) => {
    setHistory({ past: [], present: payload, future: [] });
    setCurrentId(id); setDirty(false); setSelectedPersonId(null); setShowEmptySeats(false); setWorkbook(null); setFloorPlanDraft(null);
  }, []);

  const saveNow = useCallback((showMessage = true) => {
    const now = new Date().toISOString();
    setProjects((current) => {
      const previous = current.find((item) => item.id === currentId);
      const saved: SeatingProjectRecord = {
        id: currentId,
        name: history.present.name.trim() || '이름 없는 좌석 배치',
        payload: history.present,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      const next = [saved, ...current.filter((item) => item.id !== currentId)];
      if (!persistLocalProjects(next, currentId)) {
        window.setTimeout(() => setError('브라우저 저장 공간이 부족합니다. JSON 백업을 내려받은 뒤 오래된 프로젝트나 큰 배치도 배경을 정리해 주세요.'), 0);
      }
      return next;
    });
    setDirty(false);
    if (showMessage) setStatusMessage('이 브라우저에 좌석 배치를 저장했습니다. 다른 기기로 옮기려면 JSON 백업을 내려받아 주세요.');
  }, [currentId, history.present]);

  useEffect(() => {
    if (!dirty) return;
    const timeout = window.setTimeout(() => saveNow(false), 800);
    return () => window.clearTimeout(timeout);
  }, [dirty, saveNow]);

  const seats = useMemo(() => getAllSeats(project), [project]);
  const unassigned = useMemo(() => getUnassignedPeople(project), [project]);
  const assignedCount = project.people.length - unassigned.length;
  const duplicateTableNames = useMemo(() => findDuplicateTableNames(project), [project]);
  const duplicatePeople = useMemo(() => {
    const counts = new Map<string, number>();
    project.people.forEach((person) => {
      const key = `${person.name.trim().toLocaleLowerCase('ko')}|${person.identifier.replaceAll(/\D/g, '')}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.values()].filter((count) => count > 1).length;
  }, [project.people]);
  const missingNames = project.people.filter((person) => !person.name.trim()).length;

  function updateSettings<K extends keyof SeatingSettings>(key: K, value: SeatingSettings[K]) {
    commit((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  function rebuildLayout() {
    const occupied = seats.some((seat) => seat.personId);
    if (occupied && !window.confirm('현재 좌석 배치를 새 설정으로 다시 만들까요? 배정된 좌석은 초기화됩니다.')) return;
    commit((current) => ({ ...current, ...generateLayout(current.settings) }));
    setShowEmptySeats(false);
    setStatusMessage('설정에 맞춰 새 배치 초안을 만들었습니다.');
    setTab('layout');
  }

  function undo() {
    setHistory((current) => {
      const previous = current.past.at(-1); if (!previous) return current;
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] };
    });
    setDirty(true); setSelectedPersonId(null);
  }

  function redo() {
    setHistory((current) => {
      const next = current.future[0]; if (!next) return current;
      return { past: [...current.past, current.present], present: next, future: current.future.slice(1) };
    });
    setDirty(true); setSelectedPersonId(null);
  }

  async function importExcel(file: File) {
    setError('');
    try { setWorkbook(await readWorkbook(file)); }
    catch (readError) { setError(readError instanceof Error ? readError.message : 'Excel 파일을 읽지 못했습니다.'); }
  }

  function applyWorkbook(mode: 'replace' | 'append') {
    if (!workbook) return;
    const result = workbookRowsToPeople(workbook);
    commit((current) => removeMissingAssignments({
      ...current,
      people: mode === 'replace' ? result.people : [...current.people, ...result.people],
    }));
    setStatusMessage(`${result.people.length}명을 ${mode === 'replace' ? '불러왔습니다' : '추가했습니다'}.${result.skipped ? ` 빈 이름 ${result.skipped}행 제외.` : ''}${result.duplicates ? ` 중복 ${result.duplicates}행 제외.` : ''}`);
    setWorkbook(null);
  }

  function addPerson() {
    const person: SeatingPerson = { id: `manual-${crypto.randomUUID()}`, name: '새 참석자', group: '구분 없음', identifier: '' };
    commit((current) => ({ ...current, people: [...current.people, person] }));
  }

  function updatePerson(id: string, key: keyof Omit<SeatingPerson, 'id'>, value: string) {
    commit((current) => ({ ...current, people: current.people.map((person) => person.id === id ? { ...person, [key]: value } : person) }));
  }

  function removePerson(id: string) {
    commit((current) => removeMissingAssignments({ ...current, people: current.people.filter((person) => person.id !== id) }));
  }

  async function uploadFloorPlan(file: File) {
    setAnalyzingFloorPlan(true); setError('');
    try { setFloorPlanDraft(await analyzeFloorPlan(file, project.settings)); }
    catch (analysisError) { setError(analysisError instanceof Error ? analysisError.message : '배치도를 분석하지 못했습니다.'); }
    finally { setAnalyzingFloorPlan(false); }
  }

  function approveFloorPlan() {
    if (!floorPlanDraft) return;
    commit((current) => ({
      ...current,
      floorPlan: floorPlanDraft.source,
      tables: floorPlanDraft.tables,
      theaterSeats: floorPlanDraft.theaterSeats,
    }));
    setFloorPlanDraft(null); setShowEmptySeats(false); setStatusMessage('업체 배치도 초안을 적용했습니다. 드래그해서 세부 위치를 조정할 수 있습니다.'); setTab('layout');
  }

  function startNewProject() {
    if (dirty) saveNow(false);
    const record = makeRecord(createEmptyProject());
    setProjects((current) => [record, ...current]);
    resetProject(record.payload, record.id); setTab('setup');
  }

  function duplicateProject() {
    const payload = { ...structuredClone(project), name: `${project.name} 복사본` };
    const record = makeRecord(payload);
    setProjects((current) => [record, ...current]);
    resetProject(payload, record.id);
    setDirty(true); setStatusMessage('현재 배치의 복사본을 만들었습니다.');
  }

  function removeProject() {
    if (!window.confirm(`“${project.name}” 프로젝트를 삭제할까요? 이 브라우저에서는 되돌릴 수 없습니다.`)) return;
    let remaining = projects.filter((item) => item.id !== currentId);
    if (!remaining.length) remaining = [makeRecord(createEmptyProject())];
    setProjects(remaining);
    persistLocalProjects(remaining, remaining[0].id);
    resetProject(remaining[0].payload, remaining[0].id);
    setStatusMessage('프로젝트를 삭제했습니다.');
  }

  function downloadBackup() {
    const now = new Date().toISOString();
    const previous = projects.find((item) => item.id === currentId);
    const currentRecord: SeatingProjectRecord = { id: currentId, name: project.name, payload: project, createdAt: previous?.createdAt ?? now, updatedAt: now };
    const snapshot = [currentRecord, ...projects.filter((item) => item.id !== currentId)];
    persistLocalProjects(snapshot, currentId);
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: now, projects: snapshot }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `좌석배치_백업_${new Date().toLocaleDateString('sv-SE').replaceAll('-', '')}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function restoreBackup(file: File) {
    setError('');
    try {
      const parsed = JSON.parse(await file.text()) as { version?: number; projects?: SeatingProjectRecord[] };
      const restored = parsed.projects?.filter((item) => item?.payload?.schemaVersion === 1) ?? [];
      if (parsed.version !== 1 || !restored.length) throw new Error('지원하지 않는 백업 파일입니다.');
      setProjects(restored); persistLocalProjects(restored, restored[0].id); resetProject(restored[0].payload, restored[0].id);
      setStatusMessage(`${restored.length}개 프로젝트를 백업에서 복원했습니다.`);
    } catch (restoreError) { setError(restoreError instanceof Error ? restoreError.message : '백업 파일을 복원하지 못했습니다.'); }
  }

  return (
    <div className="table-app-shell">
      <header className="table-topbar">
        <div><p>SEATING STUDIO</p><strong>PUBLIC TABLE PLANNER</strong></div>
        <nav><a href="/">sunche.me</a><span>브라우저 자동 저장</span></nav>
      </header>
      <main className="table-workspace">
        <section className="table-project-bar">
          <div className="table-project-name">
            <label htmlFor="seating-project-name">프로젝트 이름</label>
            <input id="seating-project-name" maxLength={80} value={project.name} onChange={(event) => commit((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <label>저장된 배치
            <select value={currentId} onChange={(event) => {
              const selected = projects.find((item) => item.id === event.target.value);
              if (selected) {
                if (dirty) saveNow(false);
                resetProject(selected.payload, selected.id);
              }
            }}>
              {projects.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatUpdatedAt(item.updatedAt)}</option>)}
            </select>
          </label>
          <div className="table-project-actions">
            <button type="button" onClick={startNewProject}>새로 만들기</button>
            <button type="button" onClick={duplicateProject}>복사본 만들기</button>
            <button type="button" onClick={() => saveNow()}>{dirty ? '지금 저장' : '저장됨'}</button>
            <button type="button" onClick={downloadBackup}>JSON 백업</button>
            <button type="button" onClick={() => backupInputRef.current?.click()}>백업 복원</button>
            <input ref={backupInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void restoreBackup(file); event.currentTarget.value = ''; }} />
            <button className="is-danger" type="button" onClick={removeProject}>삭제</button>
          </div>
        </section>

        <p className="table-privacy-note">개인정보 안내 · Excel 명단과 배치도는 서버로 전송되지 않으며 현재 브라우저에만 저장됩니다. 다른 기기로 옮길 때는 JSON 백업을 이용해 주세요.</p>

        {error ? <div className="table-banner table-banner--error" role="alert">{error}</div> : null}
        {statusMessage ? <div className="table-banner" role="status">{statusMessage}<button type="button" onClick={() => setStatusMessage('')}>닫기</button></div> : null}

        <nav className="table-steps" aria-label="테이블 배치 단계">
          <button className={tab === 'setup' ? 'is-active' : ''} type="button" onClick={() => setTab('setup')}><span>1</span> 공간 설정</button>
          <button className={tab === 'people' ? 'is-active' : ''} type="button" onClick={() => setTab('people')}><span>2</span> 참석자 불러오기 <small>{project.people.length}명</small></button>
          <button className={tab === 'layout' ? 'is-active' : ''} type="button" onClick={() => setTab('layout')}><span>3</span> 좌석 편집 <small>{assignedCount}/{project.people.length}</small></button>
        </nav>

        {tab === 'setup' ? (
          <section className="table-panel setup-panel">
            <div className="table-panel__heading"><div><p>STEP 01</p><h1>공간과 좌석 형태를 정해주세요.</h1></div><span>설정을 바꾼 뒤 ‘배치 초안 만들기’를 눌러 적용합니다.</span></div>
            <div className="layout-type-options">
              {(['round', 'square', 'theater'] as const).map((type) => (
                <button key={type} className={project.settings.layoutType === type ? 'is-selected' : ''} type="button" onClick={() => updateSettings('layoutType', type)}>
                  <i className={`layout-icon layout-icon--${type}`} />
                  <strong>{type === 'round' ? '라운드' : type === 'square' ? '스퀘어' : '씨어터'}</strong>
                  <span>{type === 'round' ? '원탁 둘레에 균등 배치' : type === 'square' ? '한 면 또는 네 면 배치' : '무대 방향 열 좌석 배치'}</span>
                </button>
              ))}
            </div>
            <div className="setting-grid">
              {project.settings.layoutType !== 'theater' ? <>
                <label>테이블 수<input type="number" min={1} max={50} value={project.settings.tableCount} onChange={(event) => updateSettings('tableCount', numberValue(event.target.value, 1, 50))} /></label>
                <label>테이블당 인원<input type="number" min={1} max={20} value={project.settings.seatsPerTable} onChange={(event) => updateSettings('seatsPerTable', numberValue(event.target.value, 1, 20))} /></label>
                {project.settings.layoutType === 'square' ? <label>좌석 방향<select value={project.settings.squareMode} onChange={(event) => updateSettings('squareMode', event.target.value as SeatingSettings['squareMode'])}><option value="front">한 면 · 정면 보기</option><option value="surround">네 면 · 둘러앉기</option></select></label> : null}
              </> : <>
                <label>총 좌석 수<input type="number" min={1} max={500} value={project.settings.totalTheaterSeats} onChange={(event) => updateSettings('totalTheaterSeats', numberValue(event.target.value, 1, 500))} /></label>
                <label>한 줄 좌석 수<input type="number" min={1} max={40} value={project.settings.seatsPerRow} onChange={(event) => updateSettings('seatsPerRow', numberValue(event.target.value, 1, 40))} /></label>
                <label>통로 수<input type="number" min={0} max={6} value={project.settings.aisleCount} onChange={(event) => updateSettings('aisleCount', numberValue(event.target.value, 0, 6))} /></label>
              </>}
              <label>자동 배치 기준<select value={project.settings.assignmentMode} onChange={(event) => updateSettings('assignmentMode', event.target.value as SeatingSettings['assignmentMode'])}><option value="group">구분·소속별로 모아 배치</option><option value="random">무작위 배치</option></select></label>
            </div>
            <div className="setup-summary"><strong>예상 수용 인원 {project.settings.layoutType === 'theater' ? project.settings.totalTheaterSeats : project.settings.tableCount * project.settings.seatsPerTable}명</strong><span>현재 참석자 {project.people.length}명</span><button type="button" onClick={rebuildLayout}>배치 초안 만들기</button></div>
            <div className="floor-plan-uploader">
              <div><p>업체 배치도 자동 감지</p><h2>기존 좌석도가 있나요?</h2><span>PNG, JPG 또는 PDF 첫 페이지의 도형과 명암을 분석해 가장 가까운 초안을 만듭니다.</span></div>
              <label className="upload-button">{analyzingFloorPlan ? '배치도 분석 중...' : '배치도 업로드'}<input type="file" accept="image/png,image/jpeg,application/pdf,.pdf" disabled={analyzingFloorPlan} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFloorPlan(file); event.currentTarget.value = ''; }} /></label>
            </div>
            {floorPlanDraft ? (
              <section className="floor-plan-review" aria-labelledby="floor-plan-review-title">
                <div className="table-panel__heading"><div><p>AUTO DETECT · {floorPlanDraft.confidence.toUpperCase()}</p><h2 id="floor-plan-review-title">아래 배치도가 맞습니까?</h2></div><span>{floorPlanDraft.detectedCount}개 요소를 감지했습니다. 승인 후에도 직접 수정할 수 있습니다.</span></div>
                <SeatCanvas project={{ ...project, floorPlan: floorPlanDraft.source, tables: floorPlanDraft.tables, theaterSeats: floorPlanDraft.theaterSeats }} selectedPersonId={null} searchQuery="" showEmptySeats={false} readOnly onSelectPerson={EMPTY_NOOP} onMovePerson={EMPTY_NOOP} onMoveTable={EMPTY_NOOP} onRenameTable={EMPTY_NOOP} onRotateTable={EMPTY_NOOP} onToggleTableLock={EMPTY_NOOP} onToggleSeatLock={EMPTY_NOOP} />
                <div className="review-actions"><button type="button" onClick={() => setFloorPlanDraft(null)}>다시 업로드</button><button className="is-primary" type="button" onClick={approveFloorPlan}>네, 이 배치도 사용하기</button></div>
              </section>
            ) : null}
          </section>
        ) : null}

        {tab === 'people' ? (
          <section className="table-panel people-panel">
            <div className="table-panel__heading"><div><p>STEP 02</p><h1>참석자를 확인해주세요.</h1></div><span>Excel의 이름·구분 열을 자동 감지하고, 필요하면 직접 열을 지정할 수 있습니다.</span></div>
            <div className="people-import-row">
              <label className="upload-button">Excel 파일 선택<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importExcel(file); event.currentTarget.value = ''; }} /></label>
              <button type="button" onClick={addPerson}>한 명 직접 추가</button>
              <span>현재 {project.people.length}명 · 중복 의심 {duplicatePeople}건</span>
            </div>
            {workbook ? (
              <div className="workbook-mapper">
                <div><strong>{workbook.fileName}</strong><span>{workbook.rows.length}개 데이터 행</span></div>
                <label>이름 열<select value={workbook.nameColumn} onChange={(event) => setWorkbook({ ...workbook, nameColumn: Number(event.target.value) })}>{workbook.headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header}</option>)}</select></label>
                <label>구분·소속 열<select value={workbook.groupColumn ?? ''} onChange={(event) => setWorkbook({ ...workbook, groupColumn: event.target.value === '' ? null : Number(event.target.value) })}><option value="">사용 안 함</option>{workbook.headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header}</option>)}</select></label>
                <label>식별 열<select value={workbook.identifierColumn ?? ''} onChange={(event) => setWorkbook({ ...workbook, identifierColumn: event.target.value === '' ? null : Number(event.target.value) })}><option value="">사용 안 함</option>{workbook.headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header}</option>)}</select></label>
                <div className="workbook-mapper__actions"><button type="button" onClick={() => applyWorkbook('append')}>기존 명단에 추가</button><button className="is-primary" type="button" onClick={() => applyWorkbook('replace')}>현재 명단 교체</button></div>
              </div>
            ) : null}
            <div className="people-table-wrap"><table className="people-table"><thead><tr><th>#</th><th>이름</th><th>구분·소속</th><th>식별 정보</th><th>상태</th><th /></tr></thead><tbody>
              {project.people.map((person, index) => {
                const isAssigned = !unassigned.some((item) => item.id === person.id);
                return <tr key={person.id}><td>{index + 1}</td><td><input aria-label={`${index + 1}번 이름`} maxLength={50} value={person.name} onChange={(event) => updatePerson(person.id, 'name', event.target.value)} /></td><td><input aria-label={`${person.name} 구분`} maxLength={80} value={person.group} onChange={(event) => updatePerson(person.id, 'group', event.target.value)} /></td><td><input aria-label={`${person.name} 식별 정보`} maxLength={80} value={person.identifier} onChange={(event) => updatePerson(person.id, 'identifier', event.target.value)} /></td><td><span className={isAssigned ? 'person-status is-assigned' : 'person-status'}>{isAssigned ? '배정' : '미배정'}</span></td><td><button type="button" onClick={() => removePerson(person.id)}>삭제</button></td></tr>;
              })}
              {!project.people.length ? <tr><td colSpan={6} className="empty-cell">Excel을 올리거나 관리자의 ‘테이블 배치하기’ 버튼으로 선정자를 불러와 주세요.</td></tr> : null}
            </tbody></table></div>
            <button className="next-step-button" type="button" onClick={() => setTab('layout')}>좌석 편집으로 이동</button>
          </section>
        ) : null}

        {tab === 'layout' ? (
          <section className="table-panel layout-panel">
            <div className="table-panel__heading"><div><p>STEP 03</p><h1>좌석을 배치하고 내보내세요.</h1></div><span>이름을 선택한 뒤 좌석을 누르거나, 이름표를 드래그할 수 있습니다. 좌석을 두 번 누르면 잠깁니다.</span></div>
            <div className="layout-toolbar">
              <div><button type="button" onClick={undo} disabled={!history.past.length}>실행 취소</button><button type="button" onClick={redo} disabled={!history.future.length}>다시 실행</button></div>
              <label>참석자 검색<input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="이름·소속·식별 정보" /></label>
              <label className="empty-seat-toggle"><input type="checkbox" checked={showEmptySeats} onChange={(event) => setShowEmptySeats(event.target.checked)} />빈 좌석 표시</label>
              <button className="is-primary" type="button" onClick={() => commit(autoAssignPeople)} disabled={!project.people.length}>자동 좌석 배치</button>
              <button type="button" onClick={() => void exportProjectPng(project)}>PNG 내보내기</button>
            </div>
            <div className="layout-validation" role="status">
              <span>좌석 {seats.length}개</span><span>배정 {assignedCount}명</span><span className={unassigned.length ? 'has-warning' : ''}>미배정 {unassigned.length}명</span>
              {project.people.length > seats.length ? <strong>좌석이 {project.people.length - seats.length}개 부족합니다.</strong> : null}
              {duplicateTableNames.length ? <strong>테이블 이름이 중복되었습니다.</strong> : null}
              {duplicatePeople ? <strong>명단 중복 의심 {duplicatePeople}건</strong> : null}
              {missingNames ? <strong>이름이 비어 있는 참석자 {missingNames}명</strong> : null}
            </div>
            <SeatCanvas
              project={project}
              selectedPersonId={selectedPersonId}
              searchQuery={searchQuery}
              showEmptySeats={showEmptySeats}
              onSelectPerson={setSelectedPersonId}
              onMovePerson={(personId, seatId) => commit((current) => movePerson(current, personId, seatId))}
              onMoveTable={(tableId, x, y) => commit((current) => ({ ...current, tables: current.tables.map((table) => table.id === tableId ? { ...table, x, y } : table) }))}
              onRenameTable={(tableId, name) => commit((current) => ({ ...current, tables: current.tables.map((table) => table.id === tableId ? { ...table, name } : table) }))}
              onRotateTable={(tableId) => commit((current) => ({ ...current, tables: current.tables.map((table) => table.id === tableId ? { ...table, rotation: (table.rotation + 90) % 360 } : table) }))}
              onToggleTableLock={(tableId) => commit((current) => ({ ...current, tables: current.tables.map((table) => table.id === tableId ? { ...table, locked: !table.locked } : table) }))}
              onToggleSeatLock={(seatId) => commit((current) => ({ ...current, tables: current.tables.map((table) => ({ ...table, seats: table.seats.map((seat) => seat.id === seatId ? { ...seat, locked: !seat.locked } : seat) })), theaterSeats: current.theaterSeats.map((seat) => seat.id === seatId ? { ...seat, locked: !seat.locked } : seat) }))}
            />
            <section className="unassigned-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData('application/x-seating-person'); if (id) commit((current) => movePerson(current, id, null)); }}>
              <div><p>UNASSIGNED NAME BOX</p><h2>미배정 · 제외 인원</h2><span>좌석이 넘치거나 제외한 이름은 여기에 남습니다. 이름을 선택한 뒤 좌석을 누르세요.</span></div>
              <div className="name-box-list">
                {unassigned.map((person) => <button key={person.id} className={selectedPersonId === person.id ? 'is-selected' : ''} type="button" draggable onDragStart={(event) => event.dataTransfer.setData('application/x-seating-person', person.id)} onClick={() => setSelectedPersonId(selectedPersonId === person.id ? null : person.id)}><strong>{person.name}</strong><span>{person.group}</span></button>)}
                {!unassigned.length ? <p>모든 참석자가 좌석에 배정되었습니다.</p> : null}
              </div>
            </section>
            {project.floorPlan ? <label className="reference-opacity">배치도 배경 진하기<input type="range" min="0" max="0.8" step="0.05" value={project.floorPlan.opacity} onChange={(event) => commit((current) => current.floorPlan ? { ...current, floorPlan: { ...current.floorPlan, opacity: Number(event.target.value) } } : current)} /><button type="button" onClick={() => commit((current) => ({ ...current, floorPlan: null }))}>배치도 배경 제거</button></label> : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
