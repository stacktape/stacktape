import type { StacktapeConfig } from '@stacktape/config';
import type { ReactNode } from 'react';
import type { DiagramViewProps } from './IsoRenderer.js';
import type { IsoScene } from './scene.js';
import type { SecurityModelInput, SecurityModelStacktapeResource } from './security-groups.js';
import type { DiagramOverlay, DiagramOverlays, DiagramView } from './views.js';
import { useCallback, useMemo, useState } from 'react';
import { IsoRenderer } from './IsoRenderer.js';
import { buildDiagramModel, diagramFrame, selectDiagramView } from './scene-builder.js';
import { buildSecurityGroupModel } from './security-groups.js';
import { ViewControls } from './ViewControls.js';
import { DIAGRAM_OVERLAYS, DIAGRAM_VIEWS, isDiagramView, VIEW_PRESETS } from './views.js';

export type { DiagramOverlay, DiagramOverlays, DiagramView } from './views.js';

/**
 * What the Security view needs from a deployed stage: its CloudFormation template and which Stacktape resource owns
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
  /** The view to show, for a host that keeps it (for example in the URL). Pair it with `onViewChange`. */
  view?: DiagramView | undefined;
  /** The view an uncontrolled diagram opens in. Application unless set. */
  defaultView?: DiagramView | undefined;
  /** Called when the reader picks a view. Customizing overlays keeps the view it started from. */
  onViewChange?: ((view: DiagramView) => void) | undefined;
  /** The views the switcher offers, in order. With one, the diagram shows no view controls. */
  views?: readonly DiagramView[] | undefined;
  /**
   * The deployed stage, for the Security view's security groups. Untrusted: anything unreadable is skipped. Without it
   * the Security view shows firewalls, authorizers, public data stores and `connectTo` access, with a note: omit it
   * where there is no deployed stage, and pass `null` for a deployed stage whose template could not be read.
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

function SecurityNotice({ state }: { state: 'no-deployment' | 'unreadable' | 'no-groups' | 'groups' }) {
  if (state === 'unreadable') {
    return (
      <p>
        The deployed template could not be read, so security groups are not shown. This view shows firewalls,
        authorizers, public data stores and the IAM access <code>connectTo</code> grants.
      </p>
    );
  }
  if (state === 'no-deployment') {
    return (
      <p>
        Security groups appear for deployed stages. This view shows firewalls, authorizers, public data stores and the
        IAM access <code>connectTo</code> grants.
      </p>
    );
  }
  if (state === 'no-groups') return <p>This stage has no security groups: nothing in it runs in a VPC.</p>;
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
 * The picture is laid out once and each view (Application, Network, Security, or a custom set of overlays) shows part
 * of it, so switching views moves nothing. Functions and batch jobs that play the same role are drawn as one group
 * until the reader expands it. Clicking a node opens a side panel with its connections; pass `onOpenResource` to offer
 * opening a declared resource in the host, and `deployment` to draw a deployed stage's security groups. Pass
 * `statuses` to show what a deployed stage reports about its resources, in every view: a pill under the name, a ring
 * in the worst tone, a group's summary and every status with its link in the panel.
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
  view,
  defaultView,
  onViewChange,
  views = DIAGRAM_VIEWS,
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

  const offered = useMemo(() => {
    const valid = views.filter(isDiagramView);
    return valid.length > 0 ? valid : DIAGRAM_VIEWS;
  }, [views]);
  const firstView = offered.includes('application') ? 'application' : offered[0];
  const [uncontrolledView, setUncontrolledView] = useState<DiagramView>(() =>
    defaultView && offered.includes(defaultView) ? defaultView : firstView
  );
  const requested = view ?? uncontrolledView;
  const activeView = isDiagramView(requested) && offered.includes(requested) ? requested : firstView;
  const [overlays, setOverlays] = useState<DiagramOverlays>(() => VIEW_PRESETS[activeView]);
  // A view that changes from outside (the host's URL, the back button) starts from its preset. A view the reader picks
  // shows at once, before a host that keeps it has passed it back.
  const [shownView, setShownView] = useState<DiagramView>(activeView);
  if (shownView !== activeView) {
    setShownView(activeView);
    setOverlays(VIEW_PRESETS[activeView]);
  }
  const selectView = useCallback(
    (next: DiagramView) => {
      setUncontrolledView(next);
      setOverlays(VIEW_PRESETS[next]);
      onViewChange?.(next);
    },
    [onViewChange]
  );
  const toggleOverlay = useCallback((overlay: DiagramOverlay) => {
    setOverlays((current) => ({ ...current, [overlay]: !current[overlay] }));
  }, []);

  const model = useMemo(
    () => buildDiagramModel({ parsedConfig: config, expandedGroups, statusLines }),
    [config, expandedGroups, statusLines]
  );
  const security = useMemo(() => {
    const input = readDiagramDeployment(deployment);
    return input ? buildSecurityGroupModel(input) : null;
  }, [deployment]);
  const frame = useMemo(() => (model ? diagramFrame({ model, security }) : undefined), [model, security]);
  const scene: IsoScene | null = useMemo(
    () => (model ? { ...selectDiagramView({ model, overlays, security }), frame } : null),
    [model, overlays, security, frame]
  );

  if (!scene || scene.nodes.length === 0) {
    if (emptyState === null) return null;

    return (
      <div className={className ? `stp-diagram-empty ${className}` : 'stp-diagram-empty'} style={style}>
        {emptyState === undefined ? <p>{DEFAULT_EMPTY_MESSAGE}</p> : emptyState}
      </div>
    );
  }

  const offersSecurity = offered.includes('security');
  const overlayChoices = DIAGRAM_OVERLAYS.filter((overlay) => overlay !== 'securityGroups' || offersSecurity);
  const showControls = offered.length > 1;
  const securityState = security
    ? security.groups.length === 0
      ? 'no-groups'
      : 'groups'
    : deployment === undefined
      ? 'no-deployment'
      : 'unreadable';

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
        showControls ? (
          <ViewControls
            views={offered}
            overlayChoices={overlayChoices}
            overlays={overlays}
            onSelectView={selectView}
            onToggleOverlay={toggleOverlay}
            overlayNotes={
              security
                ? undefined
                : { securityGroups: deployment === undefined ? 'deployed stages only' : 'template unavailable' }
            }
          />
        ) : undefined
      }
      viewNote={overlays.securityGroups && offersSecurity ? <SecurityNotice state={securityState} /> : undefined}
    />
  );
}
