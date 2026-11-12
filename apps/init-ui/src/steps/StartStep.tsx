import { useState } from 'react';
import { Button } from '@stacktape/ui-react/button';
import { SelectionCard, SelectionCardGroup } from '@stacktape/ui-react/selection-card';
import type { WizardAgentOption, WizardState } from '../session';

/**
 * The first screen, under the path that already says what each step does: one button, and what it costs to press.
 *
 * The three things a first-time user needs to know are on the path: nothing leaves my machine, nothing is created or
 * billed yet, and I get a file I can read. Here is only how the reading happens. The agent choice is an implementation
 * detail with a good default, so it sits behind a disclosure: someone who has never seen this tool should not have to
 * hold "which AI reads my code, with which model" before pressing the only button on the page.
 */
export function StartStep({
  state,
  onStart,
  isBusy
}: {
  state: WizardState;
  onStart: (agentId: string, modelId: string) => void;
  isBusy: boolean;
}) {
  const agents = state.agents ?? [];
  const [showOptions, setShowOptions] = useState(false);
  const [agentId, setAgentId] = useState<string>(
    agents.find((agent) => agent.recommended)?.id ?? agents[0]?.id ?? 'none'
  );
  const [modelId, setModelId] = useState<string>('default');

  const agent: WizardAgentOption | undefined = agents.find((option) => option.id === agentId);
  const models = agent?.models ?? [];
  const chosenModel = models.some((model) => model.id === modelId) ? modelId : 'default';
  const withAgent = agent !== undefined && agent.id !== 'none';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button isLoading={isBusy} onClick={() => onStart(agentId, chosenModel)} variant="primary">
            Analyze my project
          </Button>
          <span className="text-[var(--stp-text-subtle)]">
            {withAgent ? `Usually under a minute, on your own ${agent.label} plan.` : 'Takes a second.'}
          </span>
        </div>
        <p className="wizard-fine-print">
          {withAgent
            ? `Your own ${agent.label} reads the project with read-only tools, under the account you already have with it. It cannot run scripts or install anything.`
            : 'The built-in scanner reads your manifests and config files. Nothing goes to Stacktape or to any AI provider, and no account is needed.'}{' '}
          {agents.length > 1 && (
            <button
              aria-expanded={showOptions}
              className="wizard-disclosure"
              onClick={() => setShowOptions(!showOptions)}
              type="button"
            >
              {showOptions ? 'Hide the options' : 'Change how it reads'}
            </button>
          )}
        </p>
      </div>

      {agents.length > 1 && showOptions && (
        <div className="flex flex-col gap-5">
          <div>
            <p className="wizard-group-label">Which agent reads the project</p>
            <SelectionCardGroup
              ariaLabel="Which agent reads the project"
              direction="column"
              onValueChange={(value) => {
                setAgentId(value);
                setModelId('default');
              }}
              value={agentId}
              values={agents.map((option) => option.id)}
            >
              {agents.map((option) => (
                <SelectionCard
                  description={option.description}
                  isRecommended={option.recommended === true}
                  isSelected={option.id === agentId}
                  key={option.id}
                  onSelect={(value) => {
                    setAgentId(value);
                    setModelId('default');
                  }}
                  title={option.label}
                  value={option.id}
                  {...(option.version === undefined ? {} : { meta: versionLabel(option.version) })}
                />
              ))}
            </SelectionCardGroup>
          </div>

          {models.length > 1 && (
            <div>
              <p className="wizard-group-label">Which model it uses</p>
              <SelectionCardGroup
                ariaLabel="Which model the agent uses"
                className="wizard-model-cards"
                direction="row"
                onValueChange={setModelId}
                value={chosenModel}
                values={models.map((model) => model.id)}
              >
                {models.map((model) => (
                  <SelectionCard
                    description={model.description}
                    isSelected={model.id === chosenModel}
                    key={model.id}
                    onSelect={setModelId}
                    title={model.label}
                    value={model.id}
                  />
                ))}
              </SelectionCardGroup>
            </div>
          )}
        </div>
      )}

      <p className="wizard-fine-print">
        Anonymous outcome statistics are recorded (which frameworks were found, whether the deploy worked), never your
        code, names or files. <span className="wizard-code">STP_DISABLE_TELEMETRY=1</span> turns that off.
      </p>
    </div>
  );
}

/** "2.1.296 (Claude Code)" and "codex-cli 0.98.0" are what the agents print; the card already names the agent. */
export const versionLabel = (version: string): string => {
  const number = /\d+\.\d+(?:\.\d+)?/.exec(version)?.[0];
  return number === undefined ? version : `v${number}`;
};
