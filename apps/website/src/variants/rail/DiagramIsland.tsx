import type { StacktapeConfig } from '@stacktape/config';
import { IsometricDiagram } from '@stacktape/ui-react/isometric-diagram';
import '@stacktape/ui-react/isometric-diagram.css';
import { useEffect, useRef, useState } from 'react';

const LOCKED_HINT = 'Hover a resource to learn what it does · click to zoom with the wheel';
const UNLOCKED_HINT = 'Scroll to zoom · drag to pan · move away to release';

/**
 * The real architecture diagram, fed the example configuration as a plain object.
 *
 * Wheel zoom is gated behind a click. The diagram registers a non-passive wheel listener that
 * prevents page scrolling; while locked, a capture-phase listener on this wrapper stops the event
 * before it reaches that listener, so scrolling over the diagram scrolls the page. Hover, tooltips
 * and the zoom buttons work either way. On touch, `touch-action: pan-y` (CSS) keeps page scrolling
 * while locked, and a tap anywhere outside locks it again.
 */
export default function DiagramIsland({ config, label }: { config: Record<string, unknown>; label: string }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [unlocked, setUnlocked] = useState(false);
  const unlockedRef = useRef(false);
  unlockedRef.current = unlocked;

  useEffect(() => {
    const element = wrapper.current;
    if (!element) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (!unlockedRef.current) event.stopPropagation();
    };
    element.addEventListener('wheel', onWheel, { capture: true, passive: true });
    return () => element.removeEventListener('wheel', onWheel, { capture: true });
  }, []);

  useEffect(() => {
    if (!unlocked) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setUnlocked(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [unlocked]);

  return (
    <div
      ref={wrapper}
      className={unlocked ? 'rl-diagram is-unlocked' : 'rl-diagram'}
      onPointerDown={() => setUnlocked(true)}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setUnlocked(false);
      }}
    >
      <IsometricDiagram
        config={config as unknown as StacktapeConfig}
        ariaLabel={label}
        style={{ width: '100%', height: '100%' }}
      />
      <p className="rl-diagram__gate" aria-live="polite">
        {unlocked ? UNLOCKED_HINT : LOCKED_HINT}
      </p>
    </div>
  );
}
