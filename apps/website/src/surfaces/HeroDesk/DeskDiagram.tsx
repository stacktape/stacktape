/*
 * The picture half of the desk: the isometric diagram of whichever project the desk currently shows.
 *
 * It holds every project's parsed configuration and swaps the scene when the page announces a
 * change over `stp-desk:change` (see `desk-events.ts`). The wrapper is keyed by project, so a switch
 * mounts a fresh scene with its own pan and zoom state and replays the entrance animation from
 * `desk.css`.
 *
 * Rendered with `client:only="react"`, like every diagram on the site: the icon pack behind it is
 * CommonJS that Node's ESM interop cannot prerender. The host must reserve the height.
 */
import type { StacktapeConfig } from '@stacktape/config';
import { IsometricDiagram } from '@stacktape/ui-react/isometric-diagram';
import { useEffect, useState } from 'react';
import '@stacktape/ui-react/isometric-diagram.css';
import { DESK_CHANGE_EVENT, type DeskChangeDetail } from './desk-events';

export type DeskDiagramProps = {
  /** Parsed configurations by project id. They cross the island boundary as JSON. */
  configs: Record<string, unknown>;
  /** Labels by project id, for the accessible name of the picture. */
  labels: Record<string, string>;
  initialProject: string;
};

export default function DeskDiagram({ configs, labels, initialProject }: DeskDiagramProps) {
  const [project, setProject] = useState(initialProject);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<DeskChangeDetail>).detail;
      if (detail && detail.project in configs) setProject(detail.project);
    };
    document.addEventListener(DESK_CHANGE_EVENT, onChange);
    return () => document.removeEventListener(DESK_CHANGE_EVENT, onChange);
  }, [configs]);

  const config = configs[project];
  if (config === undefined) return null;

  return (
    <div className="desk-diagram" data-project={project} key={project}>
      <IsometricDiagram
        ariaLabel={`Isometric diagram of the AWS architecture Stacktape builds for ${labels[project] ?? project}`}
        config={config as StacktapeConfig}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
