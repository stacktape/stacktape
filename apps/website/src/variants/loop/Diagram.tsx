import '@stacktape/ui-react/isometric-diagram.css';
import type { StacktapeConfig } from '@stacktape/config';
import { IsometricDiagram } from '@stacktape/ui-react/isometric-diagram';
import { ACME_CONFIG } from './acme-config';

const config = ACME_CONFIG as unknown as StacktapeConfig;

/** The real architecture diagram for acme-project, filling whatever box the wizard preview gives it. */
export default function Diagram() {
  return (
    <IsometricDiagram
      config={config}
      ariaLabel="acme-project on AWS: a Next.js web app and a Fargate web service behind a web application firewall, a Lambda worker, an Aurora PostgreSQL database and a Redis cluster inside a private network"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
