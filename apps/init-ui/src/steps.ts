/**
 * The four bands of the page, and which one the run is on.
 *
 * There is no "decisions" step any more, and that is the point: everything the pipeline could not
 * work out is decided for you and shown inside Review, where it sits next to the resource it
 * affected. A question is a step; a decision you can see and change is a line of text.
 *
 * The list is fixed. A guide that grows an entry halfway through has told the user their progress
 * was a guess.
 */

import type { WizardState } from './session';

type StepId = 'start' | 'read' | 'review' | 'deploy';
type StepStatus = 'todo' | 'active' | 'done';

export type Step = {
  id: StepId;
  /** The label in the rail. A verb, because each band is something happening. */
  title: string;
  lede: string;
  status: StepStatus;
  /** A one-line record of what happened, shown once the band is behind you. */
  summary?: string;
};

const ORDER: StepId[] = ['start', 'read', 'review', 'deploy'];

const activeStepFor = (state: WizardState): StepId => {
  if (state.phase === 'ready') return 'start';
  if (state.phase === 'analysing') return 'read';
  if (state.phase === 'failed') return state.timeline.length > 0 ? 'read' : 'start';
  // The configuration on disk is what separates looking at it from doing something with it.
  return state.configFile === undefined ? 'review' : 'deploy';
};

const agentSummary = (state: WizardState): string | undefined => {
  if (state.choice === undefined) return undefined;
  const agent = state.agents?.find((option) => option.id === state.choice?.agentId);
  if (agent === undefined) return undefined;
  const model = agent.models.find((option) => option.id === state.choice?.modelId);
  return model === undefined || model.id === 'default' ? agent.label : `${agent.label} · ${model.label}`;
};

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

export const stepsFor = (state: WizardState): Step[] => {
  const active = activeStepFor(state);
  const activeIndex = ORDER.indexOf(active);
  const services = state.facts?.services.length ?? 0;
  const dependencies = state.facts?.dependencies.length ?? 0;
  const resources = Object.keys(state.composition?.resources ?? {}).length;

  const summaries: Record<StepId, string | undefined> = {
    start: agentSummary(state),
    read:
      state.facts === undefined
        ? undefined
        : dependencies === 0
          ? plural(services, 'service', 'services')
          : `${plural(services, 'service', 'services')}, ${plural(dependencies, 'dependency', 'dependencies')}`,
    review: resources === 0 ? undefined : plural(resources, 'resource', 'resources'),
    deploy: state.deployment?.status === 'succeeded' ? 'live' : undefined
  };

  return ORDER.map((id, index): Step => {
    const behind = index < activeIndex;
    const status: StepStatus = behind ? 'done' : index === activeIndex ? 'active' : 'todo';
    const summary = behind ? summaries[id] : undefined;

    const step: Step = { id, title: TITLES[id], lede: LEDES[id], status };
    if (summary !== undefined) step.summary = summary;
    return step;
  });
};

const TITLES: Record<StepId, string> = {
  start: 'Start',
  read: 'Analyze',
  review: 'Review',
  deploy: 'Deploy'
};

const LEDES: Record<StepId, string> = {
  start: 'One button, and what it will do.',
  read: 'Your project being read, file by file.',
  review: 'Your app on AWS: the picture, the file, the price.',
  deploy: 'Optional. Says what it costs before it does anything.'
};
