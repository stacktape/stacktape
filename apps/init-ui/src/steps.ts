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
};

const ORDER: StepId[] = ['start', 'read', 'review', 'deploy'];

const activeStepFor = (state: WizardState): StepId => {
  if (state.phase === 'ready') return 'start';
  if (state.phase === 'analysing') return 'read';
  if (state.phase === 'failed') return state.timeline.length > 0 ? 'read' : 'start';
  // The configuration on disk is what separates looking at it from doing something with it.
  return state.configFile === undefined ? 'review' : 'deploy';
};

export const stepsFor = (state: WizardState): Step[] => {
  const active = activeStepFor(state);
  const activeIndex = ORDER.indexOf(active);

  return ORDER.map((id, index): Step => {
    const status: StepStatus = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'todo';
    return { id, title: TITLES[id], lede: LEDES[id], status };
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
