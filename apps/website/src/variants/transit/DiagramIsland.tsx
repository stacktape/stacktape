import type { StacktapeConfig } from '@stacktape/config';
import { IsometricDiagram } from '@stacktape/ui-react/isometric-diagram';
import { useState } from 'react';
import { ACME_CONFIG } from './data';
import '@stacktape/ui-react/isometric-diagram.css';

/**
 * The real architecture diagram, drawn from the example config.
 *
 * The renderer zooms on the wheel and prevents the page from scrolling over it. On a marketing page
 * that traps the reader, so wheel events are stopped in the capture phase until the visitor opts in;
 * hover explanations work either way.
 */
export function DiagramIsland() {
  const [interactive, setInteractive] = useState(false);

  return (
    <div
      className={interactive ? 'tr-diagram is-interactive' : 'tr-diagram'}
      onWheelCapture={(event) => {
        if (!interactive) event.stopPropagation();
      }}
    >
      <IsometricDiagram
        config={ACME_CONFIG as unknown as StacktapeConfig}
        ariaLabel="Architecture diagram of acme-project: CloudFront in front of the Next.js web and the apiService, worker Lambda, Aurora PostgreSQL and Redis inside a private VPC"
        style={{ width: '100%', height: '100%' }}
      />
      <button
        className="tr-diagram__gate"
        type="button"
        aria-pressed={interactive}
        onClick={() => setInteractive((value) => !value)}
      >
        {interactive ? 'Zoom on · click to release' : 'Click to zoom and pan'}
      </button>
    </div>
  );
}
