import { Tabs } from '@stacktape/ui-react/tabs';
import { useState } from 'react';
import { PICKER_OPTIONS } from './data';
import { GatedDiagram } from './GatedDiagram';

const TABS = PICKER_OPTIONS.map((option) => ({ value: option.id, label: option.label }));

/**
 * The hero window: pick a repository shape and see the architecture the wizard draws from it.
 *
 * The four configurations are plain objects; the real `IsometricDiagram` lays each one out itself.
 * The diagram is keyed by the option, so switching remounts it with a fresh view and a closed wheel
 * gate. Under the picture, one row: what the wizard decided and how many resources it would create.
 */
export function HeroWindow() {
  const [selected, setSelected] = useState<string>(PICKER_OPTIONS[0]!.id);
  const option = PICKER_OPTIONS.find((candidate) => candidate.id === selected) ?? PICKER_OPTIONS[0]!;
  const resourceCount = Object.keys(option.config.resources ?? {}).length;

  return (
    <div className="zz-hw">
      <div className="zz-hw__bar">
        <span className="zz-hw__title">Your app, drawn before it exists</span>
        <span className="zz-hw__meta">read from your repository in {option.seconds} s</span>
      </div>

      <div className="zz-hw__picker">
        <Tabs
          appearance="segmented"
          ariaLabel="Example repository"
          className="zz-hw__tabs"
          onValueChange={setSelected}
          size="small"
          tabs={TABS}
          value={selected}
          width="fit"
        />
      </div>

      <div className="zz-hw__diagram">
        <GatedDiagram key={option.id} ariaLabel={`Architecture diagram. ${option.summary}`} config={option.config} />
      </div>

      <div className="zz-hw__foot">
        <span className="zz-hw__lead">Decided for you:</span>
        <ul className="zz-hw__chips" aria-label="Decisions the wizard made">
          {option.decisions.slice(0, 3).map((decision) => (
            <li className="zz-chip" key={decision}>
              {decision}
            </li>
          ))}
        </ul>
        <span className="zz-hw__count">
          {resourceCount} resources <span aria-hidden="true">·</span> nothing is created until you deploy
        </span>
      </div>
    </div>
  );
}
