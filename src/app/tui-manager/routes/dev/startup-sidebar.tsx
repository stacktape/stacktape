import { Show, For } from 'solid-js';
import { useTheme } from '../../context/theme';
import { createDevSignal } from '../../context/dev-state';
import { Spinner } from '../../ui/spinner';
import { truncateText, isHttpUrl } from '../../util/text-helpers';
import { getWorkloadColor, formatDuration } from '../../dev-tui/utils';
import { SidebarHeader } from '../../ui/sidebar-header';
import type { Hook, LocalResource, SetupStep, Workload } from '../../dev-tui/types';

export const SIDEBAR_WIDTH = 34;
export const SIDEBAR_INNER = SIDEBAR_WIDTH - 4;
const STARTUP_NAME_WIDTH = 16;

const sectionStatus = (
  items: { status: string }[],
  doneStatuses: string[],
  runningStatuses: string[]
): 'pending' | 'running' | 'success' | 'error' => {
  if (items.length === 0) return 'pending';
  if (items.some((i) => i.status === 'error')) return 'error';
  if (items.every((i) => doneStatuses.includes(i.status))) return 'success';
  if (items.some((i) => runningStatuses.includes(i.status))) return 'running';
  return 'pending';
};

export const StatusDot = (props: { status: string }) => {
  const { theme } = useTheme();
  if (props.status === 'running')
    return (
      <text flexShrink={0} fg={theme.success}>
        ●
      </text>
    );
  if (props.status === 'error')
    return (
      <text flexShrink={0} fg={theme.error}>
        ●
      </text>
    );
  if (props.status === 'starting') return <Spinner />;
  return (
    <text flexShrink={0} fg={theme.dim}>
      ○
    </text>
  );
};

export const SectionIcon = (props: { status: 'pending' | 'running' | 'success' | 'error' }) => {
  const { theme } = useTheme();
  if (props.status === 'success')
    return (
      <text flexShrink={0} fg={theme.success}>
        ✓
      </text>
    );
  if (props.status === 'error')
    return (
      <text flexShrink={0} fg={theme.error}>
        ✗
      </text>
    );
  if (props.status === 'running') return <Spinner />;
  return (
    <text flexShrink={0} fg={theme.dim}>
      ○
    </text>
  );
};

const StartupResourceRow = (props: { resource: LocalResource; isLast: boolean }) => {
  const { theme } = useTheme();

  const icon = () => {
    const s = props.resource.status;
    if (s === 'running')
      return (
        <text flexShrink={0} fg={theme.success}>
          ✓
        </text>
      );
    if (s === 'error')
      return (
        <text flexShrink={0} fg={theme.error}>
          ✗
        </text>
      );
    if (s === 'starting') return <Spinner />;
    return (
      <text flexShrink={0} fg={theme.dim}>
        ○
      </text>
    );
  };

  const detail = () => {
    const r = props.resource;
    if (r.status === 'running') return r.port ? `localhost:${r.port}` : 'Ready';
    if (r.status === 'starting') return 'Starting...';
    if (r.status === 'error') return r.error || 'Failed';
    return '';
  };
  const detailColor = () => (props.resource.status === 'error' ? theme.error : theme.muted);

  return (
    <box flexDirection="row">
      <text flexShrink={0} fg={theme.dim}>{`  ${props.isLast ? '└' : '├'} `}</text>
      {icon()}
      <text flexShrink={0}> </text>
      <text flexShrink={0} fg={theme.text}>
        <b>{props.resource.name}</b>
      </text>
      <Show when={detail()}>
        <text wrapMode="none" fg={detailColor()}>{`  ${detail()}`}</text>
      </Show>
    </box>
  );
};

const StartupStepRow = (props: { step: SetupStep; isLast: boolean }) => {
  const { theme } = useTheme();

  const icon = () => {
    const s = props.step.status;
    if (s === 'done')
      return (
        <text flexShrink={0} fg={theme.success}>
          ✓
        </text>
      );
    if (s === 'running') return <Spinner />;
    if (s === 'skipped')
      return (
        <text flexShrink={0} fg={theme.dim}>
          −
        </text>
      );
    return (
      <text flexShrink={0} fg={theme.dim}>
        ○
      </text>
    );
  };

  return (
    <box flexDirection="row">
      <text flexShrink={0} fg={theme.dim}>{`  ${props.isLast ? '└' : '├'} `}</text>
      {icon()}
      <text flexShrink={0} fg={theme.text}>{` ${props.step.label}`}</text>
      <Show when={props.step.detail}>
        <text wrapMode="none" fg={theme.muted}>{`  ${props.step.detail}`}</text>
      </Show>
    </box>
  );
};

const StartupHookRow = (props: { hook: Hook; isLast: boolean }) => {
  const { theme } = useTheme();

  const icon = () => {
    const s = props.hook.status;
    if (s === 'success')
      return (
        <text flexShrink={0} fg={theme.success}>
          ✓
        </text>
      );
    if (s === 'error')
      return (
        <text flexShrink={0} fg={theme.error}>
          ✗
        </text>
      );
    if (s === 'running') return <Spinner />;
    return (
      <text flexShrink={0} fg={theme.dim}>
        ○
      </text>
    );
  };

  const detail = () => {
    const h = props.hook;
    if (h.status === 'success') return h.duration ? formatDuration(h.duration) : 'Done';
    if (h.status === 'running') return h.message || 'Running...';
    if (h.status === 'error') return h.error || 'Failed';
    return '';
  };
  const detailColor = () => (props.hook.status === 'error' ? theme.error : theme.muted);

  return (
    <box flexDirection="row">
      <text flexShrink={0} fg={theme.dim}>{`  ${props.isLast ? '└' : '├'} `}</text>
      {icon()}
      <text flexShrink={0} fg={theme.text}>
        {' '}
        <b>{props.hook.name}</b>
      </text>
      <Show when={detail()}>
        <text wrapMode="none" fg={detailColor()}>{`  ${detail()}`}</text>
      </Show>
    </box>
  );
};

