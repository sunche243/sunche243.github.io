import { useEffect, useState } from 'react';

export function useScreenWakeLock(): boolean {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const wakeLock = navigator.wakeLock;
    if (!wakeLock) return undefined;

    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const requestLock = async () => {
      if (disposed || document.visibilityState !== 'visible' || sentinel) return;
      try {
        sentinel = await wakeLock.request('screen');
        if (disposed) {
          await sentinel.release();
          sentinel = null;
          return;
        }
        setLocked(true);
        sentinel.addEventListener('release', () => {
          sentinel = null;
          if (!disposed) setLocked(false);
        }, { once: true });
      } catch {
        setLocked(false);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void requestLock();
    };

    void requestLock();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (sentinel) void sentinel.release();
    };
  }, []);

  return locked;
}
