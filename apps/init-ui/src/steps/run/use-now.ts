import { useEffect, useState } from 'react';

/** The time, ticking once a second while something is running, so running clocks move. */
export function useNow(isRunning: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isRunning) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);
  return now;
}
