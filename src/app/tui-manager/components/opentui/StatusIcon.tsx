/** @jsxImportSource @opentui/react */

import { useState, useEffect } from 'react';
import type { TuiEventStatus } from '../../types';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export const Spinner = ({ color = '#06b6d4' }: { color?: string }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return <text fg={color}>{SPINNER_FRAMES[frame]}</text>;
};

export const StatusIcon = ({ status, isActive }: { status: TuiEventStatus; isActive?: boolean }) => {
  if (status === 'success') return <text fg="#22c55e">✓</text>;
  if (status === 'error') return <text fg="#ef4444">✗</text>;
  if (status === 'warning') return <text fg="#eab308">▲</text>;
  if (status === 'running' || isActive) return <Spinner />;
  return <text fg="#6b7280">·</text>;
};

export const PhaseIcon = ({ status }: { status: TuiEventStatus }) => {
  if (status === 'success') return <text fg="#22c55e">✓</text>;
  if (status === 'error') return <text fg="#ef4444">✗</text>;
  if (status === 'running') return <Spinner />;
  return <text fg="#4b5563"> </text>;
};
