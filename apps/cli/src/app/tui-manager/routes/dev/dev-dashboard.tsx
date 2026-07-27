import { createEffect, ErrorBoundary, For, Show } from 'solid-js';
import { useKeyboard, useRenderer } from '@opentui/solid';
import { ThemeProvider, useTheme } from '../../context/theme';
import { createDevSignal } from '../../context/dev-state';
import { devTuiState } from '../../dev-tui/state';
import type { RebuildWorkloadState, Workload, WorkloadColor } from '../../dev-tui/types';
import { getWorkloadColor } from '../../dev-tui/utils';
import { KeyHints, type Hint } from '../../ui/key-hint';
import { Spinner } from '../../ui/spinner';
import { StatusIcon } from '../../ui/status-icon';

type DevDashboardProps = {
  onRebuild?: (workloadName: string | null) => void;
  onQuit?: () => void;
  onRenderError?: (error: Error) => void;
};

const WORKLOAD_COLOR_HEX: Record<WorkloadColor, string> = {
  cyan: '#06b6d4',
  magenta: '#c084fc',
  yellow: '#eab308',
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  white: '#e5e7eb',
  gray: '#9ca3af'
};

const getActiveWorkloads = () =>
  devTuiState.getState().workloads.filter((w) => w.status === 'running' || w.status === 'error');

const workloadStatusIcon = (status: Workload['status']) =>
  status === 'running' ? 'success' : status === 'error' ? 'error' : status === 'starting' ? 'running' : 'pending';

const DevHeader = () => {
  const { theme } = useTheme();
  const projectName = createDevSignal((s) => s.projectName);
  const stageName = createDevSignal((s) => s.stageName);
  const phase = createDevSignal((s) => s.phase);

  const phaseLabel = () => (phase() === 'startup' ? 'STARTING' : phase() === 'rebuilding' ? 'REBUILDING' : 'DEV MODE');
  const phaseColor = () => (phase() === 'running' ? theme.success : theme.running);

  return (
    <box flexDirection="row" height={1} paddingX={1}>
      <text flexShrink={0} wrapMode="none" fg={phaseColor()}>
        <b>{phaseLabel()}</b>
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
        {'  '}
        {projectName()}
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        {' '}
        →{' '}
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
        {stageName()}
      </text>
    </box>
  );
};

const WorkloadRow = (props: { workload: Workload }) => {
  const { theme } = useTheme();
  const nameColor = () => WORKLOAD_COLOR_HEX[getWorkloadColor(props.workload.name)];

  return (
    <box flexDirection="row" height={1}>
      <StatusIcon status={workloadStatusIcon(props.workload.status)} />
      <text flexShrink={0} wrapMode="none" fg={nameColor()}>
        {' '}
        <b>{props.workload.name}</b>
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        {'  '}
        {props.workload.type}
      </text>
      <Show when={props.workload.url}>
        <text flexShrink={0} wrapMode="none" fg={theme.blue}>
          {'  '}
          {props.workload.url}
        </text>
      </Show>
      <Show when={props.workload.status === 'starting' && props.workload.statusMessage}>
        <text fg={theme.muted}>
          {'  '}
          {props.workload.statusMessage}
        </text>
      </Show>
      <Show when={props.workload.status === 'error' && props.workload.error}>
        <text fg={theme.error}>
          {'  '}
          {props.workload.error}
        </text>
      </Show>
    </box>
  );
};

const RebuildRow = (props: { workload: RebuildWorkloadState }) => {
  const { theme } = useTheme();
  const nameColor = () => WORKLOAD_COLOR_HEX[getWorkloadColor(props.workload.name)];
  const stepText = () => {
    if (props.workload.status === 'done') return 'done';
    if (props.workload.status === 'error') return props.workload.error || 'failed';
    const step = props.workload.step || 'waiting';
    return props.workload.stepDetail ? `${step} — ${props.workload.stepDetail}` : step;
  };
  const stepColor = () =>
    props.workload.status === 'done' ? theme.success : props.workload.status === 'error' ? theme.error : theme.muted;

  return (
    <box flexDirection="row" height={1}>
      <Show
        when={props.workload.status === 'in-progress'}
        fallback={
          <StatusIcon
            status={
              props.workload.status === 'done' ? 'success' : props.workload.status === 'error' ? 'error' : 'pending'
            }
          />
        }
      >
        <Spinner />
      </Show>
      <text flexShrink={0} wrapMode="none" fg={nameColor()}>
        {' '}
        <b>{props.workload.name}</b>
      </text>
      <text fg={stepColor()}>
        {'  '}
        {stepText()}
      </text>
    </box>
  );
};

const StartupSteps = () => {
  const { theme } = useTheme();
  const setupSteps = createDevSignal((s) => s.setupSteps);
  const hooks = createDevSignal((s) => s.hooks);
  const localResources = createDevSignal((s) => s.localResources);

  const runningSteps = () => setupSteps().filter((s) => s.status === 'running');
  const runningHooks = () => hooks().filter((h) => h.status === 'running');
  const startingResources = () => localResources().filter((r) => r.status === 'starting');
  const hasActivity = () => runningSteps().length + runningHooks().length + startingResources().length > 0;

  return (
    <box flexDirection="column">
      <For each={runningSteps()}>
        {(step) => (
          <box flexDirection="row" height={1}>
            <Spinner />
            <text fg={theme.text}>
              {' '}
              {step.label}
              {step.detail ? `  ${step.detail}` : ''}
            </text>
          </box>
        )}
      </For>
      <For each={runningHooks()}>
        {(hook) => (
          <box flexDirection="row" height={1}>
            <Spinner />
            <text fg={theme.text}> Hook "{hook.name}"</text>
          </box>
        )}
      </For>
      <For each={startingResources()}>
        {(resource) => (
          <box flexDirection="row" height={1}>
            <Spinner />
            <text fg={theme.text}>
              {' '}
              Local {resource.type} "{resource.name}"
            </text>
          </box>
        )}
      </For>
      <Show when={!hasActivity()}>
        <text fg={theme.dim}>Starting dev mode...</text>
      </Show>
    </box>
  );
};

