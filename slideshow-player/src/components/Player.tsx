import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerSettings, StoredSlide } from '../types';
import { orderItems } from '../utils/order';
import { formatDuration, getSlideDuration } from '../utils/playback';
import { createTransitionSequence } from '../utils/transitions';
import { useScreenWakeLock } from '../hooks/useScreenWakeLock';
import { BlobImage } from './BlobImage';
import { BlobVideo } from './BlobVideo';

interface PlayerProps {
  slides: readonly StoredSlide[];
  settings: PlayerSettings;
  hasBackgroundAudio: boolean;
  startSlideId: string | null;
  onPausedChange: (paused: boolean) => void;
  onFinished: () => void;
  onClose: () => void;
  onMediaError: (slideId: string) => void;
}

const ORDER_LABELS = {
  forward: '순서대로',
  random: '랜덤',
  reverse: '뒤에서부터',
};

export function Player({
  slides,
  settings,
  hasBackgroundAudio,
  startSlideId,
  onPausedChange,
  onFinished,
  onClose,
  onMediaError,
}: PlayerProps) {
  const [playlist, setPlaylist] = useState(() => {
    const ordered = orderItems(slides, settings.orderMode);
    const startIndex = startSlideId
      ? ordered.findIndex((slide) => slide.id === startSlideId)
      : 0;
    return startIndex > 0
      ? [...ordered.slice(startIndex), ...ordered.slice(0, startIndex)]
      : ordered;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousSlide, setPreviousSlide] = useState<StoredSlide | null>(null);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transitionCycle, setTransitionCycle] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [shortcutsVisible, setShortcutsVisible] = useState(false);
  const hideControlsTimer = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const wakeLockActive = useScreenWakeLock();

  const currentSlide = playlist[currentIndex];
  const durationMs = currentSlide
    ? getSlideDuration(currentSlide, settings) * 1000
    : settings.defaultDuration * 1000;
  const transitionSequence = useMemo(
    () =>
      createTransitionSequence(
        playlist,
        settings.transition,
        transitionCycle % 2 === 0 ? Math.random : () => 1 - Math.random(),
      ),
    [playlist, settings.transition, transitionCycle],
  );
  const transition = transitionSequence[currentIndex] ?? 'crossfade';
  const transitionDuration =
    currentSlide?.transitionDuration ?? settings.transitionDuration;
  const totalDurationMs = useMemo(
    () =>
      playlist.reduce(
        (total, slide) => total + getSlideDuration(slide, settings) * 1000,
        0,
      ),
    [playlist, settings],
  );
  const elapsedBeforeCurrentMs = useMemo(
    () =>
      playlist
        .slice(0, currentIndex)
        .reduce(
          (total, slide) => total + getSlideDuration(slide, settings) * 1000,
          0,
        ),
    [currentIndex, playlist, settings],
  );
  const overallElapsedMs = Math.min(
    totalDurationMs,
    elapsedBeforeCurrentMs + elapsed,
  );

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = paused
      ? null
      : window.setTimeout(() => setControlsVisible(false), 2600);
  }, [paused]);

  const updateElapsed = useCallback((value: number) => {
    elapsedRef.current = value;
    setElapsed(value);
  }, []);

  const moveTo = useCallback(
    (direction: 1 | -1) => {
      updateElapsed(0);
      setCurrentIndex((current) => {
        setPreviousSlide(playlist[current] ?? null);
        const nextIndex = current + direction;

        if (nextIndex >= 0 && nextIndex < playlist.length) return nextIndex;

        if (!settings.loop) {
          setPaused(true);
          if (direction > 0) onFinished();
          return direction > 0 ? playlist.length - 1 : 0;
        }

        if (direction > 0 && settings.orderMode === 'random') {
          setPlaylist(orderItems(slides, 'random'));
        }

        if (direction > 0) setTransitionCycle((cycle) => cycle + 1);

        return direction > 0 ? 0 : playlist.length - 1;
      });
    },
    [onFinished, playlist, settings.loop, settings.orderMode, slides, updateElapsed],
  );

  const jumpTo = useCallback(
    (index: number) => {
      const safeIndex = Math.min(playlist.length - 1, Math.max(0, index));
      setPreviousSlide(playlist[currentIndex] ?? null);
      setCurrentIndex(safeIndex);
      updateElapsed(0);
    },
    [currentIndex, playlist, updateElapsed],
  );

  useEffect(() => {
    showControls();
  }, [showControls]);

  useEffect(() => {
    if (paused || !currentSlide) return undefined;

    const startedAt = performance.now() - elapsedRef.current;
    const interval = window.setInterval(() => {
      const nextElapsed = performance.now() - startedAt;
      if (
        nextElapsed >= durationMs &&
        currentSlide.sourceType === 'video' &&
        currentSlide.duration === null
      ) {
        updateElapsed(durationMs);
      } else if (nextElapsed >= durationMs) moveTo(1);
      else updateElapsed(nextElapsed);
    }, 50);

    return () => window.clearInterval(interval);
  }, [currentSlide, durationMs, moveTo, paused, updateElapsed]);

  useEffect(() => {
    onPausedChange(paused);
  }, [onPausedChange, paused]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') moveTo(1);
      if (event.key === 'ArrowLeft') moveTo(-1);
      if (event.key === 'Home') jumpTo(0);
      if (event.key === 'End') jumpTo(playlist.length - 1);
      if (event.key === ' ') {
        event.preventDefault();
        setPaused((value) => !value);
      }
      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault();
        setShortcutsVisible((visible) => !visible);
      }
      if (event.key.toLowerCase() === 'q' || event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [jumpTo, moveTo, onClose, playlist.length]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) onClose();
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [onClose]);

  useEffect(
    () => () => {
      if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    },
    [],
  );

  const playerStyle = useMemo(
    () =>
      ({
        '--player-background': settings.background,
        '--transition-duration': `${transitionDuration}s`,
        '--slide-progress': `${Math.min(100, (overallElapsedMs / totalDurationMs) * 100)}%`,
      }) as React.CSSProperties,
    [overallElapsedMs, settings.background, totalDurationMs, transitionDuration],
  );

  if (!currentSlide) return null;

  return (
    <div
      className={`player ${controlsVisible ? 'controls-visible' : ''}`}
      style={playerStyle}
      onMouseMove={showControls}
      onTouchStart={showControls}
      role="dialog"
      aria-label="슬라이드 전체 화면 재생"
    >
      <div className="player__stage">
        {previousSlide && previousSlide.sourceType !== 'video' && (
          <BlobImage
            key={`previous-${previousSlide.id}`}
            blob={previousSlide.blob}
            alt=""
            className="player__image player__image--previous"
            style={{ objectFit: settings.fitMode }}
          />
        )}
        {currentSlide.sourceType === 'video' ? (
          <BlobVideo
            key={`${currentSlide.id}-${currentIndex}`}
            blob={currentSlide.blob}
            playing={!paused}
            muted={hasBackgroundAudio && settings.muteVideoWhenMusic}
            volume={settings.videoVolume}
            onEnded={() => {
              if (currentSlide.duration === null) moveTo(1);
            }}
            onError={() => onMediaError(currentSlide.id)}
            className={`player__image player__image--current transition-${transition}`}
            style={{ objectFit: settings.fitMode }}
          />
        ) : (
          <BlobImage
            key={`${currentSlide.id}-${currentIndex}`}
            blob={currentSlide.blob}
            alt={currentSlide.name}
            className={`player__image player__image--current transition-${transition}`}
            style={{ objectFit: settings.fitMode }}
            onError={() => onMediaError(currentSlide.id)}
          />
        )}
      </div>

      <div className="player__topbar">
        <div className="player__counter">
          <strong>{String(currentIndex + 1).padStart(2, '0')}</strong>
          <span>/ {String(playlist.length).padStart(2, '0')}</span>
          <em>{ORDER_LABELS[settings.orderMode]}</em>
          {hasBackgroundAudio && <em className="player__music">♫ 음악 반복</em>}
          {wakeLockActive && <em className="player__wake">화면 켜짐</em>}
          {currentSlide.sourceType === 'video' && <em>VIDEO</em>}
        </div>
        <button type="button" className="player__exit" onClick={onClose}>
          나가기 <kbd>Q</kbd>
        </button>
      </div>

      <div className="player__controls">
        <button type="button" onClick={() => moveTo(-1)} aria-label="이전 슬라이드">
          ←
        </button>
        <button
          type="button"
          className="player__play-pause"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? '재생' : '일시정지'}
        >
          {paused ? '▶' : 'Ⅱ'}
        </button>
        <button type="button" onClick={() => moveTo(1)} aria-label="다음 슬라이드">
          →
        </button>
      </div>

      <div className="player__key-hint">
        <span>← → 이동</span>
        <span>Space 재생·정지</span>
        <span>Esc 설정으로</span>
        <button type="button" onClick={() => setShortcutsVisible(true)}>단축키 ?</button>
      </div>

      <div className="player__time" aria-label="전체 재생 진행 시간">
        {formatDuration(Math.floor(overallElapsedMs / 1000))}
        <span>/ {formatDuration(Math.ceil(totalDurationMs / 1000))}</span>
      </div>

      {shortcutsVisible && (
        <div className="shortcut-overlay" role="dialog" aria-label="키보드 단축키">
          <div className="shortcut-card">
            <button
              type="button"
              className="shortcut-card__close"
              onClick={() => setShortcutsVisible(false)}
              aria-label="단축키 안내 닫기"
            >
              ×
            </button>
            <span className="eyebrow">KEYBOARD SHORTCUTS</span>
            <h2>키보드로 재생하기</h2>
            <dl>
              <div><dt>← / →</dt><dd>이전·다음 슬라이드</dd></div>
              <div><dt>Space</dt><dd>재생·일시정지</dd></div>
              <div><dt>Home / End</dt><dd>처음·마지막 슬라이드</dd></div>
              <div><dt>?</dt><dd>단축키 안내 열기·닫기</dd></div>
              <div><dt>Esc / Q</dt><dd>재생 종료 후 설정으로</dd></div>
            </dl>
          </div>
        </div>
      )}

      <div className="player__progress" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
