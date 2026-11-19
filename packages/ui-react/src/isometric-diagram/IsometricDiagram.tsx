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
import { AccessIcon } from './node-shapes.js';
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
   * How the layers share one layout.
   *
   * - `every-layer` (the default) lays the picture out once with room for every layer, so switching a layer neither
   *   moves nor rescales anything. Without the Infrastructure layer, the picture keeps the room its nodes and zones
   *   would take.
   * - `shown-layers` lays out and fits only what the shown layers draw. The application picture is then as compact as
   *   it can be, and switching the Infrastructure layer rearranges the picture. Meant for a small frame whose
   *   application picture is much smaller than the full one, like the init wizard's review of a new app; it matches
   *   what a diagram without layer switches draws.
   */
  layout?: 'every-layer' | 'shown-layers' | undefined;
  /**
   * The deployed stage, for the Access layer's tags. Untrusted: anything unreadable is skipped. Omit it
   * where there is no deployed stage, and the Access layer is not offered. Pass `null` for a deployed stage whose
   * template could not be read, and the layer is offered disabled, saying so.
   */
  deployment?: DiagramDeployment | null | undefined;
  /**
   * The host's own words for what a declared resource is, by its name, in place of the type line under its name: an
   * EFS file system the host knows holds SQLite data can say "SQLite data". Resources it does not name keep the
   * diagram's words.
   */
  resourceTypeLabels?: Readonly<Record<string, string>> | undefined;
  /**
   * Draws a connector from a resource to each EFS file system it mounts. Off by default: Console's Viewer projection
   * does not carry `volumeMounts` yet, and a Viewer's picture must match everyone else's.
   */
  volumeMounts?: boolean | undefined;
};

/** A name's size at the picture's own scale, and the most `minLabelSize` enlarges text. */
const BASE_NAME_PX = 12;
const MAX_TEXT_SCALE = 1.7;

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

/** Exposed resources the Access layer's note names before it counts the rest. */
const MAX_NAMED_EXPOSED = 3;

const nameSome = (names: string[]) => {
  const more = names.length - MAX_NAMED_EXPOSED;
  return `${names.slice(0, MAX_NAMED_EXPOSED).join(', ')}${more > 0 ? ` and ${more} more` : ''}`;
};

const LegendIcon = ({ reach }: { reach: 'public' | 'limited' }) => (
  <svg className="stp-diagram__note-icon" width={12} height={12} viewBox="-6 -6 12 12" aria-hidden>
    <AccessIcon reach={reach} x={0} y={0} color="currentColor" />
  </svg>
);

/**
 * The Access layer's verdict for the whole stage, led by what a reader must not miss, and what the tags' icons mean.
 * The verdict is only about what security groups show: a database outside the VPC has none.
 */
