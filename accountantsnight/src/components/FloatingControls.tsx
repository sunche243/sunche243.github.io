import { useEffect, useRef, useState } from 'react';

interface FloatingControlsProps {
  onShare: () => void;
  toast: (message: string) => void;
}

export function FloatingControls({ onShare, toast }: FloatingControlsProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (fadeRef.current) window.clearInterval(fadeRef.current);
    },
    [],
  );

  function fade(target: number) {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeRef.current) window.clearInterval(fadeRef.current);
    fadeRef.current = window.setInterval(() => {
      const delta = target > audio.volume ? 0.025 : -0.025;
      const next = Math.max(0, Math.min(0.25, audio.volume + delta));
      audio.volume = next;
      if (Math.abs(next - target) < 0.03) {
        audio.volume = target;
        if (fadeRef.current) window.clearInterval(fadeRef.current);
        if (target === 0) audio.pause();
      }
    }, 70);
  }

  async function toggleAudio() {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(`${import.meta.env.BASE_URL}audio/bgm.mp3`);
      audio.loop = true;
      audio.preload = 'none';
      audio.volume = 0;
      audio.addEventListener('canplaythrough', () => setAudioAvailable(true), { once: true });
      audio.addEventListener('error', () => setAudioAvailable(false), { once: true });
      audioRef.current = audio;
    }

    if (playing) {
      fade(0);
      setPlaying(false);
      return;
    }

    try {
      await audio.play();
      setAudioAvailable(true);
      setPlaying(true);
      fade(0.25);
    } catch {
      toast(audioAvailable ? '화면을 한 번 터치한 뒤 BGM을 재생해주세요.' : 'BGM 파일을 준비하고 있습니다.');
    }
  }

  return (
    <div className="floating-controls" aria-label="빠른 기능">
      <button
        className={`floating-button ${playing ? 'is-playing' : ''}`}
        type="button"
        onClick={toggleAudio}
        aria-label={playing ? 'BGM 일시정지' : 'BGM 재생'}
      >
        ♪
      </button>
      <button className="floating-button" type="button" onClick={onShare} aria-label="초대장 공유">
        ↗
      </button>
    </div>
  );
}
