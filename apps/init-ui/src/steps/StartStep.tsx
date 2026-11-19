import { Button } from '@stacktape/ui-react/button';
import { Select, type SelectOption } from '@stacktape/ui-react/select';
import { Tabs } from '@stacktape/ui-react/tabs';
import { useState } from 'react';
import { BiCloudUpload, BiFileBlank, BiSearchAlt } from 'react-icons/bi';
import { InfoTip } from '../components/InfoTip';
import type { WizardAgentOption, WizardState } from '../session';

/**
 * The first screen: what is about to happen, in three facts, and one button.
 *
 * The facts answer what a first-time user worries about, in this order: who reads my code, what changes in my project,
 * when AWS starts costing money. Each is one line; the detail is behind its help mark. Which agent and model read the
 * project is a good default shown in one line, with the choice behind "Change".
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
  const usesAi = agent !== undefined && agent.id !== 'none';
  const modelLabel =
    chosenModel === 'default'
      ? 'your default model'
      : (models.find((model) => model.id === chosenModel)?.label ?? chosenModel);
  const where = state.repositoryPath === undefined ? '' : ` in ${state.repositoryPath}`;

  return (
    <div className="w-start w-enter">
      <h1 className="w-title">Deploy {state.projectName} to AWS</h1>
      <p className="w-lede">Stacktape reads your code and shows what it needs on AWS, and what that costs.</p>

      <ul className="w-card w-facts">
        <li className="w-fact">
          <BiSearchAlt aria-hidden size={18} />
          <p className="w-fact-text">
            {usesAi ? `${agent.label} reads your code, read-only` : 'Stacktape reads your manifests, without AI'}
            <InfoTip about="who reads the code">
              {usesAi
                ? `It runs on this machine${where}, under your own ${agent.label} plan. Stacktape never receives your code.`
                : `Only manifests, Dockerfiles and config files${where} are read. Nothing leaves this machine.`}
            </InfoTip>
          </p>
        </li>
        <li className="w-fact">
          <BiFileBlank aria-hidden size={18} />
          <p className="w-fact-text">
            You review the setup, then <span className="w-code">stacktape.yml</span> is saved
            <InfoTip about="what gets saved">
              {state.existingConfig === undefined
                ? 'One new file in this folder. Nothing else in your project changes.'
                : `A new file beside your ${state.existingConfig}, which stays as it is. Nothing else changes.`}
            </InfoTip>
          </p>
        </li>
        <li className="w-fact">
          <BiCloudUpload aria-hidden size={18} />
          <p className="w-fact-text">
            Nothing is created on AWS until you click Deploy
            <InfoTip about="AWS and accounts">
              No Stacktape account needed. The deploy uses the AWS credentials on this machine, in your own AWS account.
            </InfoTip>
          </p>
        </li>
      </ul>

      <div className="w-start-actions">
        <Button className="w-big" isLoading={isBusy} onClick={() => onStart(agentId, chosenModel)} variant="primary">
          Analyze my project
        </Button>
        <span className="w-subtle w-small">{usesAi ? 'Usually under a minute' : 'Takes a few seconds'}</span>
      </div>

      {agents.length > 1 && (
        <>
          <p className="w-reader">
            <span>
              {usesAi ? `${agent.label} · ${modelLabel}` : 'No AI: manifests and config files only'}
              {agent?.version === undefined ? '' : ` · ${versionLabel(agent.version)}`}
            </span>
            <button
              aria-expanded={showOptions}
              className="w-link"
              onClick={() => setShowOptions(!showOptions)}
              type="button"
            >
              {showOptions ? 'Done' : 'Change'}
            </button>
          </p>
          {showOptions && (
            <div className="w-card w-reader-options w-enter">
              <div>
                <p className="w-field-label">
                  What reads the project
                  {agent?.description !== undefined && <InfoTip about="this reader">{agent.description}</InfoTip>}
                </p>
                <Tabs
                  appearance="segmented"
                  ariaLabel="What reads the project"
                  onValueChange={(value) => {
                    setAgentId(value);
                    setModelId('default');
                  }}
                  tabs={agents.map((option) => ({
                    value: option.id,
                    label: option.id === 'none' ? 'No AI' : option.label
                  }))}
                  value={agentId}
                  width="fit"
                />
              </div>
              {models.length > 1 && (
                <div className="max-w-[360px]">
                  <Select
                    label="Model"
                    name="model"
                    onChange={(selected) => {
                      if (selected !== null && !Array.isArray(selected)) {
                        setModelId((selected as SelectOption<string>).value);
                      }
                    }}
                    options={models.map((model) => ({ value: model.id, label: model.label }))}
                    reserveMessageSpace={false}
                    value={
                      models
                        .map((model) => ({ value: model.id, label: model.label }))
                        .find((option) => option.value === chosenModel) ?? null
                    }
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      <p className="w-footnote">
        Sends anonymous usage statistics, never code or names. <span className="w-code">STP_DISABLE_TELEMETRY=1</span>{' '}
        turns them off.
      </p>
    </div>
  );
}

/** "2.1.296 (Claude Code)" and "codex-cli 0.98.0" are what the agents print; the line already names the agent. */
export const versionLabel = (version: string): string => {
  const number = /\d+\.\d+(?:\.\d+)?/.exec(version)?.[0];
  return number === undefined ? version : `v${number}`;
};
