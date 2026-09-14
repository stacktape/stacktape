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
 *
 * The page renders the Review screen twice (once in the lens, once inline for narrow viewports)
 * and hides one copy with CSS. Only the copy that has a box mounts the renderer, so the hidden
 * one costs nothing.
 */
export default function DiagramIsland({ config, ariaLabel }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const [active, setActive] = useState(false);
  const [animate, setAnimate] = useState(true);
  const [hasBox, setHasBox] = useState(false);

  const setEngaged = (next: boolean) => {
    activeRef.current = next;
    setActive(next);
  };

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const check = () => {
      if (element.getClientRects().length > 0) setHasBox(true);
    };
    check();
    if (typeof ResizeObserver === 'undefined') {
      setHasBox(true);
      return;
    }
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
      className={active ? 'ls-diagram is-active' : 'ls-diagram'}
      onPointerDown={() => setEngaged(true)}
      onPointerLeave={() => setEngaged(false)}
    >
      {hasBox ? (
        <IsometricDiagram
          animateConnectors={animate}
          config={config as unknown as StacktapeConfig}
          ariaLabel={ariaLabel}
          style={{ width: '100%', height: '100%' }}
        />
      ) : null}
      <span className="ls-diagram__gate" aria-hidden="true">
        {active ? 'Scroll to zoom · drag to pan' : 'Click to zoom and pan'}
      </span>
    </div>
  );
}