function AccessNote({ exposed, unknown }: { exposed: string[]; unknown: string[] }) {
  return (
    <>
      <p data-diagram-note="verdict">
        {exposed.length > 0 ? (
          <>
            <strong className="stp-diagram__note-alert">Open to the internet:</strong> {nameSome(exposed)}.
          </>
        ) : unknown.length > 0 ? (
          <>
            <strong>Access unknown:</strong> {nameSome(unknown)}. The deployed template does not say who can connect.
          </>
        ) : (
          <strong className="stp-diagram__note-ok">
            No security group opens a data store or an admin port to the internet.
          </strong>
        )}{' '}
        Click a resource for its ports and rules.
      </p>
      <p className="stp-diagram__note-legend" data-diagram-note="legend">
        <span>
          <LegendIcon reach="public" /> the internet can reach it
        </span>
        <span>
          <LegendIcon reach="limited" /> the internet cannot
        </span>
        <span>no tag: not decided by a security group</span>
      </p>
    </>
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
 * `deployment` for the Access layer's tags. Pass `statuses` to show what a deployed stage reports about its
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
  onSelectResource,
  selectedResource,
  resourceProgress,
  hint,
  minLabelSize,
  resourceTooltip,
  onHoverResource,
  focusDimming,
  resourceTypeLabels,
  volumeMounts = false,
  layers,
  defaultLayers,
  onLayersChange,
  layerChoices = DIAGRAM_LAYERS,
  layout = 'every-layer',
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
  // A host that asks for a minimum label size gets names, type lines and chips set larger when the picture is scaled
  // down to fit, and a layout with room for them. Laying it out again with larger text makes the picture larger, so the
  // scale settles in a step or two; small changes are ignored so it does not hunt.
  const [textScale, setTextScale] = useState(1);
  const onFitScale = useCallback(
    (fit: number) => {
      if (minLabelSize === undefined) return;
      setTextScale((current) => {
        // Names are drawn at BASE_NAME_PX × scale × fit on screen.
        const wanted = Math.max(1, Math.min(MAX_TEXT_SCALE, minLabelSize / (BASE_NAME_PX * fit)));
        return Math.abs(wanted - current) < 0.04 ? current : Math.round(wanted * 100) / 100;
      });
    },
    [minLabelSize]
  );
  const scale = minLabelSize === undefined ? 1 : textScale;

  // The diagram keeps its own copy of the layers. A layer the reader switches shows at once, before a host that keeps
  // the layers has passed them back; layers that change from outside (the host's URL, the back button) replace it.
  const [requested, setRequested] = useState<DiagramLayers>(() => layers ?? defaultLayers ?? NO_LAYERS);
  const hostLayers = layers ? `${layers.infrastructure === true}|${layers.access === true}` : undefined;
  const [seenHostLayers, setSeenHostLayers] = useState(hostLayers);
  if (hostLayers !== seenHostLayers) {
    setSeenHostLayers(hostLayers);
    if (layers) setRequested(layers);
  }
  const wantsInfrastructure = requested.infrastructure === true;
  const wantsAccess = requested.access === true;

  // Without an Infrastructure switch, the application picture is laid out on its own: no room is kept for nodes,
  // zones and badges that only that layer draws. A host that asks for `shown-layers` gets that picture whenever the
  // layer is off, and the full one when it is on.
  const offersInfrastructure = layerChoices.includes('infrastructure');
  const fullModel = useMemo(
    () =>
      offersInfrastructure
        ? buildDiagramModel({
            parsedConfig: config,
            expandedGroups,
            statusLines,
            infrastructure: true,
            textScale: scale,
            volumeMounts
          })
        : null,
    [config, expandedGroups, statusLines, offersInfrastructure, scale, volumeMounts]
  );
  const security = useMemo(() => {
    const input = readDiagramDeployment(deployment);
    return input ? buildSecurityGroupModel(input) : null;
  }, [deployment]);
  // A layer shows only where the stage has something for it: a stack of functions and tables has no infrastructure to
  // add, and one with nothing in a VPC has no security groups.
  const canShowInfrastructure = useMemo(() => Boolean(fullModel && hasInfrastructure(fullModel)), [fullModel]);
  const canShowAccess = Boolean(security && security.groups.length > 0);
  const showInfrastructure = wantsInfrastructure && canShowInfrastructure;
  const needsApplicationModel = !fullModel || (layout === 'shown-layers' && !showInfrastructure);
  const applicationModel = useMemo(
    () =>
      needsApplicationModel
        ? buildDiagramModel({
            parsedConfig: config,
            expandedGroups,
            statusLines,
            infrastructure: false,
            textScale: scale,
            volumeMounts
          })
        : null,
    [config, expandedGroups, statusLines, needsApplicationModel, scale, volumeMounts]
  );
  const model = needsApplicationModel ? applicationModel : fullModel;
  const showAccess = wantsAccess && canShowAccess;
  // A switch starts from what is shown, not from what was asked for: a layer the host requested but the stage has
  // nothing for is dropped on the next switch, so the host's copy (Console's URL) matches the checkboxes again.
  const toggleLayer = useCallback(
    (layer: DiagramLayer) => {
      const next: DiagramLayers = {
        infrastructure: layer === 'infrastructure' ? !showInfrastructure : showInfrastructure,
        access: layer === 'access' ? !showAccess : showAccess
      };
      setRequested(next);
      onLayersChange?.(next);
    },
    [showInfrastructure, showAccess, onLayersChange]
  );
  const frame = useMemo(() => (model ? diagramFrame({ model, security }) : undefined), [model, security]);
  const scene: IsoScene | null = useMemo(() => {
    if (!model) return null;
    const view = selectDiagramView({
      model,
      layers: { infrastructure: showInfrastructure, access: showAccess },
      security
    });
    const nodes = resourceTypeLabels
      ? view.nodes.map((node) =>
          !node.isImplicit && !node.memberCount && resourceTypeLabels[node.id]
            ? { ...node, typeLabel: resourceTypeLabels[node.id] }
            : node
        )
      : view.nodes;
    return { ...view, nodes, frame };
  }, [model, showInfrastructure, showAccess, security, frame, resourceTypeLabels]);

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
      onSelectResource={onSelectResource}
      selectedResource={selectedResource}
      resourceProgress={resourceProgress}
      hint={hint}
      labelScale={scale}
      onFitScale={minLabelSize === undefined ? undefined : onFitScale}
      resourceTooltip={resourceTooltip}
      onHoverResource={onHoverResource}
      focusDimming={focusDimming}
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
      viewNote={
        showAccess ? (
          <AccessNote
            exposed={scene.nodes.filter((node) => node.access?.reach === 'exposed').map((node) => node.label)}
            unknown={scene.nodes.filter((node) => node.access?.reach === 'unknown').map((node) => node.label)}
          />
        ) : undefined
      }
    />
  );
}
