/**
 * The view switcher in the diagram's toolbar: one segment per preset and a "Customize" popover with the overlays behind
 * them. Changing an overlay leaves the presets, which the switcher shows as "Custom".
 */
import type { DiagramOverlay, DiagramOverlays, DiagramView } from './views.js';
import { useEffect, useId, useRef, useState } from 'react';
import { BiSliderAlt } from 'react-icons/bi';
import { DIAGRAM_OVERLAY_NAMES, DIAGRAM_VIEW_NAMES, presetOf } from './views.js';

const OVERLAY_HINTS: Record<DiagramOverlay, string> = {
  createdResources: 'Gateways, load balancers and CDNs Stacktape adds',
  network: 'VPC, subnets, NAT and outbound traffic',
  securityGroups: 'Groups and the traffic their rules allow',
  permissions: 'IAM access granted by connectTo',
  labels: 'Ports, routes and event types on connectors'
};

export type ViewControlsProps = {
  views: readonly DiagramView[];
  overlayChoices: readonly DiagramOverlay[];
  overlays: DiagramOverlays;
  onSelectView: (view: DiagramView) => void;
  onToggleOverlay: (overlay: DiagramOverlay) => void;
  /** Added to an overlay's hint, e.g. that security groups need a deployed stage. */
  overlayNotes?: Partial<Record<DiagramOverlay, string>> | undefined;
};

export function ViewControls({
  views,
  overlayChoices,
  overlays,
  onSelectView,
  onToggleOverlay,
  overlayNotes
}: ViewControlsProps) {
  const name = useId();
  const popoverId = useId();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const preset = presetOf(overlays);

  // The popover closes on Escape and on a press anywhere outside it.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Diagram view"
      className="stp-diagram__views"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        event.stopPropagation();
        setOpen(false);
      }}
    >
      {views.length > 1 && (
        <div role="radiogroup" aria-label="View" className="stp-diagram__segments">
          {views.map((view) => (
            <label key={view} className="stp-diagram__segment" data-checked={preset === view || undefined}>
              <input
                type="radio"
                name={name}
                value={view}
                checked={preset === view}
                onChange={() => onSelectView(view)}
              />
              <span>{DIAGRAM_VIEW_NAMES[view]}</span>
            </label>
          ))}
          {!preset && (
            <span className="stp-diagram__segment stp-diagram__segment--custom" data-checked aria-live="polite">
              Custom
            </span>
          )}
        </div>
      )}
      <div className="stp-diagram__customize">
        <button
          type="button"
          className="stp-diagram__chip-button"
          aria-expanded={open}
          aria-controls={popoverId}
          onClick={() => setOpen((current) => !current)}
        >
          <BiSliderAlt aria-hidden="true" size={14} />
          <span>Customize</span>
        </button>
        {open && (
          <div id={popoverId} role="group" aria-labelledby={titleId} className="stp-diagram__popover">
            <p id={titleId} className="stp-diagram__popover-title">
              Show on the diagram
            </p>
            {overlayChoices.map((overlay) => (
              <label key={overlay} className="stp-diagram__option">
                <input type="checkbox" checked={overlays[overlay]} onChange={() => onToggleOverlay(overlay)} />
                <span className="stp-diagram__option-name">{DIAGRAM_OVERLAY_NAMES[overlay]}</span>
                <span className="stp-diagram__option-hint">
                  {OVERLAY_HINTS[overlay]}
                  {overlayNotes?.[overlay] ? ` · ${overlayNotes[overlay]}` : ''}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
