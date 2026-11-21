import { Select, type SelectOption } from '@stacktape/ui-react/select';
import { useState } from 'react';
import type { WizardAgentOption } from '../../session';

/** Who analyzes the project, as chosen on the first screen, and with which model. */
export type AnalyzerChoice = {
  agents: WizardAgentOption[];
  agentId: string;
  agent: WizardAgentOption | undefined;
  /** `default` is the model set in the agent itself. */
  modelId: string;
  /** A coding agent analyzes the code. Otherwise Stacktape does, from manifests and config files only. */
  usesAi: boolean;
  chooseAgent: (id: string) => void;
  chooseModel: (id: string) => void;
};

const isInstalled = (agent: WizardAgentOption) => agent.installed !== false;

/** The one the CLI recommends (its best agent on this machine, or none), otherwise the first that can run. */
export const defaultAnalyzer = (agents: readonly WizardAgentOption[]): string =>
  (agents.find((agent) => agent.recommended === true && isInstalled(agent)) ?? agents.find(isInstalled))?.id ?? 'none';

export const useAnalyzerChoice = (agents: WizardAgentOption[]): AnalyzerChoice => {
  const [agentId, setAgentId] = useState<string>(() => defaultAnalyzer(agents));
  const [modelId, setModelId] = useState<string>('default');
  const agent = agents.find((option) => option.id === agentId);
  const models = agent?.models ?? [];
  return {
    agents,
    agentId,
    agent,
    modelId: models.some((model) => model.id === modelId) ? modelId : 'default',
    usesAi: agent !== undefined && agent.id !== 'none',
    chooseAgent: (id) => {
      setAgentId(id);
      setModelId('default');
    },
    chooseModel: setModelId
  };
};

const picked = (selected: unknown): string | undefined =>
  selected !== null && typeof selected === 'object' && !Array.isArray(selected)
    ? (selected as SelectOption<string>).value
    : undefined;

/**
 * How the project is analyzed: every analyzer the CLI offers in one select (the agents on this machine, Stacktape
 * without AI, and the agents it could use that are not installed, which cannot be picked), and the agent's model when
 * it has a choice of them.
 */
export function AnalyzerPicker({ choice, isDisabled }: { choice: AnalyzerChoice; isDisabled: boolean }) {
  if (choice.agents.length === 0) return null;
  const analyzers: Array<SelectOption<string>> = choice.agents.map((agent) => ({
    value: agent.id,
    label: agent.label,
    description: agent.description,
    ...(isInstalled(agent) ? {} : { isDisabled: true })
  }));
  const models: Array<SelectOption<string>> = (choice.agent?.models ?? []).map((model) => ({
    value: model.id,
    label: model.label,
    description: model.description
  }));
  return (
    <>
      <Select
        className="w-analyzer-select"
        disabled={isDisabled}
        hideLabel
        inlineLabel="Analyzer"
        label="Analyzer"
        name="analyzer"
        onChange={(selected) => {
          const id = picked(selected);
          if (id !== undefined) choice.chooseAgent(id);
        }}
        options={analyzers}
        reserveMessageSpace={false}
        searchable={false}
        value={analyzers.find((option) => option.value === choice.agentId) ?? null}
      />
      {models.length > 1 && (
        <Select
          className="w-model-select"
          disabled={isDisabled}
          hideLabel
          inlineLabel="Model"
          label="Model"
          name="model"
          onChange={(selected) => {
            const id = picked(selected);
            if (id !== undefined) choice.chooseModel(id);
          }}
          options={models}
          reserveMessageSpace={false}
          searchable={false}
          value={models.find((option) => option.value === choice.modelId) ?? null}
        />
      )}
    </>
  );
}
