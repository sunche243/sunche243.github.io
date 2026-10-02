import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlobImage } from './components/BlobImage';
import { BlobVideo } from './components/BlobVideo';
import { Player } from './components/Player';
import { SettingsPanel } from './components/SettingsPanel';
import { TRANSITIONS } from './constants/transitions';
import {
  createProjectBackup,
  makeBackupFileName,
  parseProjectBackup,
} from './services/backup';
import type { ImportProgress } from './services/importFiles';
import {
  createProject,
  deleteProject,
  estimateStorage,
  loadAudioTracks,
  loadProjects,
  loadSlides,
  renameProject,
  replaceAudioTracks,
  replaceSlides,
} from './services/storage';
import {
  DEFAULT_SETTINGS,
  type PlayerSettings,
  type SlideshowProject,
  type StorageInfo,
  type StoredAudioTrack,
  type StoredSlide,
  type TransitionType,
} from './types';
import { isSupportedAudioFile } from './utils/audio';
import { formatDuration, getEstimatedDuration } from './utils/playback';
import { hasRoomForFiles } from './utils/storage';

type Tab = 'slides' | 'settings';
type PersistenceState = 'saved' | 'saving' | 'error';

type AudioMode = 'preview' | 'playback' | null;

type UndoState =
  | { kind: 'slides'; items: StoredSlide[]; message: string }
  | { kind: 'audio'; items: StoredAudioTrack[]; message: string };

