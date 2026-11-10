/**
 * The layer switches in the diagram's toolbar: one checkbox per layer the picture can add. A layer the stage has
 * nothing for is not offered at all; one that cannot be drawn right now is offered disabled, with the reason.
 */
import type { DiagramLayer, DiagramLayers } from './views.js';
import { useId } from 'react';
import { DIAGRAM_LAYER_NAMES } from './views.js';

const LAYER_HINTS: Record<DiagramLayer, string> = {
  infrastructure:
    'What Stacktape creates under your configuration: gateways, load balancers, CDNs, the VPC, its subnets and NAT',
  access: 'Who can reach what: the security groups of the deployed stage and the traffic their rules allow'
};

export type LayerChoice = {
  layer: DiagramLayer;
  /** Why the layer cannot be shown right now. The switch is then disabled and says so. */
  unavailable?: string | undefined;
};

export type LayerControlsProps = {
  choices: readonly LayerChoice[];
  layers: DiagramLayers;
  onToggleLayer: (layer: DiagramLayer) => void;
};

export function LayerControls({ choices, layers, onToggleLayer }: LayerControlsProps) {
  const id = useId();
  return (
    <div role="group" aria-label="Show on the diagram" className="stp-diagram__layers">
      <span className="stp-diagram__layers-title" aria-hidden="true">
        Show
      </span>
      {choices.map(({ layer, unavailable }) => {
        const checked = layers[layer] && !unavailable;
        const hint = unavailable ?? LAYER_HINTS[layer];
        return (
          <label
            key={layer}
            className="stp-diagram__layer"
            data-checked={checked || undefined}
            data-disabled={unavailable ? true : undefined}
            title={hint}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={Boolean(unavailable)}
              aria-describedby={`${id}-${layer}`}
              onChange={() => onToggleLayer(layer)}
            />
            <span>{DIAGRAM_LAYER_NAMES[layer]}</span>
            {unavailable && <span className="stp-diagram__layer-note">unavailable</span>}
            <span id={`${id}-${layer}`} hidden>
              {hint}
            </span>
          </label>
        );
      })}
    </div>
  );
}
