import { Button } from '@stacktape/ui-react/button';
import { Select, type SelectOption } from '@stacktape/ui-react/select';
import { Tabs } from '@stacktape/ui-react/tabs';
import { Fragment, useState } from 'react';
import { BiCloudUpload, BiFileBlank, BiSearchAlt } from 'react-icons/bi';
import { InfoTip } from '../components/InfoTip';
import type { WizardAgentOption, WizardState } from '../session';

/**
 * A project name with places to wrap after its separators: `acme-customer-portal` breaks after a dash, as a person
 * would hyphenate it, and the heading keeps one size for every name.
 */
export const wrappableName = (name: string): string[] => name.split(/(?<=[-_./])/);

/**
 * The first screen: what is about to happen, in three facts, and one button.
 *
 * The facts answer what a first-time user worries about, in this order: who reads my code, what changes in my project,
 * when AWS starts costing money. Each is one line; the detail is behind its help mark. Who reads the code is a good
 * default, changed in that same row ("Change analyzer"), so the choice sits above the button it configures.
 */
export function StartStep({
  state,
  onStart,
  isBusy,
  isLocked
}: {
  state: WizardState;
  onStart: (agentId: string, modelId: string) => void;
  isBusy: boolean;
  /** Disconnected from the CLI: the analysis cannot start until it is back. */
  isLocked: boolean;
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
    chosenModel === 'default' ? undefined : (models.find((model) => model.id === chosenModel)?.label ?? chosenModel);
  const where = state.repositoryPath === undefined ? '' : ` in ${state.repositoryPath}`;
  const canChange = agents.length > 1;

  return (
    <div className="w-start w-enter">
      <h1 className="w-title w-start-title">
        Deploy{' '}
        <span className="w-start-name">
          {wrappableName(state.projectName).map((part, index) => (
            // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed name.
            <Fragment key={index}>
              {index > 0 && <wbr />}
              {part}
            </Fragment>
          ))}
        </span>{' '}
        to AWS
      </h1>
      <p className="w-lede">Stacktape reads your code and shows what it needs on AWS, and what that costs.</p>

      <ul className="w-card w-facts">
        <li className={`w-fact${showOptions ? ' is-open' : ''}`}>
          <BiSearchAlt aria-hidden size={18} />
          <div className="w-fact-main">
            <p className="w-fact-text">
              {usesAi
                ? `${agent.label}${modelLabel === undefined ? '' : ` (${modelLabel})`} reads your code, `
                : 'Stacktape reads your manifests, '}
              <span className="whitespace-nowrap">
                {usesAi ? 'read-only' : 'without AI'}
                <InfoTip about="who reads the code">
                  {usesAi
                    ? `It runs on this machine${where}, under your own ${agent.label} plan. Stacktape never receives your code.`
                    : `Only manifests, Dockerfiles and config files${where} are read. Nothing leaves this machine.`}
                </InfoTip>
              </span>
            </p>
            {canChange && (
              <button
                aria-controls="analyzer-options"
                aria-expanded={showOptions}
                className="w-link w-small w-fact-action"
                onClick={() => setShowOptions(!showOptions)}
                type="button"
              >
                {showOptions ? 'Done' : 'Change analyzer'}
              </button>
            )}
          </div>
          {showOptions && (
            <div className="w-reader-options w-enter" id="analyzer-options">
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
              <p className="w-quiet">
                {usesAi
                  ? `${agent.label}${agent.version === undefined ? '' : ` ${versionLabel(agent.version)}`}, on your own plan. ${chosenModel === 'default' ? 'Uses the model you set in it.' : ''}`
                  : 'Reads manifests, Dockerfiles and config files. It finds most apps, but not settings only the code shows.'}
              </p>
            </div>
          )}
        </li>
        <li className="w-fact">
          <BiFileBlank aria-hidden size={18} />
          <p className="w-fact-text">
            You review the setup, then <span className="w-code">stacktape.yml</span>{' '}
            <span className="whitespace-nowrap">
              is saved
              <InfoTip about="what gets saved">
                {state.existingConfig === undefined
                  ? 'One new file in this folder. Nothing else in your project changes.'
                  : `A new file beside your ${state.existingConfig}, which stays as it is. Nothing else changes.`}
              </InfoTip>
            </span>
          </p>
        </li>
        <li className="w-fact">
          <BiCloudUpload aria-hidden size={18} />
          <p className="w-fact-text">
            It deploys to your own AWS account. No Stacktape account{' '}
            <span className="whitespace-nowrap">
              needed.
              <InfoTip about="AWS and accounts">
                The deploy uses the AWS credentials on this machine and creates everything in your own AWS account. You
                choose the account before deploying.
              </InfoTip>
            </span>
          </p>
        </li>
      </ul>

      <div className="w-start-actions">
        <Button
          className="w-big"
          disabled={isLocked}
          isLoading={isBusy}
          onClick={() => onStart(agentId, chosenModel)}
          variant="primary"
        >
          Analyze my project
        </Button>
        <p className="w-start-promise">
          <span>{usesAi ? 'Usually under a minute.' : 'Takes a few seconds.'}</span>
          <span>Nothing is created on AWS until you click Deploy.</span>
        </p>
      </div>

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
