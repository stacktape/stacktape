/*
 * The architecture half of the Review screen: the isometric diagram of the example project.
 *
 * Rendered with `client:only="react"` because the icon pack behind the diagram is CommonJS that
 * Node's ESM interop cannot prerender; the host reserves the height. The connector animation
 * follows the reader's reduced-motion setting, and the host gates wheel zoom behind a click so the
 * diagram never traps page scrolling.
 */
import type { StacktapeConfig } from '@stacktape/config';
import { IsometricDiagram } from '@stacktape/ui-react/isometric-diagram';
import { useEffect, useState } from 'react';
import '@stacktape/ui-react/isometric-diagram.css';

export type ReviewDiagramProps = {
  /** The parsed configuration, crossing the island boundary as JSON. */
  config: Record<string, unknown>;
};

export default function ReviewDiagram({ config }: ReviewDiagramProps) {
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setAnimate(!query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  return (
    <IsometricDiagram
      animateConnectors={animate}
      ariaLabel="Isometric diagram of the AWS architecture Stacktape builds for acme-project: a Next.js site, an API service on Fargate behind a load balancer and firewall, a worker function, an Aurora PostgreSQL database and a Redis cache inside a private network"
      config={config as unknown as StacktapeConfig}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
