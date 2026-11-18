import { Button } from '@stacktape/ui-react/button';
import { useState } from 'react';
import { BiCloudUpload, BiFileBlank, BiFolder, BiSearchAlt } from 'react-icons/bi';
import { TbStack2, TbWorld } from 'react-icons/tb';
import { Segmented } from '../components/Segmented';
import type { WizardAgentOption, WizardState } from '../session';

/**
 * The first screen: what is about to happen, in three facts, and one button.
 *
 * The three facts answer what a first-time user worries about, in this order: who reads my code, what changes in my
 * project, when does AWS start costing money. Which agent and model read the project is a good default shown in one
 * line, with the choice behind it.
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
      ? 'default model'
      : (models.find((model) => model.id === chosenModel)?.label ?? chosenModel);

  return (
    <div className="w-start w-enter">
      <div>
        {state.repositoryPath !== undefined && (
          <p className="w-path-chip" title={state.repositoryPath}>
            <BiFolder size={14} />
            <span>{state.repositoryPath}</span>
          </p>
        )}
        <h1 className="w-title">Put {state.projectName} on AWS</h1>
        <p className="w-lede">
          Stacktape reads your code, shows the AWS setup it needs with its monthly price, and writes one file. Deploying
          is a separate click at the end.
        </p>

        <ul className="w-facts">
          <li className="w-fact">
            <span className="w-fact-icon">
              <BiSearchAlt size={17} />
            </span>
            <div>
              <p className="w-fact-title">
                {usesAi ? `Your ${agent.label} reads the code` : 'Read on this machine, without AI'}
              </p>
              <p className="w-fact-text">
                {usesAi
                  ? `Read-only, under your own ${agent.label} plan. Stacktape receives none of it.`
                  : 'Manifests and config files only. Nothing leaves this machine.'}
              </p>
            </div>
          </li>
          <li className="w-fact">
            <span className="w-fact-icon">
              <BiFileBlank size={17} />
            </span>
            <div>
              <p className="w-fact-title">One file is written</p>
              <p className="w-fact-text">
                {state.existingConfig === undefined
                  ? 'stacktape.yml in this folder, after you review it. Nothing else changes.'
                  : `A new file beside your ${state.existingConfig}, which stays as it is.`}
              </p>
            </div>
          </li>
          <li className="w-fact">
            <span className="w-fact-icon">
              <BiCloudUpload size={17} />
            </span>
            <div>
              <p className="w-fact-title">AWS only when you click Deploy</p>
              <p className="w-fact-text">Nothing is created or billed before that. No Stacktape account needed.</p>
            </div>
          </li>
        </ul>

        <div className="w-start-actions">
          <Button className="w-big" isLoading={isBusy} onClick={() => onStart(agentId, chosenModel)} variant="primary">
            Analyze my project
          </Button>
          <span className="w-subtle w-small">{usesAi ? 'Usually under a minute' : 'Takes a few seconds'}</span>
        </div>

        {agents.length > 1 && (
          <div>
            <p className="w-reader">
              <span>
                {usesAi ? `${agent.label}, ${modelLabel}` : 'No AI: files only'}
                {agent?.version === undefined ? '' : ` · ${versionLabel(agent.version)}`}
              </span>
              <button
                aria-expanded={showOptions}
                className="w-link w-textbutton text-[12.5px]"
                onClick={() => setShowOptions(!showOptions)}
                type="button"
              >
                {showOptions ? 'Done' : 'Change'}
              </button>
            </p>
            {showOptions && (
              <div className="w-reader-options w-enter">
                <div className="flex flex-col gap-2">
                  <p className="w-setting-label">What reads the project</p>
                  <Segmented
                    label="What reads the project"
                    onChange={(value) => {
                      setAgentId(value);
                      setModelId('default');
                    }}
                    options={agents.map((option) => ({
                      value: option.id,
                      label: option.id === 'none' ? 'No AI' : option.label
                    }))}
                    value={agentId}
                  />
                  <p className="w-setting-help">{agent?.description}</p>
                </div>
                {models.length > 1 && (
                  <div className="flex flex-col gap-2">
                    <p className="w-setting-label">Model</p>
                    <Segmented
                      label="Model"
                      onChange={setModelId}
                      options={models.map((model) => ({ value: model.id, label: model.label }))}
                      value={chosenModel}
                    />
                    <p className="w-setting-help">{models.find((model) => model.id === chosenModel)?.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="w-footnote">
          Anonymous usage statistics (frameworks found, whether the deploy worked), never code or names.{' '}
          <span className="w-code">STP_DISABLE_TELEMETRY=1</span> turns them off.
        </p>
      </div>

      <JourneyPreview />
    </div>
  );
}

/** The four steps ahead, drawn small: the whole journey before it starts. */
function JourneyPreview() {
  const rows = [
    {
      icon: <BiSearchAlt size={18} />,
      title: 'Analyze',
      text: 'Frameworks, databases, settings your code reads',
      tag: '~1 min'
    },
    {
      icon: <TbStack2 size={18} />,
      title: 'Review',
      text: 'Diagram, monthly price, the file. Change anything.',
      tag: 'you decide'
    },
    {
      icon: <BiCloudUpload size={18} />,
      title: 'Deploy',
      text: 'To your own AWS account, after a read-only check',
      tag: 'optional'
    },
    { icon: <TbWorld size={18} />, title: 'Live', text: 'A public HTTPS address for your app', tag: '' }
  ];
  return (
    <div aria-hidden className="w-card w-preview">
      {rows.map((row, index) => (
        <div className="w-preview-row" key={row.title} style={{ '--i': index } as React.CSSProperties}>
          <span className="w-preview-icon">{row.icon}</span>
          <div className="min-w-0">
            <p className="w-preview-title">{row.title}</p>
            <p className="w-preview-text">{row.text}</p>
          </div>
          <span className="w-preview-tag">{row.tag}</span>
        </div>
      ))}
    </div>
  );
}

/** "2.1.296 (Claude Code)" and "codex-cli 0.98.0" are what the agents print; the card already names the agent. */
export const versionLabel = (version: string): string => {
  const number = /\d+\.\d+(?:\.\d+)?/.exec(version)?.[0];
  return number === undefined ? version : `v${number}`;
};
