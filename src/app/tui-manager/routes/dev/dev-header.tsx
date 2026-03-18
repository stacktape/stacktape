import { Show } from 'solid-js';
import { useTheme } from '../../context/theme';
import { createDevSignal } from '../../context/dev-state';

export const DevHeader = () => {
  const { theme } = useTheme();
  const projectName = createDevSignal((s) => s.projectName);
  const stageName = createDevSignal((s) => s.stageName);
  const phase = createDevSignal((s) => s.phase);
  const workloads = createDevSignal((s) => s.workloads);
  const sidebarVisible = createDevSignal((s) => s.sidebarVisible);

  const runningCount = () => workloads().filter((w) => w.status === 'running').length;
  const errorCount = () => workloads().filter((w) => w.status === 'error').length;
  const phaseColor = () => (phase() === 'rebuilding' ? theme.rebuild : theme.running);
  const phaseLabel = () => (phase() === 'rebuilding' ? 'REBUILDING' : phase() === 'startup' ? 'STARTING' : 'DEV');

  return (
    <box flexDirection="row" height={1} paddingX={1} flexShrink={0}>
      <text flexShrink={0} fg={phaseColor()}>
        <b>{phaseLabel()}</b>
      </text>
      <text flexShrink={0} fg={theme.textBright}>
        {'  '}
        {projectName()}
      </text>
      <text flexShrink={0} fg={theme.pending}>
        {' '}
        →{' '}
      </text>
      <text flexShrink={0} fg={theme.textBright}>
        {stageName()}
      </text>
      <Show when={!sidebarVisible() && phase() === 'running'}>
        <text flexShrink={0} fg={theme.muted}>
          {'  '}
          {runningCount() > 0 ? `✓${runningCount()}` : ''}
          {errorCount() > 0 ? ` ✗${errorCount()}` : ''}
        </text>
      </Show>
    </box>
  );
};
