import { useCallback, useEffect, useRef, useState } from 'react';

const BGM_VOLUME = 0.25;
const FADE_STEP = 0.025;
const FADE_INTERVAL = 70;

interface FloatingControlsProps {
  onShare: () => void;
  toast: (message: string) => void;
}

export function FloatingControls({ onShare, toast }: FloatingControlsProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const attemptPlaybackRef = useRef<((force?: boolean) => Promise<boolean>) | null>(null);
  const removeInteractionListenersRef = useRef<(() => void) | null>(null);
  const activeEffectRef = useRef<symbol | null>(null);
  const playingRef = useRef(false);
  const manualStopRef = useRef(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);

  const clearFade = useCallback(() => {
    if (fadeRef.current === null) return;
    window.clearInterval(fadeRef.current);
    fadeRef.current = null;
  }, []);

  const fade = useCallback((target: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    clearFade();

    fadeRef.current = window.setInterval(() => {
      const difference = target - audio.volume;

      if (Math.abs(difference) <= FADE_STEP) {
        audio.volume = target;
        clearFade();
        if (target === 0) audio.pause();
        return;
      }

      audio.volume = Math.max(0, Math.min(BGM_VOLUME, audio.volume + Math.sign(difference) * FADE_STEP));
    }, FADE_INTERVAL);
  }, [clearFade]);

  useEffect(() => {
    let audio = audioRef.current;

    if (!audio) {
      audio = new Audio(`${import.meta.env.BASE_URL}audio/bgm.mp3`);
      audioRef.current = audio;
    }

    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    manualStopRef.current = false;
    playingRef.current = false;
    setPlaying(false);

    const effectId = Symbol('bgm-effect');
    activeEffectRef.current = effectId;
    let playbackAttemptInFlight = false;
    let interactionListenersActive = false;
    let wheelPlaybackAttempted = false;
    const passiveListenerOptions = { passive: true } as const;

    const isActive = () => activeEffectRef.current === effectId;

    const removeInteractionListeners = () => {
      if (!interactionListenersActive) return;
      document.removeEventListener('pointerdown', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('wheel', handleFirstWheel);
      interactionListenersActive = false;

      if (removeInteractionListenersRef.current === removeInteractionListeners) {
        removeInteractionListenersRef.current = null;
      }
    };

    const attemptPlayback = async (force = false) => {
      if (!isActive() || (playbackAttemptInFlight && !force)) return false;
      playbackAttemptInFlight = true;

      try {
        await audio.play();

        if (!isActive() || manualStopRef.current) {
          audio.pause();
          return false;
        }

        removeInteractionListeners();
        setAudioAvailable(true);
        playingRef.current = true;
        setPlaying(true);
        fade(BGM_VOLUME);
        return true;
      } catch {
        return false;
      } finally {
        playbackAttemptInFlight = false;
      }
    };

    function handleFirstInteraction(event: Event) {
      const target = event.target;

      if (target instanceof Element && target.closest('[data-bgm-toggle]')) return;
      void attemptPlayback();
    }

    function handleFirstWheel(event: WheelEvent) {
      if (wheelPlaybackAttempted) return;
      wheelPlaybackAttempted = true;
      handleFirstInteraction(event);
    }

    const addInteractionListeners = () => {
      if (!isActive() || interactionListenersActive) return;
      document.addEventListener('pointerdown', handleFirstInteraction, passiveListenerOptions);
      document.addEventListener('keydown', handleFirstInteraction);
      document.addEventListener('wheel', handleFirstWheel, passiveListenerOptions);
      interactionListenersActive = true;
      removeInteractionListenersRef.current = removeInteractionListeners;
    };

    const handleCanPlay = () => setAudioAvailable(true);
    const handleError = () => {
      clearFade();
      setAudioAvailable(false);
      playingRef.current = false;
      setPlaying(false);
    };
    const handlePause = () => {
      if (!isActive()) return;
      playingRef.current = false;
      setPlaying(false);
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('pause', handlePause);
    attemptPlaybackRef.current = attemptPlayback;

    void attemptPlayback().then((started) => {
      if (!started && isActive() && !manualStopRef.current && !playingRef.current) addInteractionListeners();
    });

    return () => {
      activeEffectRef.current = null;
      removeInteractionListeners();
      attemptPlaybackRef.current = null;
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('pause', handlePause);
      clearFade();
      audio.pause();
    };
  }, [clearFade, fade]);

  async function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingRef.current) {
      manualStopRef.current = true;
      removeInteractionListenersRef.current?.();
      playingRef.current = false;
      fade(0);
      setPlaying(false);
      return;
    }

    manualStopRef.current = false;
    const started = await attemptPlaybackRef.current?.(true);

    if (!started && !playingRef.current) {
      toast(audio.error || !audioAvailable ? 'BGM 파일을 불러오지 못했습니다.' : 'BGM을 재생할 수 없습니다.');
    }
  }

  return (
    <div className="floating-controls" aria-label="빠른 기능">
      <button
        data-bgm-toggle
        className={`floating-button ${playing ? 'is-playing' : ''}`}
        type="button"
        onClick={toggleAudio}
        aria-label={playing ? 'BGM 일시정지' : 'BGM 재생'}
        aria-pressed={playing}
        title={playing ? 'BGM 일시정지' : 'BGM 재생'}
      >
        ♪
      </button>
      <button
        className="floating-button"
        type="button"
        onClick={onShare}
        aria-label="초대장 공유"
        title="초대장 공유"
      >
        <img src={`${import.meta.env.BASE_URL}images/icon-open-mono.svg`} alt="공유하기" aria-hidden="true" />
      </button>
    </div>
  );
}
