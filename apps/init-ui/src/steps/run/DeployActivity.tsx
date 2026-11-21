import { Tabs } from '@stacktape/ui-react/tabs';
import { useState } from 'react';
import type { DeployModel } from '../../deploy-model';
import { DeployLog } from './DeployLog';
import { DeploySteps, type RunContext } from './DeploySteps';

export type ActivityView = 'steps' | 'log';

/**
 * One deploy, two ways to read it: the steps (phases, what each did, the AWS resources by part of the app) and the
 * log. The same pair on the Deploying screen, under a live app and under a failure, so a person learns it once.
 */
export function DeployActivity({
  model,
  context,
  live,
  failed = false,
  initialView = 'steps',
  initiallyOpen,
  className
}: {
  model: DeployModel;
  context: RunContext;
  live: boolean;
  failed?: boolean;
  initialView?: ActivityView;
  initiallyOpen?: readonly string[];
  className?: string;
}) {
  const [view, setView] = useState<ActivityView>(initialView);
  const lines = model.log.filter((entry) => entry.kind === 'line').length;
  const count = (level: string) => model.log.filter((entry) => entry.kind === 'line' && entry.level === level).length;
  const errors = count('error');
  const warnings = count('warn');
  // The tab says what is worth opening it for: errors, then warnings, else how much there is.
  const badge =
    errors > 0
      ? `${errors} ${errors === 1 ? 'error' : 'errors'}`
      : warnings > 0
        ? `${warnings} ${warnings === 1 ? 'warning' : 'warnings'}`
        : String(lines);
  return (
    <div className={`r-activity${className === undefined ? '' : ` ${className}`}`} data-view={view}>
      <Tabs
        appearance="underline"
        ariaLabel="Deploy details"
        className="r-activity-tabs"
        onValueChange={setView}
        tabs={[
          { value: 'steps', label: 'Steps', panelId: 'deploy-steps' },
          {
            value: 'log',
            label: 'Log',
            panelId: 'deploy-log',
            suffix: (
              <span className={`r-tab-count${errors > 0 ? ' is-error' : warnings > 0 ? ' is-warn' : ''}`}>{badge}</span>
            )
          }
        ]}
        value={view}
      />
      <div className="r-activity-panel" id={view === 'steps' ? 'deploy-steps' : 'deploy-log'} role="tabpanel">
        {view === 'steps' ? (
          <div className="r-activity-scroll">
            <DeploySteps
              context={context}
              failed={failed}
              live={live}
              model={model}
              {...(initiallyOpen === undefined ? {} : { initiallyOpen })}
            />
          </div>
        ) : (
          <DeployLog failed={failed} live={live} model={model} />
        )}
      </div>
    </div>
  );
}
