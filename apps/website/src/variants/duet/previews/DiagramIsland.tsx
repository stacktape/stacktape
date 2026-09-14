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

  return (
    <div
      ref={host}
      className={active ? 'du-diagram is-active' : 'du-diagram'}
      onPointerDown={() => setEngaged(true)}
      onPointerLeave={() => setEngaged(false)}
    >
      <IsometricDiagram
        config={config as unknown as StacktapeConfig}
        ariaLabel={ariaLabel}
        style={{ width: '100%', height: '100%' }}
      />
      <span className="du-diagram__gate" aria-hidden="true">
        {active ? 'Scroll to zoom · drag to pan' : 'Click to zoom and pan'}
      </span>
    </div>
  );
}
