/*
 * The picture half of the Review screen: the isometric diagram of the example app.
 *
 * Rendered with `client:only="react"` because the icon pack behind the diagram is CommonJS that
 * cannot prerender; the host reserves the height. Wheel zoom is gated behind a click so the diagram
 * never traps the page's scrolling: until the visitor clicks it, wheel events are stopped in the
 * capture phase before the renderer's own (non-passive) listener sees them, and the page scrolls.
 */
import type { StacktapeConfig } from '@stacktape/config';
import { IsometricDiagram } from '@stacktape/ui-react/isometric-diagram';
import { useEffect, useRef, useState } from 'react';
import '@stacktape/ui-react/isometric-diagram.css';

export default function ReviewDiagram({ config }: { config: unknown }) {
  const host = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (!live) event.stopPropagation();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (live && !element.contains(event.target as Node)) setLive(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLive(false);
    };
    element.addEventListener('wheel', onWheel, { capture: true, passive: true });
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      element.removeEventListener('wheel', onWheel, { capture: true });
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [live]);

  return (
    <div className={live ? 'cs-diagram is-live' : 'cs-diagram'} onPointerDown={() => setLive(true)} ref={host}>
      <IsometricDiagram
        ariaLabel="Isometric diagram of the AWS architecture Stacktape builds for acme-project: a Next.js web, a Fargate API, a Lambda worker, an Aurora PostgreSQL database and a Redis cache inside a private network, behind a web application firewall"
        config={config as StacktapeConfig}
        style={{ width: '100%', height: '100%' }}
      />
      <span aria-hidden="true" className="cs-diagram__gate">
        {live ? 'Scroll to zoom · drag to pan · Esc to release' : 'Click to zoom and pan'}
      </span>
    </div>
  );
}
