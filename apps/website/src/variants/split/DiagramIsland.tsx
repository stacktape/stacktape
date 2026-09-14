import type { StacktapeConfig } from '@stacktape/config';
import { IsometricDiagram } from '@stacktape/ui-react/isometric-diagram';
import '@stacktape/ui-react/isometric-diagram.css';

/** The real architecture diagram, fed the example configuration as a plain object. */
export default function DiagramIsland({ config }: { config: Record<string, unknown> }) {
  return (
    <IsometricDiagram
      config={config as unknown as StacktapeConfig}
      ariaLabel="Architecture diagram of acme-project: web and apiService are public behind the firewall; worker, cache and mainDatabase are private inside the VPC"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
