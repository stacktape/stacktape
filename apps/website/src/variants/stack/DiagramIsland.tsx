import type { StacktapeConfig } from '@stacktape/config';
import { IsometricDiagram } from '@stacktape/ui-react/isometric-diagram';
import { useEffect, useRef, useState } from 'react';
import '@stacktape/ui-react/isometric-diagram.css';

type Props = {
  /** The example configuration as a plain object; it crosses the island boundary as JSON. */
  config: Record<string, unknown>;
  ariaLabel: string;
};

/**
 * The real architecture diagram, with its wheel-zoom gated behind a click.
 *
 * The renderer registers a non-passive wheel listener that prevents page scrolling over the
 * picture. Until the visitor clicks the diagram, a capture-phase listener on this wrapper stops
 * the wheel event before it reaches the renderer, so the page keeps scrolling normally. Moving the
 * pointer out of the picture hands scrolling back to the page again.
 */
export default function DiagramIsland({ config, ariaLabel }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const [active, setActive] = useState(false);
  const [animate, setAnimate] = useState(true);

  const setEngaged = (next: boolean) => {
    activeRef.current = next;
    setActive(next);
  };

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!activeRef.current) event.stopPropagation();
    };
    element.addEventListener('wheel', onWheel, { capture: true, passive: true });
    return () => element.removeEventListener('wheel', onWheel, { capture: true });
  }, []);

  // The flowing dots along connectors are the one animation the renderer owns; honour the preference.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setAnimate(!query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  return (
    <div
      ref={host}
      className={active ? 'st-diagram is-active' : 'st-diagram'}
      onPointerDown={() => setEngaged(true)}
      onPointerLeave={() => setEngaged(false)}
    >
      <IsometricDiagram
        animateConnectors={animate}
        config={config as unknown as StacktapeConfig}
        ariaLabel={ariaLabel}
        style={{ width: '100%', height: '100%' }}
      />
      <span className="st-diagram__gate" aria-hidden="true">
        {active ? 'Scroll to zoom · drag to pan' : 'Click to zoom and pan'}
      </span>
    </div>
  );
}
