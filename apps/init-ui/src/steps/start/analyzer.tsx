import { Select, type SelectOption } from '@stacktape/ui-react/select';
import { Tabs } from '@stacktape/ui-react/tabs';
import { useState } from 'react';
import { InfoTip } from '../../components/InfoTip';
import type { WizardAgentOption } from '../../session';

/** Who analyzes the project, as chosen on the first screen. The default is the recommended agent and its own model. */
export type AnalyzerChoice = {
  agents: WizardAgentOption[];
  agentId: string;
  agent: WizardAgentOption | undefined;
  models: WizardAgentOption['models'];
  /** `default` is the model set in the agent itself. */
  modelId: string;
  /** A coding agent analyzes the code. Otherwise Stacktape does, from manifests and config files only. */
  usesAi: boolean;
  /** There is something to choose: an agent besides files-only. */
  canChange: boolean;
  isOpen: boolean;
  toggle: () => void;
  chooseAgent: (id: string) => void;
  chooseModel: (id: string) => void;
};

export const useAnalyzerChoice = (agents: WizardAgentOption[]): AnalyzerChoice => {
  const [isOpen, setOpen] = useState(false);
  const [agentId, setAgentId] = useState<string>(
    agents.find((agent) => agent.recommended)?.id ?? agents[0]?.id ?? 'none'
  );
  const [modelId, setModelId] = useState<string>('default');
  const agent = agents.find((option) => option.id === agentId);
  const models = agent?.models ?? [];
  return {
    agents,
    agentId,
    agent,
    models,
    modelId: models.some((model) => model.id === modelId) ? modelId : 'default',
    usesAi: agent !== undefined && agent.id !== 'none',
    canChange: agents.length > 1,
    isOpen,
    toggle: () => setOpen(!isOpen),
    chooseAgent: (id) => {
      setAgentId(id);
      setModelId('default');
    },
    chooseModel: setModelId
  };
};

/** "your default model", or the model picked under Change. */
export const modelWords = (choice: AnalyzerChoice): string =>
  choice.modelId === 'default'
    ? 'your default model'
    : (choice.models.find((model) => model.id === choice.modelId)?.label ?? choice.modelId);

/** The analyzer's name, with the privacy detail behind its help mark: where it runs and what leaves the machine. */
export function AnalyzerName({
  choice,
  repositoryPath
}: {
  choice: AnalyzerChoice;
  repositoryPath?: string | undefined;
}) {
  const where = repositoryPath === undefined ? '' : ` in ${repositoryPath}`;
  return (
    <span className="w-analyzer-name">
      {choice.usesAi ? choice.agent?.label : 'Stacktape'}
      <InfoTip about="who analyzes the code">
        {choice.usesAi
          ? `It runs on this machine${where}, under your own ${choice.agent?.label} plan. Stacktape never receives your code.`
          : `Only manifests, Dockerfiles and config files${where} are analyzed. Nothing leaves this machine.`}
      </InfoTip>
    </span>
  );
}

/** "Change", which opens the analyzer options; "Done" closes them. Only when there is a choice to make. */
export function ChangeAnalyzer({ choice }: { choice: AnalyzerChoice }) {
  if (!choice.canChange) return null;
  return (
    <button
      aria-controls="analyzer-options"
      aria-expanded={choice.isOpen}
      aria-label={choice.isOpen ? 'Done choosing the analyzer' : 'Change the analyzer'}
      className="w-link w-analyzer-change"
      onClick={choice.toggle}
      type="button"
    >
      {choice.isOpen ? 'Done' : 'Change'}
    </button>
  );
}

/** "With Claude Code and your default model · Change", beside or under the button it configures (G1, G3). */
export function AnalyzerLine({
  choice,
  repositoryPath
}: {
  choice: AnalyzerChoice;
  repositoryPath?: string | undefined;
}) {
  return (
    <p className="w-analyzer-line">
      <span>
        With <AnalyzerName choice={choice} repositoryPath={repositoryPath} />
        {choice.usesAi ? ` and ${modelWords(choice)}` : ', without AI'}
      </span>
      {choice.canChange && (
        <>
          <span aria-hidden className="w-analyzer-dot">
            ·
          </span>
          <ChangeAnalyzer choice={choice} />
        </>
      )}
    </p>
  );
}

/** What analyzes the project and with which model: the agents as segments, the agent's models in a select. */
export function AnalyzerOptions({ choice }: { choice: AnalyzerChoice }) {
  if (!choice.isOpen) return null;
  const { agent, models, usesAi } = choice;
  const modelOptions = models.map((model) => ({ value: model.id, label: model.label }));
  return (
    <div className="w-analyzer-options w-enter" id="analyzer-options">
      <div>
        <p className="w-field-label">
          What analyzes the project
          {agent?.description !== undefined && <InfoTip about="this analyzer">{agent.description}</InfoTip>}
        </p>
        <Tabs
          appearance="segmented"
          ariaLabel="What analyzes the project"
          onValueChange={choice.chooseAgent}
          tabs={choice.agents.map((option) => ({
            value: option.id,
            label: option.id === 'none' ? 'No AI' : option.label
          }))}
          value={choice.agentId}
          width="fit"
        />
      </div>
      {models.length > 1 && (
        <Select
          label="Model"
          name="model"
          onChange={(selected) => {
            if (selected !== null && !Array.isArray(selected)) {
              choice.chooseModel((selected as SelectOption<string>).value);
            }
          }}
          options={modelOptions}
          reserveMessageSpace={false}
          value={modelOptions.find((option) => option.value === choice.modelId) ?? null}
        />
      )}
      <p className="w-quiet">
        {usesAi
          ? `${agent?.label}${agent?.version === undefined ? '' : ` ${versionLabel(agent.version)}`}, on your own plan.${choice.modelId === 'default' ? ' Uses the model you set in it.' : ''}`
          : 'Analyzes manifests, Dockerfiles and config files. It finds most apps, but not settings only the code shows.'}
      </p>
    </div>
  );
}

/** "2.1.296 (Claude Code)" and "codex-cli 0.98.0" are what the agents print; the line already names the agent. */
export const versionLabel = (version: string): string => {
  const number = /\d+\.\d+(?:\.\d+)?/.exec(version)?.[0];
  return number === undefined ? version : `v${number}`;
};
