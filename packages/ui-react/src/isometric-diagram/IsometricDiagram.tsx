import type { StacktapeConfig } from '@stacktape/config';
import type { ReactNode } from 'react';
import type { DiagramViewProps } from './IsoRenderer.js';
import type { IsoScene } from './scene.js';
import type { SecurityModelInput, SecurityModelStacktapeResource } from './security-groups.js';
import type { LayerChoice } from './LayerControls.js';
import type { DiagramLayer, DiagramLayers } from './views.js';
import { useCallback, useMemo, useState } from 'react';
import { IsoRenderer } from './IsoRenderer.js';
import { LayerControls } from './LayerControls.js';
import { buildDiagramModel, diagramFrame, selectDiagramView } from './scene-builder.js';
import { buildSecurityGroupModel } from './security-groups.js';
import { DIAGRAM_LAYERS, hasInfrastructure, isDiagramLayer, NO_LAYERS } from './views.js';

export type { DiagramLayer, DiagramLayers } from './views.js';

/**
 * What the Access layer needs from a deployed stage: its CloudFormation template and which Stacktape resource owns
 * each logical ID. Security groups are read from the template, never guessed from the configuration.
 */
export type DiagramDeployment = {
  /** The deployed CloudFormation template, parsed from JSON or YAML. Its `Resources` section is read. */
  template: unknown;
  /** Each Stacktape resource of the stage with the CloudFormation logical IDs it owns. */
  resources: readonly SecurityModelStacktapeResource[];
};

export type { DiagramNotice } from './IsoRenderer.js';
export type { DiagramResourceStatus, DiagramStatuses, DiagramStatusTone } from './status.js';

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
  /** The layers to show, for a host that keeps them (for example in the URL). Pair it with `onLayersChange`. */
  layers?: DiagramLayers | undefined;
  /** The layers an uncontrolled diagram opens with. None unless set: the application alone. */
  defaultLayers?: DiagramLayers | undefined;
  /** Called with every layer's new state when the reader switches one. */
  onLayersChange?: ((layers: DiagramLayers) => void) | undefined;
  /** The layers the reader can switch, in order. With none, the diagram has no layer switches. */
  layerChoices?: readonly DiagramLayer[] | undefined;
  /**
   * The deployed stage, for the Access layer's security groups. Untrusted: anything unreadable is skipped. Omit it
   * where there is no deployed stage, and the Access layer is not offered. Pass `null` for a deployed stage whose
   * template could not be read, and the layer is offered disabled, saying so.
   */
  deployment?: DiagramDeployment | null | undefined;
};

const DEFAULT_EMPTY_MESSAGE = 'No resources to display. Add resources to your config to see the diagram.';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The deployment as the security-group model reads it, or null when it has no readable template. */
export const readDiagramDeployment = (deployment: unknown): SecurityModelInput | null => {
  if (!isRecord(deployment) || !isRecord(deployment.template) || !isRecord(deployment.template.Resources)) return null;
  const resources = Array.isArray(deployment.resources) ? deployment.resources : [];
  return {
    resources: deployment.template.Resources,
    stacktapeResources: resources.flatMap((resource) =>
      isRecord(resource) && typeof resource.name === 'string' && typeof resource.type === 'string'
        ? [
            {
              name: resource.name,
              type: resource.type,
              logicalIds: Array.isArray(resource.logicalIds)
                ? resource.logicalIds.filter((id): id is string => typeof id === 'string')
                : []
            }
          ]
        : []
    )
  };
};

const ACCESS_UNREADABLE = 'The deployed template could not be read, so access rules cannot be shown';

function AccessLegend() {
  return (
    <p>
      <span className="stp-diagram__legend-outline" aria-hidden="true" /> Security group ·{' '}
      <span className="stp-diagram__legend-arrow" aria-hidden="true" /> traffic its rules allow ·{' '}
      <span className="stp-diagram__legend-arrow stp-diagram__legend-arrow--internet" aria-hidden="true" /> open to the
      internet
    </p>
  );
}

/**
 * A semantic picture of the infrastructure Stacktape will synthesize from a configuration.
 *
 * It is an explanation, not a drawing of the authored object: implicit resources Stacktape creates
 * for you — ingresses, NAT gateways, the Lambda behind a batch job — appear alongside the ones the
 * configuration names, and the edges describe real synthesized relationships.
 *
 * The pipeline behind it is one-way, and each stage is worth keeping separate:
 *
 *     StacktapeConfig → topology.ts → grouping.ts → scene-builder.ts (+ layout/) → views.ts → IsoScene → IsoRenderer.tsx
 *
 * The picture is laid out once. It opens on the application alone, and the reader adds the Infrastructure and Access
 * layers to it in any combination, so switching one moves nothing. A layer the stage has nothing for is not offered.
 * Functions and batch jobs that play the same role are drawn as one group until the reader expands it. Clicking a node
 * opens a side panel with its connections; pass `onOpenResource` to offer opening a declared resource in the host, and
 * `deployment` for the Access layer's security groups. Pass `statuses` to show what a deployed stage reports about its
 * resources, whichever layers are on: a pill under the name, a ring in the worst tone, a group's summary and every
 * status with its link in the panel.
 *
 * Load `@stacktape/ui-react/isometric-diagram.css` alongside this component. Import it from the
 * same module the host lazy-loads, so the stylesheet travels in the same chunk.
 */
