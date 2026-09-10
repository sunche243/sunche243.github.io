import { useEffect, useState } from 'react';
import { getCountdownParts, type CountdownParts } from '../utils/date';

export function useCountdown(startIso: string, endIso: string): CountdownParts {
  const [parts, setParts] = useState(() =>
    getCountdownParts(new Date(), new Date(startIso), new Date(endIso)),
  );

  useEffect(() => {
    const start = new Date(startIso);
    const end = new Date(endIso);

    setParts(getCountdownParts(new Date(), start, end));
    const timer = window.setInterval(() => {
      setParts(getCountdownParts(new Date(), start, end));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [endIso, startIso]);

  return parts;
}
