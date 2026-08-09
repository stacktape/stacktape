import type { StacktapeConfig } from '@stacktape/config';
import type { ReactNode } from 'react';
import type { DiagramViewProps } from './IsoRenderer.js';
import type { IsoScene } from './scene.js';
import { useMemo } from 'react';
import { IsoRenderer } from './IsoRenderer.js';
import { buildIsometricScene } from './scene-builder.js';

export type IsometricDiagramProps = DiagramViewProps & {
  /**
   * A parsed, normalized Stacktape configuration, or `null` when the host has nothing to show yet.
   *
   * The host owns parsing. This component never reads editor source, and never mutates what it is
   * given: the configuration is only ever read while the scene is derived.
   */
  config: StacktapeConfig | null;
  /**
   * What to show when the configuration declares nothing the diagram can draw.
   *
   * Omit it for the default message. Pass `null` to render nothing at all — a host that is still
   * compiling usually prefers a blank area to a message that is about to be wrong.
   */
  emptyState?: ReactNode;
};

const DEFAULT_EMPTY_MESSAGE = 'No resources to display. Add resources to your config to see the diagram.';

/**
 * A semantic picture of the infrastructure Stacktape will synthesize from a configuration.
 *
 * It is an explanation, not a drawing of the authored object: implicit resources Stacktape creates
 * for you — ingresses, NAT gateways, the Lambda behind a batch job — appear alongside the ones the
 * configuration names, and the edges describe real synthesized relationships.
 *
 * The pipeline behind it is one-way, and each stage is worth keeping separate:
 *
 *     StacktapeConfig → topology.ts → scene-builder.ts → IsoScene → IsoRenderer.tsx
 *
 * Load `@stacktape/ui-react/isometric-diagram.css` alongside this component. Import it from the
 * same module the host lazy-loads, so the stylesheet and the icon data travel in the same chunk.
 */
export function IsometricDiagram({
  config,
  emptyState,
  animateConnectors,
  ariaLabel,
  className,
  style
}: IsometricDiagramProps) {
  const scene: IsoScene | null = useMemo(() => buildIsometricScene({ parsedConfig: config }), [config]);

  if (!scene || scene.nodes.length === 0) {
    if (emptyState === null) return null;

    return (
      <div className={className ? `stp-diagram-empty ${className}` : 'stp-diagram-empty'} style={style}>
        {emptyState === undefined ? <p>{DEFAULT_EMPTY_MESSAGE}</p> : emptyState}
      </div>
    );
  }

  return (
    <IsoRenderer
      animateConnectors={animateConnectors}
      ariaLabel={ariaLabel}
      className={className}
      scene={scene}
      style={style}
    />
  );
}