export function IsometricDiagram({
  config,
  emptyState,
  animateConnectors,
  ariaLabel,
  className,
  style,
  initialZoom,
  onOpenResource,
  canOpenResource,
  statuses,
  onNavigate,
  notices,
  layers,
  defaultLayers,
  onLayersChange,
  layerChoices = DIAGRAM_LAYERS,
  deployment
}: IsometricDiagramProps) {
  // Role groups start collapsed; the reader expands them one by one.
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(() => new Set());
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (!next.delete(groupId)) next.add(groupId);
      return next;
    });
  }, []);
  // A host that passes statuses at all gets room for a status line under every declared resource. The room depends
  // only on that, never on what the statuses say, so a refresh redraws pills and rings without moving a node.
  const statusLines = statuses !== undefined;

  // A layer the reader switches shows at once, before a host that keeps the layers has passed them back.
  const [uncontrolledLayers, setUncontrolledLayers] = useState<DiagramLayers>(() => defaultLayers ?? NO_LAYERS);
  const requested = layers ?? uncontrolledLayers;
  const wantsInfrastructure = requested.infrastructure === true;
  const wantsAccess = requested.access === true;

  const model = useMemo(
    () => buildDiagramModel({ parsedConfig: config, expandedGroups, statusLines }),
    [config, expandedGroups, statusLines]
  );
  const security = useMemo(() => {
    const input = readDiagramDeployment(deployment);
    return input ? buildSecurityGroupModel(input) : null;
  }, [deployment]);
  // A layer shows only where the stage has something for it: a stack of functions and tables has no infrastructure to
  // add, and one with nothing in a VPC has no security groups.
  const canShowInfrastructure = useMemo(() => Boolean(model && hasInfrastructure(model)), [model]);
  const canShowAccess = Boolean(security && security.groups.length > 0);
  const showInfrastructure = wantsInfrastructure && canShowInfrastructure;
  const showAccess = wantsAccess && canShowAccess;
  // A switch starts from what is shown, not from what was asked for: a layer the host requested but the stage has
  // nothing for is dropped on the next switch, so the host's copy (Console's URL) matches the checkboxes again.
  const toggleLayer = useCallback(
    (layer: DiagramLayer) => {
      const next: DiagramLayers = {
        infrastructure: layer === 'infrastructure' ? !showInfrastructure : showInfrastructure,
        access: layer === 'access' ? !showAccess : showAccess
      };
      setUncontrolledLayers(next);
      onLayersChange?.(next);
    },
    [showInfrastructure, showAccess, onLayersChange]
  );
  const frame = useMemo(() => (model ? diagramFrame({ model, security }) : undefined), [model, security]);
  const scene: IsoScene | null = useMemo(
    () =>
      model
        ? {
            ...selectDiagramView({
              model,
              layers: { infrastructure: showInfrastructure, access: showAccess },
              security
            }),
            frame
          }
        : null,
    [model, showInfrastructure, showAccess, security, frame]
  );

  if (!scene || scene.nodes.length === 0) {
    if (emptyState === null) return null;

    return (
      <div className={className ? `stp-diagram-empty ${className}` : 'stp-diagram-empty'} style={style}>
        {emptyState === undefined ? <p>{DEFAULT_EMPTY_MESSAGE}</p> : emptyState}
      </div>
    );
  }

  const choices = layerChoices.filter(isDiagramLayer).flatMap((layer): LayerChoice[] => {
    if (layer === 'infrastructure') return canShowInfrastructure ? [{ layer }] : [];
    // Access is for deployed stages. One whose template could not be read keeps the switch, so it does not vanish.
    if (deployment === undefined) return [];
    if (!security) return [{ layer, unavailable: ACCESS_UNREADABLE }];
    return canShowAccess ? [{ layer }] : [];
  });

  return (
    <IsoRenderer
      animateConnectors={animateConnectors}
      ariaLabel={ariaLabel}
      className={className}
      initialZoom={initialZoom}
      scene={scene}
      style={style}
      onOpenResource={onOpenResource}
      canOpenResource={canOpenResource}
      statuses={statuses}
      onNavigate={onNavigate}
      notices={notices}
      onToggleGroup={toggleGroup}
      toolbar={
        choices.length > 0 ? (
          <LayerControls
            choices={choices}
            layers={{ infrastructure: showInfrastructure, access: showAccess }}
            onToggleLayer={toggleLayer}
          />
        ) : undefined
      }
      viewNote={showAccess ? <AccessLegend /> : undefined}
    />
  );
}