const StartupWorkloadRow = (props: { workload: Workload; isLast: boolean }) => {
  const { theme } = useTheme();
  const workloadColor = () => getWorkloadColor(props.workload.name);

  const icon = () => {
    const s = props.workload.status;
    if (s === 'running')
      return (
        <text flexShrink={0} fg={theme.success}>
          ✓
        </text>
      );
    if (s === 'error')
      return (
        <text flexShrink={0} fg={theme.error}>
          ✗
        </text>
      );
    if (s === 'starting') return <Spinner />;
    return (
      <text flexShrink={0} fg={theme.dim}>
        ○
      </text>
    );
  };

  const detail = () => {
    const w = props.workload;
    if (w.status === 'running') return w.url || w.size || 'Ready';
    if (w.status === 'starting') return w.statusMessage || 'Starting...';
    if (w.status === 'error') return w.error || 'Failed';
    return '';
  };
  const detailColor = () => (props.workload.status === 'error' ? theme.error : theme.muted);
  const shortName = () => truncateText(props.workload.name, STARTUP_NAME_WIDTH).padEnd(STARTUP_NAME_WIDTH);
  const detailIsUrl = () => isHttpUrl(detail());
  const maxDetailLen = SIDEBAR_INNER - 4 - 1 - 1 - STARTUP_NAME_WIDTH - 1 - 2;
  const detailDisplay = () => (detailIsUrl() ? detail() : truncateText(detail(), maxDetailLen));

  return (
    <box flexDirection="row" height={1}>
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>{`  ${props.isLast ? '└' : '├'} `}</text>
      {icon()}
      <text flexShrink={0} wrapMode="none" fg={workloadColor()}>
        {' '}
        <b>{shortName()}</b>
      </text>
      <Show when={detail()}>
        <text wrapMode="none" fg={detailIsUrl() ? theme.muted : detailColor()}>
          {'  '}
          <Show when={detailIsUrl()} fallback={detailDisplay()}>
            <a href={detail()}>{detail()}</a>
          </Show>
        </text>
      </Show>
    </box>
  );
};

export const StartupSidebar = () => {
  const { theme } = useTheme();
  const localResources = createDevSignal((s) => s.localResources);
  const setupSteps = createDevSignal((s) => s.setupSteps);
  const hooks = createDevSignal((s) => s.hooks);
  const workloads = createDevSignal((s) => s.workloads);
  const sidebarMode = createDevSignal((s) => s.sidebarMode);

  const resStatus = () => sectionStatus(localResources(), ['running', 'stopped', 'error'], ['starting']);
  const tunnelStatus = () => sectionStatus(setupSteps(), ['done', 'skipped'], ['running']);
  const hookStatus = () => sectionStatus(hooks(), ['success', 'error'], ['running']);
  const wlStatus = () => sectionStatus(workloads(), ['running', 'stopped', 'error'], ['starting']);

  const sidebarWidth = () => (sidebarMode() === 'fullscreen' ? '100%' : SIDEBAR_WIDTH);

  return (
    <box
      flexDirection="column"
      width={sidebarWidth()}
      flexGrow={sidebarMode() === 'fullscreen' ? 1 : undefined}
      borderStyle="single"
      borderColor={theme.border}
      paddingX={1}
    >
      <SidebarHeader title="Setup" />
      <box height={1} />
      <scrollbox flexGrow={1}>
        <Show when={localResources().length > 0}>
          <box flexDirection="column" paddingBottom={1}>
            <box flexDirection="row">
              <SectionIcon status={resStatus()} />
              <text fg={theme.text}>{' Local resources'}</text>
            </box>
            <For each={localResources()}>
              {(r, idx) => <StartupResourceRow resource={r} isLast={idx() === localResources().length - 1} />}
            </For>
          </box>
        </Show>
        <Show when={setupSteps().length > 0}>
          <box flexDirection="column" paddingBottom={1}>
            <box flexDirection="row">
              <SectionIcon status={tunnelStatus()} />
              <text fg={theme.text}>{' Creating tunnels'}</text>
            </box>
            <For each={setupSteps()}>
              {(s, idx) => <StartupStepRow step={s} isLast={idx() === setupSteps().length - 1} />}
            </For>
          </box>
        </Show>
        <Show when={hooks().length > 0}>
          <box flexDirection="column" paddingBottom={1}>
            <box flexDirection="row">
              <SectionIcon status={hookStatus()} />
              <text fg={theme.text}>{' Executing hooks'}</text>
            </box>
            <For each={hooks()}>{(h, idx) => <StartupHookRow hook={h} isLast={idx() === hooks().length - 1} />}</For>
          </box>
        </Show>
        <Show when={workloads().length > 0}>
          <box flexDirection="column" paddingBottom={1}>
            <box flexDirection="row">
              <SectionIcon status={wlStatus()} />
              <text fg={theme.text}>{' Starting workloads'}</text>
            </box>
            <For each={workloads()}>
              {(w, idx) => <StartupWorkloadRow workload={w} isLast={idx() === workloads().length - 1} />}
            </For>
          </box>
        </Show>
      </scrollbox>
    </box>
  );
};
