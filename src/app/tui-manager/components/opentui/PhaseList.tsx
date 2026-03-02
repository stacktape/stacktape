/** @jsxImportSource @opentui/react */

import { formatDuration } from '../../utils';
import type { TuiPhase } from '../../types';
import { PhaseIcon } from './StatusIcon';
import { useTuiState } from './use-tui-state';

const PhaseRow = ({ phase, isActive }: { phase: TuiPhase; isActive: boolean }) => {
  const durationText = phase.duration ? formatDuration(phase.duration) : '';
  const nameColor = isActive ? '#06b6d4' : phase.status === 'success' ? '#d1d5db' : '#6b7280';

  return (
    <box flexDirection="row" width="100%">
      <PhaseIcon status={phase.status} />
      <text> </text>
      {isActive ? (
        <text fg={nameColor}>
          <b>{phase.name}</b>
        </text>
      ) : (
        <text fg={nameColor}>{phase.name}</text>
      )}
      {durationText ? (
        <text fg="#6b7280">
          {'  '}
          {durationText}
        </text>
      ) : null}
    </box>
  );
};

export const PhaseList = () => {
  const phases = useTuiState((s) => s.phases);
  const currentPhase = useTuiState((s) => s.currentPhase);

  return (
    <box flexDirection="column" width={28} borderStyle="single" borderColor="#374151" paddingX={1}>
      <box height={1}>
        <text fg="#9ca3af">
          <b>Phases</b>
        </text>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true}>
        <box flexDirection="column">
          <box height={1} />
          {phases.map((phase) => (
            <PhaseRow key={phase.id} phase={phase} isActive={phase.id === currentPhase} />
          ))}
        </box>
      </scrollbox>
    </box>
  );
};
