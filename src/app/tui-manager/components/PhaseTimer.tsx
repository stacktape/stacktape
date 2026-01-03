/** @jsxImportSource @opentui/react */
import React, { useEffect, useState } from 'react';
import { formatPhaseTimer, getElapsedTime } from '../utils';

type PhaseTimerProps = {
  startTime?: number;
  duration?: number;
  isRunning: boolean;
};

/**
 * Self-updating timer component that only re-renders itself (not the parent tree).
 * This isolates timer updates to prevent flickering of the entire UI.
 */
export const PhaseTimer: React.FC<PhaseTimerProps> = ({ startTime, duration, isRunning }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const elapsed = getElapsedTime(startTime, duration);

  return <text fg="gray"> {formatPhaseTimer(elapsed)}</text>;
};