const RebuildPicker = () => {
  const { theme } = useTheme();
  const workloads = createDevSignal((s) => s.workloads);
  const active = () => workloads().filter((w) => w.status === 'running' || w.status === 'error');

  return (
    <box flexDirection="column" paddingX={1}>
      <text fg={theme.textBright}>
        <b>Rebuild which workload?</b>
      </text>
      <For each={active()}>
        {(w, i) => (
          <box flexDirection="row" height={1}>
            <text flexShrink={0} wrapMode="none" fg={theme.running}>
              <b>{i() + 1}</b>
            </text>
            <text fg={WORKLOAD_COLOR_HEX[getWorkloadColor(w.name)]}> {w.name}</text>
          </box>
        )}
      </For>
      <KeyHints
        hints={[
          { key: 'a', label: 'all' },
          { key: 'esc', label: 'cancel' }
        ]}
      />
    </box>
  );
};

const DevDashboardInner = (props: Pick<DevDashboardProps, 'onRebuild' | 'onQuit'>) => {
  const { theme } = useTheme();
  const renderer = useRenderer();
  const phase = createDevSignal((s) => s.phase);
  const workloads = createDevSignal((s) => s.workloads);
  const rebuildingWorkloads = createDevSignal((s) => s.rebuildingWorkloads);
  const rebuildPickerActive = createDevSignal((s) => s.rebuildPickerActive);

  // 3 chrome rows (border, header, hints) + one row per item in the live area
  createEffect(() => {
    const contentRows =
      phase() === 'rebuilding'
        ? rebuildingWorkloads().length
        : phase() === 'startup'
          ? 4
          : Math.max(workloads().length, 1);
    const pickerRows = rebuildPickerActive() ? getActiveWorkloads().length + 2 : 0;
    try {
      renderer.footerHeight = Math.max(6, Math.min(4 + Math.max(contentRows, pickerRows), 18));
    } catch {}
  });

  useKeyboard((key) => {
    if (key.ctrl && key.name === 'c') {
      devTuiState.setRebuildPickerActive(false);
      props.onQuit?.();
      return;
    }

    if (phase() === 'startup') return;

    if (rebuildPickerActive()) {
      if (key.name === 'escape') {
        devTuiState.setRebuildPickerActive(false);
        return;
      }
      if (key.sequence === 'a' || key.sequence === 'A') {
        devTuiState.setRebuildPickerActive(false);
        props.onRebuild?.(null);
        return;
      }
      const num = parseInt(key.name, 10);
      if (num >= 1) {
        const active = getActiveWorkloads();
        if (num <= active.length) {
          devTuiState.setRebuildPickerActive(false);
          props.onRebuild?.(active[num - 1].name);
        }
      }
      return;
    }

    if (phase() === 'rebuilding') return;

    if (key.ctrl && key.name === 'a') {
      props.onRebuild?.(null);
      return;
    }

    if (key.ctrl && key.name === 'r') {
      const active = getActiveWorkloads();
      if (active.length === 1) {
        props.onRebuild?.(active[0].name);
      } else if (active.length > 1) {
        devTuiState.setRebuildPickerActive(true);
      }
    }
  });

  const hints = (): Hint[] => {
    if (phase() === 'startup') return [{ key: 'ctrl+c', label: 'quit' }];
    if (phase() === 'rebuilding') return [{ key: 'ctrl+c', label: 'quit' }];
    return [
      { key: 'ctrl+r', label: 'rebuild' },
      { key: 'ctrl+a', label: 'rebuild all' },
      { key: 'ctrl+c', label: 'quit' }
    ];
  };

  return (
    <box flexDirection="column" width="100%" height="100%" border={['top']} borderColor={theme.border}>
      <DevHeader />
      <Show when={!rebuildPickerActive()} fallback={<RebuildPicker />}>
        <scrollbox flexGrow={1} paddingX={1} stickyScroll={true}>
          <Show when={phase() === 'startup'}>
            <StartupSteps />
          </Show>
          <Show when={phase() === 'rebuilding'}>
            <For each={rebuildingWorkloads()}>{(w) => <RebuildRow workload={w} />}</For>
          </Show>
          <Show when={phase() === 'running'}>
            <For each={workloads()}>{(w) => <WorkloadRow workload={w} />}</For>
          </Show>
        </scrollbox>
      </Show>
      <box height={1} paddingX={1} flexShrink={0}>
        <KeyHints hints={hints()} />
      </box>
    </box>
  );
};

export const DevDashboard = (props: DevDashboardProps) => {
  return (
    <ErrorBoundary
      fallback={(err) => {
        props.onRenderError?.(err);
        return <box />;
      }}
    >
      <ThemeProvider>
        <DevDashboardInner onRebuild={props.onRebuild} onQuit={props.onQuit} />
      </ThemeProvider>
    </ErrorBoundary>
  );
};
