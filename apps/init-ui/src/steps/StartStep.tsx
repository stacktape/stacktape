import { useState } from 'react';
import { Button } from '@stacktape/ui-react/button';
import { SelectionCard, SelectionCardGroup } from '@stacktape/ui-react/selection-card';
import type { WizardAgentOption, WizardState } from '../session';

/**
 * The first screen, rebuilt around what a first-time user actually needs to know.
 *
 * Which is three things, in their words: nothing leaves my machine, nothing is created or billed
 * yet, and I get a file I can read. Then one button.
 *
 * Everything else that used to live here moved out or under. The size question moved to the Review
 * step — before seeing what exists and what it costs there is nothing to size. The agent choice is
 * an implementation detail with a good default, so it sits behind a disclosure: someone who has
 * never seen this tool should not have to hold "which AI reads my code, with which model" before
 * pressing the only button on the page.
 */
export function StartStep({
  state,
  onStart,
  isBusy,
  isDone
}: {
  state: WizardState;
  onStart: (agentId: string, modelId: string) => void;
  isBusy: boolean;
  /** Behind the user: the choice is made and the section is a record of it. */
  isDone: boolean;
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

  if (isDone) {
    const chosen = state.agents?.find((option) => option.id === state.choice?.agentId);
    return (
      <p className="wizard-recap">
        Analyzed with <strong>{chosen?.label ?? 'the built-in scanner'}</strong>.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <ol className="wizard-promises">
        <li>
          <strong>Your code stays on this machine.</strong> It is read here
          {agent !== undefined && agent.id !== 'none' ? `, by your own ${agent.label}` : ''} — nothing is uploaded to
          Stacktape, and no account is needed.
        </li>
        <li>
          <strong>Nothing is created and nothing is billed.</strong> The result is one file in your project. AWS only
          comes into it if you press Deploy at the end, and that step says so before it does anything.
        </li>
        <li>
          <strong>You will see everything before you commit to it.</strong> Every piece of infrastructure comes with the
          line of your own code that made us propose it, what it costs per month, and a way to change it.
        </li>
      </ol>

      <p className="m-0 max-w-[var(--wizard-measure)] text-[0.82rem] text-[var(--stp-text-subtle)]">
        We record anonymous outcome statistics — which frameworks were found, whether the deploy worked — never your
        code, names or files. Set <span className="wizard-code">STP_DISABLE_TELEMETRY=1</span> to turn that off.
      </p>

      {state.repositoryPath !== undefined && (
        <p className="m-0 text-[0.9rem] text-[var(--stp-text-muted)]">
          Project to analyze: <span className="wizard-code text-[var(--stp-text-primary)]">{state.repositoryPath}</span>
        </p>
      )}

      <div className="flex items-center gap-4">
        <Button isLoading={isBusy} onClick={() => onStart(agentId, chosenModel)} variant="primary">
          Analyze my project
        </Button>
        <span className="text-[0.9rem] text-[var(--stp-text-subtle)]">
          {agent === undefined || agent.id === 'none' ? 'Takes a second.' : 'Usually under a minute.'}
        </span>
      </div>

      {agents.length > 1 && (
        <div>
          <button className="wizard-disclosure" onClick={() => setShowOptions(!showOptions)} type="button">
            {showOptions ? 'Hide options' : `Options — analyzing with ${agent?.label ?? 'the built-in scanner'}`}
          </button>

          {showOptions && (
            <div className="mt-4 flex flex-col gap-4">
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
                    {...(option.version === undefined ? {} : { meta: option.version })}
                  />
                ))}
              </SelectionCardGroup>

              {models.length > 1 && (
                <SelectionCardGroup
                  ariaLabel="Which model the agent uses"
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
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
