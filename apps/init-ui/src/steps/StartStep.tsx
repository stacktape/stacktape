import { useState } from 'react';
import type { WizardState } from '../session';
import { useAnalyzerChoice } from './start/analyzer';
import type { StartProps } from './start/parts';
import { StartG1 } from './start/StartG1';
import { StartG2 } from './start/StartG2';
import { StartG3 } from './start/StartG3';
import { startVersion } from './start/start-version';

/**
 * The first screen: the four steps from here to a running app, each with a rough time, and one button.
 *
 * Three placements of the steps are built while the owner picks one (`?start=g1|g2|g3`, see `start/start-version.ts`).
 * All three share the analyzer choice: a good default (the recommended agent and its own model), changed under the
 * button's "Change", and files-only when the machine has no coding agent.
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
  const choice = useAnalyzerChoice(state.agents ?? []);
  const [version] = useState(() => startVersion(window.location.search));
  const props: StartProps = {
    state,
    choice,
    onStart: () => onStart(choice.agentId, choice.modelId),
    isBusy,
    isLocked
  };
  if (version === 'g2') return <StartG2 {...props} />;
  if (version === 'g3') return <StartG3 {...props} />;
  return <StartG1 {...props} />;
}