function loadSavedSettings(projectId: string): PlayerSettings {
  try {
    const saved =
      localStorage.getItem(`frameflow-settings:${projectId}`) ??
      (projectId === 'default-project'
        ? localStorage.getItem('frameflow-settings')
        : null);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function withPositions(slides: readonly StoredSlide[]): StoredSlide[] {
  return slides.map((slide, position) => ({ ...slide, position }));
}

function App() {
  const [tab, setTab] = useState<Tab>('slides');
  const [projects, setProjects] = useState<SlideshowProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [slides, setSlides] = useState<StoredSlide[]>([]);
  const [audioTracks, setAudioTracks] = useState<StoredAudioTrack[]>([]);
  const [audioUrls, setAudioUrls] = useState<Array<{ id: string; url: string }>>([]);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [audioMode, setAudioMode] = useState<AudioMode>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_SETTINGS);
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    usage: null,
    quota: null,
    persistent: null,
  });
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [startSlideId, setStartSlideId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([]);
  const [batchDuration, setBatchDuration] = useState('');
  const [batchTransition, setBatchTransition] = useState('');
  const [problemSlideIds, setProblemSlideIds] = useState<string[]>([]);
  const [problemAudioIds, setProblemAudioIds] = useState<string[]>([]);
  const [backupBusy, setBackupBusy] = useState(false);
  const [persistenceState, setPersistenceState] =
    useState<PersistenceState>('saved');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const playbackFinishingRef = useRef(false);
  const pendingAudioRef = useRef<{
    id: string;
    mode: Exclude<AudioMode, null>;
    fadeIn: boolean;
  } | null>(null);
  const playPendingAudioRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    let active = true;
    Promise.all([loadProjects(), estimateStorage()])
      .then(([savedProjects, estimatedStorage]) => {
        if (!active) return;
        setProjects(savedProjects);
        setStorageInfo(estimatedStorage);
        const remembered = localStorage.getItem('frameflow-current-project');
        const selected = savedProjects.some((project) => project.id === remembered)
          ? remembered
          : savedProjects[0]?.id;
        if (selected) setCurrentProjectId(selected);
      })
      .catch(() => {
        if (active) {
          setPersistenceState('error');
          setNotice('저장된 파일을 불러오지 못했습니다. 페이지를 새로고침해주세요.');
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentProjectId) return undefined;
    let active = true;
    let restoredNoticeTimer: number | undefined;
    setReady(false);
    audioRef.current?.pause();
    setAudioMode(null);
    setSelectedSlideIds([]);
    setProblemSlideIds([]);
    setProblemAudioIds([]);
    setUndoState(null);

    Promise.all([loadSlides(currentProjectId), loadAudioTracks(currentProjectId)])
      .then(([savedSlides, savedTracks]) => {
        if (!active) return;
        setSlides(savedSlides);
        setAudioTracks(savedTracks);
        setActiveAudioId(savedTracks[0]?.id ?? null);
        setSettings(loadSavedSettings(currentProjectId));
        setSettingsProjectId(currentProjectId);
        setPersistenceState('saved');
        localStorage.setItem('frameflow-current-project', currentProjectId);
        if (savedSlides.length > 0) {
          setNotice(`이전에 올린 슬라이드 ${savedSlides.length}장을 자동으로 불러왔습니다.`);
          restoredNoticeTimer = window.setTimeout(() => setNotice(null), 4200);
        }
      })
      .catch(() => {
        if (!active) return;
        setPersistenceState('error');
        setNotice('이 슬라이드쇼의 저장 파일을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
      if (restoredNoticeTimer) window.clearTimeout(restoredNoticeTimer);
    };
  }, [currentProjectId]);

  useEffect(() => {
    if (!currentProjectId || settingsProjectId !== currentProjectId) return;
    localStorage.setItem(
      `frameflow-settings:${currentProjectId}`,
      JSON.stringify(settings),
    );
  }, [currentProjectId, settings, settingsProjectId]);

  useEffect(() => {
    const nextUrls = audioTracks.map((track) => ({
      id: track.id,
      url: URL.createObjectURL(track.blob),
    }));
    setAudioUrls(nextUrls);
    return () => nextUrls.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [audioTracks]);

  useEffect(() => {
    if (audioRef.current && fadeFrameRef.current === null) {
      audioRef.current.volume = settings.musicVolume;
    }
  }, [settings.musicVolume]);

  const activeAudioUrl =
    audioUrls.find((item) => item.id === activeAudioId)?.url ?? null;

  const refreshStorageInfo = useCallback(() => {
    estimateStorage().then(setStorageInfo).catch(() => undefined);
  }, []);

  async function saveSlides(nextSlides: readonly StoredSlide[]) {
    if (!currentProjectId) return;
    const positioned = withPositions(nextSlides);
    setSlides(positioned);
    const remainingIds = new Set(positioned.map((slide) => slide.id));
    setSelectedSlideIds((current) => current.filter((id) => remainingIds.has(id)));
    setProblemSlideIds((current) => current.filter((id) => remainingIds.has(id)));
    setPersistenceState('saving');
    try {
      await replaceSlides(currentProjectId, positioned);
      setPersistenceState('saved');
      refreshStorageInfo();
    } catch {
      setPersistenceState('error');
      setNotice('변경 내용을 브라우저에 저장하지 못했습니다.');
    }
  }

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0 || importProgress || !currentProjectId) return;

    const estimatedBytes = files.reduce(
      (total, file) =>
        total +
        file.size *
          (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
            ? 2
            : 1),
      0,
    );
    if (!hasRoomForFiles(storageInfo, estimatedBytes)) {
      setNotice('저장공간이 부족해 파일을 추가하지 않았습니다. 기존 자료를 일부 삭제해주세요.');
      return;
    }

    setNotice(null);
    setImportProgress({ fileName: files[0].name, current: 0, total: 1 });
    try {
      const { importFiles } = await import('./services/importFiles');
      const result = await importFiles(
        currentProjectId,
        files,
        slides.length,
        setImportProgress,
      );
      await saveSlides([...slides, ...result.slides]);

      if (result.errors.length > 0) setNotice(result.errors.join(' '));
      else if (result.slides.length > 0) {
        setNotice(`${result.slides.length}장의 슬라이드를 추가했습니다.`);
        window.setTimeout(() => setNotice(null), 3200);
      }
    } catch {
      setNotice('파일을 처리하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setImportProgress(null);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function reorderSlide(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const sourceIndex = slides.findIndex((slide) => slide.id === sourceId);
    const targetIndex = slides.findIndex((slide) => slide.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...slides];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    void saveSlides(next);
  }

  function moveSlide(slideId: string, direction: -1 | 1) {
    const index = slides.findIndex((slide) => slide.id === slideId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= slides.length) return;

    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    void saveSlides(next);
  }

  function updateDuration(slideId: string, duration: number | null) {
    const safeDuration =
      duration === null ? null : Math.min(300, Math.max(1, duration));
    void saveSlides(
      slides.map((slide) =>
        slide.id === slideId ? { ...slide, duration: safeDuration } : slide,
      ),
    );
  }

  function updateTransition(
    slideId: string,
    transition: TransitionType | null,
  ) {
    void saveSlides(
      slides.map((slide) =>
        slide.id === slideId ? { ...slide, transition } : slide,
      ),
    );
  }

  function updateTransitionDuration(
    slideId: string,
    transitionDuration: number | null,
  ) {
    const safeDuration =
      transitionDuration === null
        ? null
        : Math.min(3, Math.max(0.2, transitionDuration));
    void saveSlides(
      slides.map((slide) =>
        slide.id === slideId
          ? { ...slide, transitionDuration: safeDuration }
          : slide,
      ),
    );
  }

  function offerUndo(state: UndoState) {
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    setUndoState(state);
    undoTimerRef.current = window.setTimeout(() => {
      setUndoState(null);
      undoTimerRef.current = null;
    }, 8_000);
  }

  function undoLastAction() {
    if (!undoState) return;
    if (undoState.kind === 'slides') void saveSlides(undoState.items);
    else void saveAudioList(undoState.items);
    setUndoState(null);
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

  function toggleSlideSelection(slideId: string) {
    setSelectedSlideIds((current) =>
      current.includes(slideId)
        ? current.filter((id) => id !== slideId)
        : [...current, slideId],
    );
  }

  function toggleAllSlides() {
    setSelectedSlideIds((current) =>
      current.length === slides.length ? [] : slides.map((slide) => slide.id),
    );
  }

  function applyBatchDuration() {
    if (selectedSlideIds.length === 0) return;
    const duration = batchDuration === ''
      ? null
      : Math.min(300, Math.max(1, Number(batchDuration)));
    void saveSlides(
      slides.map((slide) =>
        selectedSlideIds.includes(slide.id) ? { ...slide, duration } : slide,
      ),
    );
    setNotice(`${selectedSlideIds.length}장의 표시 시간을 변경했습니다.`);
  }

  function applyBatchTransition() {
    if (selectedSlideIds.length === 0) return;
    const transition = batchTransition
      ? (batchTransition as TransitionType)
      : null;
    void saveSlides(
      slides.map((slide) =>
        selectedSlideIds.includes(slide.id) ? { ...slide, transition } : slide,
      ),
    );
    setNotice(`${selectedSlideIds.length}장의 전환 효과를 변경했습니다.`);
  }

  function duplicateSlide(slideId: string) {
    const index = slides.findIndex((slide) => slide.id === slideId);
    if (index < 0) return;
    const source = slides[index];
    const duplicate: StoredSlide = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} 복사본`,
      createdAt: Date.now(),
      position: index + 1,
    };
    const next = [...slides];
    next.splice(index + 1, 0, duplicate);
    void saveSlides(next);
    setNotice('슬라이드를 복제했습니다.');
  }

  function markSlideProblem(slideId: string) {
    setProblemSlideIds((current) =>
      current.includes(slideId) ? current : [...current, slideId],
    );
  }

  function clearSlideProblem(slideId: string) {
    setProblemSlideIds((current) => current.filter((id) => id !== slideId));
  }

  function removeSlide(slideId: string) {
    const previous = [...slides];
    void saveSlides(slides.filter((slide) => slide.id !== slideId));
    offerUndo({ kind: 'slides', items: previous, message: '슬라이드를 삭제했습니다.' });
  }

  function clearAll() {
    if (window.confirm('등록한 슬라이드를 모두 삭제할까요? 잠시 동안 되돌릴 수 있습니다.')) {
      const previous = [...slides];
      void saveSlides([]);
      offerUndo({ kind: 'slides', items: previous, message: '모든 슬라이드를 삭제했습니다.' });
    }
  }

  async function saveAudioList(nextTracks: readonly StoredAudioTrack[]) {
    if (!currentProjectId) return;
    const positioned = nextTracks.map((track, position) => ({
      ...track,
      projectId: currentProjectId,
      position,
    }));
    setAudioTracks(positioned);
    setPersistenceState('saving');
    try {
      await replaceAudioTracks(currentProjectId, positioned);
      setPersistenceState('saved');
      refreshStorageInfo();
    } catch {
      setPersistenceState('error');
      setNotice('음악 목록을 브라우저에 저장하지 못했습니다.');
    }
  }

  async function addAudioFiles(files: File[]) {
    if (!currentProjectId) return;
    const supported = files.filter(isSupportedAudioFile);
    if (supported.length !== files.length) {
      setNotice('MP3, M4A 또는 WAV 음원 파일을 선택해주세요.');
    }
    if (supported.length === 0) return;

    const incomingBytes = supported.reduce((total, file) => total + file.size, 0);
    if (!hasRoomForFiles(storageInfo, incomingBytes)) {
      setNotice('저장공간이 부족해 음악을 추가하지 않았습니다.');
      return;
    }

    audioRef.current?.pause();
    setAudioMode(null);
    const additions = supported.map((file, offset): StoredAudioTrack => ({
      id: crypto.randomUUID(),
      projectId: currentProjectId,
      name: file.name,
      blob: file,
      mimeType: file.type,
      size: file.size,
      position: audioTracks.length + offset,
      updatedAt: Date.now(),
    }));
    await saveAudioList([...audioTracks, ...additions]);
    setNotice(`${additions.length}곡의 배경 음악을 추가했습니다.`);
    window.setTimeout(() => setNotice(null), 3200);
  }

  function removeAudioTrack(trackId: string) {
    const track = audioTracks.find((item) => item.id === trackId);
    if (!track || !window.confirm(`${track.name} 음악을 삭제할까요?`)) return;

    if (activeAudioId === trackId) {
      audioRef.current?.pause();
      setAudioMode(null);
      setActiveAudioId(null);
    }
    const previous = [...audioTracks];
    void saveAudioList(audioTracks.filter((item) => item.id !== trackId));
    offerUndo({ kind: 'audio', items: previous, message: '배경 음악을 삭제했습니다.' });
  }

  function moveAudioTrack(trackId: string, direction: -1 | 1) {
    const index = audioTracks.findIndex((track) => track.id === trackId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= audioTracks.length) return;
    const next = [...audioTracks];
    [next[index], next[target]] = [next[target], next[index]];
    void saveAudioList(next);
  }

  function cancelAudioFade() {
    if (fadeFrameRef.current !== null) {
      window.cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }
  }

  function fadeAudioTo(target: number, durationSeconds: number, done?: () => void) {
    const audio = audioRef.current;
    if (!audio) return;
    cancelAudioFade();
    const from = audio.volume;
    if (durationSeconds <= 0) {
      audio.volume = target;
      done?.();
      return;
    }

    const startedAt = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / (durationSeconds * 1000));
      audio.volume = from + (target - from) * progress;
      if (progress < 1) fadeFrameRef.current = window.requestAnimationFrame(step);
      else {
        fadeFrameRef.current = null;
        done?.();
      }
    };
    fadeFrameRef.current = window.requestAnimationFrame(step);
  }

  function playPendingAudio() {
    const pending = pendingAudioRef.current;
    const audio = audioRef.current;
    if (!pending || !audio || pending.id !== activeAudioId) return;
    pendingAudioRef.current = null;
    cancelAudioFade();
    audio.currentTime = 0;
    audio.volume = pending.fadeIn ? 0 : settings.musicVolume;
    setAudioMode(pending.mode);
    audio.play().then(() => {
      setProblemAudioIds((current) => current.filter((id) => id !== pending.id));
      if (pending.fadeIn) {
        fadeAudioTo(settings.musicVolume, settings.musicFadeIn);
      }
    }).catch(() => {
      setProblemAudioIds((current) =>
        current.includes(pending.id) ? current : [...current, pending.id],
      );
      setNotice('브라우저에서 음악 재생을 시작하지 못했습니다.');
    });
  }
  playPendingAudioRef.current = playPendingAudio;

  function requestAudioPlay(
    trackId: string,
    mode: Exclude<AudioMode, null>,
    fadeIn: boolean,
  ) {
    pendingAudioRef.current = { id: trackId, mode, fadeIn };
    if (activeAudioId === trackId && activeAudioUrl) {
      window.setTimeout(() => playPendingAudioRef.current(), 0);
    } else {
      setActiveAudioId(trackId);
    }
  }

  useEffect(() => {
    if (activeAudioUrl && pendingAudioRef.current?.id === activeAudioId) {
      window.setTimeout(() => playPendingAudioRef.current(), 0);
    }
  }, [activeAudioId, activeAudioUrl]);

  function toggleAudioPreview(trackId: string) {
    const audio = audioRef.current;
    if (audioMode === 'preview' && activeAudioId === trackId && audio && !audio.paused) {
      audio.pause();
      setAudioMode(null);
      return;
    }
    requestAudioPlay(trackId, 'preview', false);
  }

  function handleAudioEnded() {
    if (audioMode !== 'playback' || audioTracks.length === 0) {
      setAudioMode(null);
      return;
    }
    const currentIndex = audioTracks.findIndex((track) => track.id === activeAudioId);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % audioTracks.length;
    requestAudioPlay(audioTracks[nextIndex].id, 'playback', false);
  }

  function fadeOutAndStopAudio() {
    const audio = audioRef.current;
    if (!audio || audio.paused) {
      setAudioMode(null);
      return;
    }
    fadeAudioTo(0, settings.musicFadeOut, () => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = settings.musicVolume;
      setAudioMode(null);
    });
  }

  function selectTab(nextTab: Tab) {
    if (nextTab !== 'settings' && audioMode === 'preview') {
      audioRef.current?.pause();
      setAudioMode(null);
    }
    setTab(nextTab);
  }

  function startPlayback(fromSlideId: string | null = null) {
    if (slides.length === 0) return;
    playbackFinishingRef.current = false;
    setStartSlideId(fromSlideId);
    const fullscreenRequest = document.documentElement.requestFullscreen?.();
    fullscreenRequest?.catch(() => undefined);
    if (audioTracks[0]) {
      requestAudioPlay(audioTracks[0].id, 'playback', settings.musicFadeIn > 0);
    }
    setPlaying(true);
  }

  function stopPlayback() {
    fadeOutAndStopAudio();
    setPlaying(false);
    setStartSlideId(null);
    setTab('settings');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  }

  function finishPlaybackAudio() {
    playbackFinishingRef.current = true;
    fadeOutAndStopAudio();
  }

  const syncAudioWithPause = useCallback((paused: boolean) => {
    const audio = audioRef.current;
    if (audioMode !== 'playback' || !audio) return;

    if (paused && playbackFinishingRef.current) return;
    cancelAudioFade();
    if (paused) audio.pause();
    else {
      playbackFinishingRef.current = false;
      audio.volume = settings.musicVolume;
      audio.play().catch(() => setNotice('음악을 다시 재생하지 못했습니다.'));
    }
  }, [audioMode, settings.musicVolume]);

  async function addProject() {
    const suggested = `새 슬라이드쇼 ${projects.length + 1}`;
    const name = window.prompt('새 슬라이드쇼 이름을 입력해주세요.', suggested)?.trim();
    if (!name) return;
    try {
      const project = await createProject(name);
      setProjects((current) => [project, ...current]);
      setCurrentProjectId(project.id);
      setTab('slides');
    } catch {
      setNotice('새 슬라이드쇼를 만들지 못했습니다.');
    }
  }

  async function changeProjectName() {
    const project = projects.find((item) => item.id === currentProjectId);
    if (!project) return;
    const name = window.prompt('슬라이드쇼 이름을 바꿔주세요.', project.name)?.trim();
    if (!name || name === project.name) return;
    try {
      const renamed = await renameProject(project, name);
      setProjects((current) =>
        current.map((item) => (item.id === renamed.id ? renamed : item)),
      );
    } catch {
      setNotice('슬라이드쇼 이름을 변경하지 못했습니다.');
    }
  }

  async function removeCurrentProject() {
    const project = projects.find((item) => item.id === currentProjectId);
    if (!project) return;
    if (
      !window.confirm(
        `${project.name} 슬라이드쇼와 그 안의 사진·영상·음악을 모두 삭제할까요?`,
      )
    ) {
      return;
    }

    try {
      let remaining = projects.filter((item) => item.id !== project.id);
      if (remaining.length === 0) {
        remaining = [await createProject('새 슬라이드쇼')];
      }
      await deleteProject(project.id);
      localStorage.removeItem(`frameflow-settings:${project.id}`);
      setProjects(remaining);
      setCurrentProjectId(remaining[0].id);
      setTab('slides');
    } catch {
      setNotice('슬라이드쇼를 삭제하지 못했습니다.');
    }
  }

  function switchProject(projectId: string) {
    if (projectId === currentProjectId) return;
    audioRef.current?.pause();
    setAudioMode(null);
    setCurrentProjectId(projectId);
  }

  async function exportCurrentProject() {
    if (!currentProject) return;
    setBackupBusy(true);
    setNotice('백업 파일을 만들고 있습니다. 큰 영상이 있으면 잠시 걸릴 수 있습니다.');
    try {
      const backup = await createProjectBackup(
        currentProject,
        slides,
        audioTracks,
        settings,
      );
      const url = URL.createObjectURL(backup);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = makeBackupFileName(currentProject.name);
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setNotice('백업 파일을 저장했습니다.');
    } catch {
      setNotice('백업 파일을 만들지 못했습니다.');
    } finally {
      setBackupBusy(false);
    }
  }

  async function importProjectBackup(file: File) {
    setBackupBusy(true);
    setNotice('백업 파일을 확인하고 있습니다.');
    try {
      const restored = await parseProjectBackup(file);
      if (!hasRoomForFiles(storageInfo, restored.totalBytes)) {
        setNotice('백업을 복원하기에 브라우저 저장공간이 부족합니다.');
        return;
      }

      const project = await createProject(`${restored.name} 복원`);
      const restoredSlides = restored.slides.map((slide, position) => ({
        ...slide,
        id: crypto.randomUUID(),
        projectId: project.id,
        position,
      }));
      const restoredTracks = restored.audioTracks.map((track, position) => ({
        ...track,
        id: crypto.randomUUID(),
        projectId: project.id,
        position,
      }));
      await Promise.all([
        replaceSlides(project.id, restoredSlides),
        replaceAudioTracks(project.id, restoredTracks),
      ]);
      localStorage.setItem(
        `frameflow-settings:${project.id}`,
        JSON.stringify(restored.settings),
      );
      setProjects((current) => [project, ...current]);
      setCurrentProjectId(project.id);
      setTab('slides');
      setNotice(`“${restored.name}” 백업을 새 슬라이드쇼로 복원했습니다.`);
      refreshStorageInfo();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '백업을 복원하지 못했습니다.');
    } finally {
      setBackupBusy(false);
    }
  }

  useEffect(
    () => () => {
      if (fadeFrameRef.current !== null) {
        window.cancelAnimationFrame(fadeFrameRef.current);
      }
      if (undoTimerRef.current !== null) {
        window.clearTimeout(undoTimerRef.current);
      }
    },
    [],
  );

  const currentProject = projects.find((project) => project.id === currentProjectId);
  const pdfPageCount = slides.filter((slide) => slide.sourceType === 'pdf-page').length;
  const videoCount = slides.filter((slide) => slide.sourceType === 'video').length;
  const imageCount = slides.length - pdfPageCount - videoCount;
  const estimatedDuration = getEstimatedDuration(slides, settings);
  const appMediaBytes = useMemo(
    () =>
      slides.reduce((total, slide) => total + slide.blob.size, 0) +
      audioTracks.reduce((total, track) => total + track.size, 0),
    [audioTracks, slides],
  );

  if (!ready) {
    return (
      <main className="loading-screen">
        <span className="loading-mark">F</span>
        <p>슬라이드를 준비하고 있습니다…</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" type="button" onClick={() => selectTab('slides')}>
          <span className="brand__mark">F</span>
          <span>
            <strong>Frameflow</strong>
            <small>SLIDESHOW PLAYER</small>
          </span>
        </button>

        <div className="project-switcher">
          <label>
            <span className="sr-only">슬라이드쇼 선택</span>
            <select
              value={currentProjectId ?? ''}
              disabled={Boolean(importProgress)}
              onChange={(event) => switchProject(event.target.value)}
            >
              {projects.map((project) => (
                <option value={project.id} key={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={Boolean(importProgress)} onClick={() => void addProject()} title="새 슬라이드쇼">
            + 새로 만들기
          </button>
          <button type="button" disabled={Boolean(importProgress)} onClick={() => void changeProjectName()} title="이름 변경">
            이름 변경
          </button>
          <button
            type="button"
            className="project-delete"
            disabled={Boolean(importProgress)}
            onClick={() => void removeCurrentProject()}
            title="현재 슬라이드쇼 삭제"
          >
            삭제
          </button>
        </div>

        <nav className="main-tabs" aria-label="주요 메뉴">
          <button
            type="button"
            className={tab === 'slides' ? 'is-active' : ''}
            onClick={() => selectTab('slides')}
          >
            슬라이드 <span>{slides.length}</span>
          </button>
          <button
            type="button"
            className={tab === 'settings' ? 'is-active' : ''}
            onClick={() => selectTab('settings')}
          >
            설정
          </button>
        </nav>

        <button
          className="start-button"
          type="button"
          onClick={() => startPlayback()}
          disabled={slides.length === 0}
        >
          <span aria-hidden="true">▶</span> 전체 화면 재생
        </button>
      </header>

      {notice && <div className="app-notice" role="status">{notice}</div>}
      {undoState && (
        <div className="undo-toast" role="status">
          <span>{undoState.message}</span>
          <button type="button" onClick={undoLastAction}>되돌리기</button>
        </div>
      )}

      <main className="workspace">
        {tab === 'slides' ? (
          <section className="slides-panel" aria-labelledby="slides-title">
            <div className="section-heading">
              <div>
                <span className="eyebrow">YOUR PLAYLIST</span>
                <h1 id="slides-title">{currentProject?.name ?? '보여줄 장면을 모아보세요'}</h1>
              </div>
              <p>
                사진, PDF와 영상을 한곳에 넣고 원하는 순서로 정리하세요.<br />
                각 장면마다 시간과 전환 효과를 다르게 지정할 수 있습니다.
              </p>
            </div>

            <div
              className={`drop-zone ${dragging ? 'is-dragging' : ''} ${
                importProgress ? 'is-busy' : ''
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragging(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void addFiles(event.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,application/pdf"
                onChange={(event) => {
                  if (event.target.files) void addFiles(event.target.files);
                }}
              />
              <div className="drop-zone__icon" aria-hidden="true">
                {importProgress ? '···' : '+'}
              </div>
              {importProgress ? (
                <div>
                  <strong>{importProgress.fileName}</strong>
                  <span>
                    {importProgress.current} / {importProgress.total} 파일 처리 중
                  </span>
                </div>
              ) : (
                <div>
                  <strong>사진, PDF 또는 영상을 여기에 놓으세요</strong>
                  <span>JPG, PNG, WEBP, GIF, PDF, MP4, MOV · 여러 파일을 한 번에 선택할 수 있어요</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={Boolean(importProgress)}
              >
                파일 선택
              </button>
            </div>

            <aside
              className={`persistence-banner persistence-banner--${persistenceState}`}
              aria-live="polite"
            >
              <span className="persistence-banner__status">
                <i aria-hidden="true" />
                {persistenceState === 'saving'
                  ? '브라우저에 저장 중'
                  : persistenceState === 'error'
                    ? '저장 확인 필요'
                    : '자동 저장됨'}
              </span>
              <p>
                {persistenceState === 'error'
                  ? '일부 파일이 보관되지 않았을 수 있습니다. 페이지를 새로고침한 뒤 다시 확인해주세요.'
                  : slides.length > 0
                    ? `현재 ${slides.length}장의 슬라이드가 보관되어 있습니다. 탭을 닫고 다시 접속해도 자동으로 불러옵니다.`
                    : '추가한 사진, PDF와 영상은 이 브라우저에 보관되며, 다음에 다시 접속하면 자동으로 불러옵니다.'}
              </p>
            </aside>

            {slides.length > 0 ? (
              <>
                <div className="playlist-toolbar">
                  <div>
                    <strong>{slides.length}장</strong>
                    <span>
                      사진 {imageCount} · PDF 페이지 {pdfPageCount} · 영상 {videoCount}
                    </span>
                    <span className="estimated-time">예상 재생 시간 {formatDuration(estimatedDuration)}</span>
                  </div>
                  <div>
                    <span className="drag-hint">끌어서 순서 변경</span>
                    <button type="button" className="text-button" onClick={toggleAllSlides}>
                      {selectedSlideIds.length === slides.length ? '전체 선택 해제' : '전체 선택'}
                    </button>
                    <button type="button" className="text-button danger" onClick={clearAll}>
                      모두 삭제
                    </button>
                  </div>
                </div>

                <div className={`batch-toolbar ${selectedSlideIds.length ? 'is-active' : ''}`}>
                  <strong>{selectedSlideIds.length}장 선택</strong>
                  <label>
                    <span>표시 시간</span>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={batchDuration}
                      placeholder="전체 설정"
                      onChange={(event) => setBatchDuration(event.target.value)}
                    />
                    <button
                      type="button"
                      disabled={selectedSlideIds.length === 0}
                      onClick={applyBatchDuration}
                    >
                      시간 적용
                    </button>
                  </label>
                  <label>
                    <span>전환 효과</span>
                    <select
                      value={batchTransition}
                      onChange={(event) => setBatchTransition(event.target.value)}
                    >
                      <option value="">전체 설정 사용</option>
                      {TRANSITIONS.map((transition) => (
                        <option value={transition.value} key={transition.value}>
                          {transition.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={selectedSlideIds.length === 0}
                      onClick={applyBatchTransition}
                    >
                      효과 적용
                    </button>
                  </label>
                </div>

                <ol className="slide-list">
                  {slides.map((slide, index) => (
                    <li
                      key={slide.id}
                      draggable
                      className={`${draggedSlideId === slide.id ? 'is-dragging' : ''} ${
                        selectedSlideIds.includes(slide.id) ? 'is-selected' : ''
                      } ${problemSlideIds.includes(slide.id) ? 'has-problem' : ''}`}
                      onDragStart={() => setDraggedSlideId(slide.id)}
                      onDragEnd={() => setDraggedSlideId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedSlideId) reorderSlide(draggedSlideId, slide.id);
                        setDraggedSlideId(null);
                      }}
                    >
                      <span className="drag-handle" title="끌어서 이동">⠿</span>
                      <label className="slide-selector">
                        <input
                          type="checkbox"
                          checked={selectedSlideIds.includes(slide.id)}
                          onChange={() => toggleSlideSelection(slide.id)}
                          aria-label={`${slide.name} 선택`}
                        />
                      </label>
                      <span className="slide-number">{String(index + 1).padStart(2, '0')}</span>
                      <div className="slide-thumb">
                        {slide.sourceType === 'video' ? (
                          <BlobVideo
                            blob={slide.blob}
                            onLoadedData={() => clearSlideProblem(slide.id)}
                            onError={() => markSlideProblem(slide.id)}
                          />
                        ) : (
                          <BlobImage
                            blob={slide.blob}
                            alt=""
                            onLoad={() => clearSlideProblem(slide.id)}
                            onError={() => markSlideProblem(slide.id)}
                          />
                        )}
                        {slide.sourceType === 'pdf-page' && <span className="slide-type-badge">PDF</span>}
                        {slide.sourceType === 'video' && <span className="slide-type-badge">VIDEO</span>}
                        {problemSlideIds.includes(slide.id) && (
                          <span className="slide-problem-badge">⚠ 확인 필요</span>
                        )}
                      </div>
                      <div className="slide-info">
                        <strong>{slide.name}</strong>
                        <span className={problemSlideIds.includes(slide.id) ? 'media-problem-text' : ''}>
                          {problemSlideIds.includes(slide.id)
                            ? '파일을 표시할 수 없습니다'
                            : null}
                          {!problemSlideIds.includes(slide.id) && (
                            <>
                          {slide.sourceType === 'pdf-page'
                            ? `${slide.pageNumber} / ${slide.pageCount} 페이지`
                            : slide.sourceType === 'video'
                              ? `영상 · ${formatDuration(slide.mediaDuration ?? settings.defaultDuration)}`
                              : '이미지'}
                            </>
                          )}
                        </span>
                      </div>
                      <label className="duration-field">
                        <span>표시 시간</span>
                        <span>
                          <input
                            type="number"
                            min="1"
                            max="300"
                            value={slide.duration ?? ''}
                            placeholder={String(
                              slide.sourceType === 'video'
                                ? Math.round(slide.mediaDuration ?? settings.defaultDuration)
                                : settings.defaultDuration,
                            )}
                            onChange={(event) =>
                              updateDuration(
                                slide.id,
                                event.target.value === '' ? null : Number(event.target.value),
                              )
                            }
                            aria-label={`${slide.name} 표시 시간`}
                          />
                          초
                        </span>
                      </label>
                      <label className="transition-field">
                        <span>전환 효과</span>
                        <select
                          value={slide.transition ?? ''}
                          onChange={(event) =>
                            updateTransition(
                              slide.id,
                              event.target.value
                                ? (event.target.value as TransitionType)
                                : null,
                            )
                          }
                        >
                          <option value="">전체 설정 사용</option>
                          {TRANSITIONS.map((transition) => (
                            <option value={transition.value} key={transition.value}>
                              {transition.label}
                            </option>
                          ))}
                        </select>
                        <span className="transition-duration-inline">
                          <input
                            type="number"
                            min="0.2"
                            max="3"
                            step="0.1"
                            value={slide.transitionDuration ?? ''}
                            placeholder={settings.transitionDuration.toFixed(1)}
                            onChange={(event) =>
                              updateTransitionDuration(
                                slide.id,
                                event.target.value === ''
                                  ? null
                                  : Number(event.target.value),
                              )
                            }
                            aria-label={`${slide.name} 전환 시간`}
                          />
                          초
                        </span>
                      </label>
                      <div className="slide-actions">
                        <button
                          type="button"
                          className="play-from-button"
                          onClick={() => startPlayback(slide.id)}
                          aria-label={`${slide.name}부터 재생`}
                          title="여기서부터 재생"
                        >
                          ▶
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSlide(slide.id, -1)}
                          disabled={index === 0}
                          aria-label="위로 이동"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSlide(slide.id, 1)}
                          disabled={index === slides.length - 1}
                          aria-label="아래로 이동"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="duplicate-button"
                          onClick={() => duplicateSlide(slide.id)}
                          aria-label="슬라이드 복제"
                          title="복제"
                        >
                          ⧉
                        </button>
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() => removeSlide(slide.id)}
                          aria-label="슬라이드 삭제"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <div className="empty-state">
                <span>01</span>
                <p>위 영역에 파일을 추가하면<br />여기에 재생 순서가 나타납니다.</p>
              </div>
            )}
          </section>
        ) : (
          <SettingsPanel
            settings={settings}
            audioTracks={audioTracks}
            audioPreviewingTrackId={
              audioMode === 'preview' && audioPlaying ? activeAudioId : null
            }
            problemAudioIds={problemAudioIds}
            storageInfo={storageInfo}
            appMediaBytes={appMediaBytes}
            backupBusy={backupBusy}
            onChange={setSettings}
            onAudioFiles={(files) => void addAudioFiles(files)}
            onToggleAudioPreview={toggleAudioPreview}
            onMoveAudio={moveAudioTrack}
            onRemoveAudio={removeAudioTrack}
            onExportBackup={() => void exportCurrentProject()}
            onImportBackup={(file) => void importProjectBackup(file)}
          />
        )}
      </main>

      {activeAudioUrl && (
        <audio
          ref={audioRef}
          src={activeAudioUrl}
          preload="metadata"
          onPlay={() => setAudioPlaying(true)}
          onPause={() => setAudioPlaying(false)}
          onEnded={handleAudioEnded}
          onCanPlay={() => {
            if (activeAudioId) {
              setProblemAudioIds((current) => current.filter((id) => id !== activeAudioId));
            }
          }}
          onError={() => {
            if (activeAudioId) {
              setProblemAudioIds((current) =>
                current.includes(activeAudioId) ? current : [...current, activeAudioId],
              );
            }
          }}
        />
      )}

      <footer className="app-footer">
        <span>FRAMEFLOW / LOCAL PLAYER</span>
        <p>파일은 서버로 전송되지 않고 이 브라우저에만 저장됩니다.</p>
      </footer>

      {playing && (
        <Player
          slides={slides}
          settings={settings}
          hasBackgroundAudio={audioTracks.length > 0}
          startSlideId={startSlideId}
          onPausedChange={syncAudioWithPause}
          onFinished={finishPlaybackAudio}
          onClose={stopPlayback}
          onMediaError={markSlideProblem}
        />
      )}
    </div>
  );
}

export default App;
