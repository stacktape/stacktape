import type { CSSProperties } from 'react';
import type { ThinkingOrbProps } from 'thinking-orbs';
import { lazy, Suspense, useEffect, useState } from 'react';

const ThinkingOrb = lazy(() => import('thinking-orbs').then((module) => ({ default: module.ThinkingOrb })));

export type SectionLoaderPurpose = 'loading' | 'connecting' | 'processing' | 'composing';

const orbState: Record<SectionLoaderPurpose, ThinkingOrbProps['state']> = {
  loading: 'working',
  connecting: 'connecting',
  processing: 'shaping',
  composing: 'composing'
};

export function SectionLoader({
  label = 'Loading…',
  purpose = 'loading',
  size = 'section',
  delayMs = 250,
  isLoading = true,
  className,
  style
}: {
  label?: string;
  purpose?: SectionLoaderPurpose;
  size?: 'compact' | 'section';
  delayMs?: number;
  isLoading?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const [isVisible, setIsVisible] = useState(delayMs === 0 && isLoading);

  useEffect(() => {
    if (!isLoading) {
      setIsVisible(false);
      return undefined;
    }
    if (delayMs === 0) {
      setIsVisible(true);
      return undefined;
    }

    const timer = window.setTimeout(() => setIsVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, isLoading]);

  if (!isLoading) return null;

  const isCompact = size === 'compact';
  const classes = ['stp-ui-section-loader', `stp-ui-section-loader--${size}`, className].filter(Boolean).join(' ');

  // Reserve the final dimensions during the anti-flicker delay so nearby content never jumps.
  if (!isVisible) return <div aria-hidden="true" className={classes} style={style} />;

  return (
    <output aria-label={label || purpose} aria-live="polite" className={classes} style={style}>
      <Suspense fallback={<StaticOrb size={isCompact ? 20 : 64} />}>
        <ThinkingOrb aria-hidden="true" size={isCompact ? 20 : 64} state={orbState[purpose]!} theme="dark" />
      </Suspense>
      {label ? <span>{label}</span> : null}
    </output>
  );
}

function StaticOrb({ size }: { size: 20 | 64 }) {
  return (
    <span aria-hidden="true" className="stp-ui-section-loader__placeholder" style={{ width: size, height: size }} />
  );
}
