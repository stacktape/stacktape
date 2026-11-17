/**
 * The four stations of the path across the top of the page, and where the run is on them.
 *
 * Before anything runs, each station says what that step will do, so the first screen explains the whole journey.
 * Once a step is behind the user, its station says what came of it instead. The list is fixed: a path that grows a
 * station halfway through has told the user their progress was a guess.
 */

import type { WizardState } from './session';

export type StationId = 'analyze' | 'review' | 'deploy' | 'live';
/** `current` waits for the user; `working` is the run doing something on its own, such as reading or deploying. */
export type StationStatus = 'pending' | 'current' | 'working' | 'done' | 'failed';

export type Station = { id: StationId; title: string; note: string; status: StationStatus };

const TITLES: Record<StationId, string> = { analyze: 'Analyze', review: 'Review', deploy: 'Deploy', live: 'Live' };

/** What each step does, said before it has happened. */
const PROMISES: Record<StationId, string> = {
  analyze: 'Reads your code on this machine. None of it goes to Stacktape.',
  review: 'The AWS setup it needs, its monthly price and one file.',
  deploy: 'Optional. Nothing is created or billed before you confirm.',
  live: 'A public address, with logs and metrics in the Console.'
};

const ORDER: StationId[] = ['analyze', 'review', 'deploy', 'live'];

/** The station the run is on, and how it is there. `undefined` before anything has started. */
const positionOf = (state: WizardState): { at: StationId; status: StationStatus } | undefined => {
  const deployment = state.deployment?.status;
  if (deployment === 'succeeded') return { at: 'live', status: 'done' };
  if (deployment === 'failed') return { at: 'deploy', status: 'failed' };
  if (deployment !== undefined) return { at: 'deploy', status: 'working' };
  if (state.configFile !== undefined) return { at: 'deploy', status: 'current' };
  if (state.phase === 'reviewing') return { at: 'review', status: 'current' };
  if (state.phase === 'analysing') return { at: 'analyze', status: 'working' };
  if (state.phase === 'failed') return { at: 'analyze', status: 'failed' };
  return undefined;
};

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** What a finished step came to, in a few words. */
const resultOf = (id: StationId, state: WizardState): string => {
  switch (id) {
    case 'analyze': {
      const filesRead = state.timeline.filter(
        (entry) => entry.kind === 'tool' && entry.label.startsWith('read_file ')
      ).length;
      const agent = state.agents?.find((option) => option.id === state.choice?.agentId);
      if (agent === undefined || agent.id === 'none') return 'Read your project files, without an agent.';
      return `${agent.label} read ${plural(filesRead, 'file')}, on this machine.`;
    }
    case 'review':
      return `Saved ${state.configFile?.filename ?? 'the file'} with ${plural(
        Object.keys(state.composition?.resources ?? {}).length,
        'resource'
      )}.`;
    case 'deploy':
      return `Deployed ${state.deployment?.stage ?? ''} to ${state.deployment?.region ?? 'AWS'}.`;
    // What the live stage offers is the same before and after; the addresses themselves are on the page.
    case 'live':
      return PROMISES.live;
  }
};

export const stationsFor = (state: WizardState): Station[] => {
  const position = positionOf(state);
  const reached = position === undefined ? -1 : ORDER.indexOf(position.at);
  return ORDER.map((id, index): Station => {
    const status: StationStatus =
      index < reached ? 'done' : index === reached ? (position?.status ?? 'pending') : 'pending';
    const note =
      status === 'done'
        ? resultOf(id, state)
        : status === 'failed'
          ? id === 'analyze'
            ? 'Did not finish. Nothing was changed.'
            : 'Did not finish.'
          : PROMISES[id];
    return { id, title: TITLES[id], note, status };
  });
};
