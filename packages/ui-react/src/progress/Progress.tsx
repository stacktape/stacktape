import type { CSSProperties, ReactNode } from 'react';

export type ProgressProps = {
  value: number;
  max?: number;
  label?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/** A determinate progress indicator with a stable, clamped percentage. */
export function Progress({ className, label, max = 100, style, value }: ProgressProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0;
  const percentage = (safeValue / safeMax) * 100;

  return (
    <div className={['stp-ui-progress', className].filter(Boolean).join(' ')} style={style}>
      <progress className="stp-ui-progress__track" max={safeMax} value={safeValue} />
      <span className="stp-ui-progress__label">{label ?? `${Math.round(percentage)}%`}</span>
    </div>
  );
}
