import { Show, For } from 'solid-js';
import { formatDuration } from '../../utils';
import type { TuiPhase } from '../../types';
import { PhaseIcon } from '../../ui/status-icon';
import { useTheme } from '../../context/theme';
import { createTuiSignal } from '../../context/deploy-state';

const PhaseRow = (props: { phase: TuiPhase; isActive: boolean }) => {
  const { theme } = useTheme();
  const durationText = () => (props.phase.duration ? formatDuration(props.phase.duration) : '');
  const nameColor = () => (props.isActive ? theme.running : props.phase.status === 'success' ? theme.text : theme.dim);

  return (
    <box flexDirection="row" width="100%">
      <PhaseIcon status={props.phase.status} />
      <text flexShrink={0} wrapMode="none">
        {' '}
      </text>
      <Show when={props.isActive} fallback={<text fg={nameColor()}>{props.phase.name}</text>}>
        <text fg={nameColor()}>
          <b>{props.phase.name}</b>
        </text>
      </Show>
      <Show when={durationText()}>
        <text flexShrink={0} wrapMode="none" fg={theme.dim}>
          {'  '}
          {durationText()}
        </text>
      </Show>
    </box>
  );
};

export const PhaseList = () => {
  const { theme } = useTheme();
  const phases = createTuiSignal((s) => s.phases);
  const currentPhase = createTuiSignal((s) => s.currentPhase);

  return (
    <box flexDirection="column" width={28} borderStyle="single" borderColor={theme.border} paddingX={1}>
      <box height={1}>
        <text fg={theme.muted}>
          <b>Phases</b>
        </text>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true}>
        <box flexDirection="column">
          <box height={1} />
          <For each={phases()}>{(phase) => <PhaseRow phase={phase} isActive={phase.id === currentPhase()} />}</For>
        </box>
      </scrollbox>
    </box>
  );
};
