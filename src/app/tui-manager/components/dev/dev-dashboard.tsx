import { Show, For, ErrorBoundary } from 'solid-js';
import { useKeyboard, useRenderer, useSelectionHandler } from '@opentui/solid';
import type { Selection } from '@opentui/core';
import { createDevSignal } from './use-dev-state';
import { devTuiState } from '../../dev-tui/state';
import { formatDuration, getWorkloadColor } from '../../dev-tui/utils';
import { Spinner } from '../shared/spinner';
import { COLORS } from '../shared/colors';
import { truncateText, isHttpUrl, formatTimestamp } from '../shared/text-helpers';
import { KeyHints } from '../shared/key-hint';
import type {
  Hook,
  LocalResource,
  LogEntry,
  RebuildWorkloadState,
  SetupStep,
  Workload,
  WorkloadType
} from '../../dev-tui/types';

type DevDashboardProps = {
  onRebuild?: (workloadName: string | null) => void;
  onQuit?: () => void;
  onRenderError?: (error: Error) => void;
};

const SIDEBAR_WIDTH = 42;
const SIDEBAR_INNER = SIDEBAR_WIDTH - 4; // minus 2 border + 2 paddingX
const SOURCE_LABEL_WIDTH = 16;
const STARTUP_NAME_WIDTH = 16;

const WORKLOAD_TYPE_ICONS: Record<WorkloadType, { icon: string; color: string }> = {
  container: { icon: '⬢', color: '#38bdf8' },
  function: { icon: 'λ', color: '#f97316' },
  'hosting-bucket': { icon: '☁', color: '#60a5fa' },
  'nextjs-web': { icon: '▲', color: COLORS.textBright },
  'ssr-web': { icon: '◉', color: COLORS.purple }
};

const RESOURCE_TYPE_ICONS: Record<string, string> = {
  postgres: '♦',
  mysql: '♦',
  mariadb: '♦',
  redis: '◆',
  dynamodb: '⚡',
  opensearch: '◎'
};

const LEVEL_COLORS: Record<string, string> = {
  error: COLORS.error,
  warn: COLORS.warning,
  info: COLORS.text,
  debug: COLORS.dim
};

const copyToClipboard = (text: string) => {
  const base64 = Buffer.from(text).toString('base64');
  process.stdout.write(`\x1B]52;c;${base64}\x07`);
  if (process.platform === 'win32') {
    import('node:child_process').then(({ execFile }) => {
      execFile('powershell', ['-NoProfile', '-Command', 'Set-Clipboard', '-Value', text], { timeout: 3000 }, () => {});
    });
  }
};

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

const StatusDot = (props: { status: string }) => {
  if (props.status === 'running')
    return (
      <text flexShrink={0} fg={COLORS.success}>
        ●
      </text>
    );
  if (props.status === 'error')
    return (
      <text flexShrink={0} fg={COLORS.error}>
        ●
      </text>
    );
  if (props.status === 'starting') return <Spinner />;
  return (
    <text flexShrink={0} fg={COLORS.dim}>
      ○
    </text>
  );
};

const SectionIcon = (props: { status: 'pending' | 'running' | 'success' | 'error' }) => {
  if (props.status === 'success')
    return (
      <text flexShrink={0} fg={COLORS.success}>
        ✓
      </text>
    );
  if (props.status === 'error')
    return (
      <text flexShrink={0} fg={COLORS.error}>
        ✗
      </text>
    );
  if (props.status === 'running') return <Spinner />;
  return (
    <text flexShrink={0} fg={COLORS.dim}>
      ○
    </text>
  );
};

// ── Header ──────────────────────────────────────────────────────────────────

const DevHeader = () => {
  const projectName = createDevSignal((s) => s.projectName);
  const stageName = createDevSignal((s) => s.stageName);
  const phase = createDevSignal((s) => s.phase);
  const workloads = createDevSignal((s) => s.workloads);
  const sidebarVisible = createDevSignal((s) => s.sidebarVisible);

  const runningCount = () => workloads().filter((w) => w.status === 'running').length;
  const errorCount = () => workloads().filter((w) => w.status === 'error').length;
  const phaseColor = () => (phase() === 'rebuilding' ? COLORS.rebuild : COLORS.running);
  const phaseLabel = () => (phase() === 'rebuilding' ? 'REBUILDING' : phase() === 'startup' ? 'STARTING' : 'DEV');

  return (
    <box flexDirection="row" height={1} paddingX={1} flexShrink={0}>
      <text flexShrink={0} fg={phaseColor()}>
        <b>{phaseLabel()}</b>
      </text>
      <text flexShrink={0} fg={COLORS.textBright}>
        {'  '}
        {projectName()}
      </text>
      <text flexShrink={0} fg={COLORS.pending}>
        {' '}
        →{' '}
      </text>
      <text flexShrink={0} fg={COLORS.textBright}>
        {stageName()}
      </text>
      <Show when={!sidebarVisible() && phase() === 'running'}>
        <text flexShrink={0} fg={COLORS.muted}>
          {'  '}
          {runningCount() > 0 ? `✓${runningCount()}` : ''}
          {errorCount() > 0 ? ` ✗${errorCount()}` : ''}
        </text>
      </Show>
    </box>
  );
};

// ── Workload row (running sidebar) ──────────────────────────────────────────

const WorkloadRow = (props: {
  workload: Workload;
  index: number;
  isSelected: boolean;
  rebuildState?: RebuildWorkloadState;
}) => {
  const isRebuilding = () =>
    props.rebuildState && props.rebuildState.status !== 'done' && props.rebuildState.status !== 'error';
  const numColor = () => (props.isSelected ? COLORS.running : COLORS.muted);
  const workloadColor = () => getWorkloadColor(props.workload.name);
  const typeIcon = () => WORKLOAD_TYPE_ICONS[props.workload.type] || { icon: '◇', color: COLORS.dim };

  const detailText = () => {
    const rs = props.rebuildState;
    const w = props.workload;

    if (isRebuilding() && rs?.step) {
      const stepLabels: Record<string, string> = {
        stopping: 'Stopping',
        packaging: 'Packaging',
        starting: 'Starting',
        'updating-code': 'Updating',
        done: 'Done',
        error: 'Failed'
      };
      let text = stepLabels[rs.step] || rs.step;
      if (rs.stepDetail) text += ` ${rs.stepDetail}`;
      return text;
    }
    if (rs?.status === 'done') {
      return `✓ ${formatDuration((rs.endTime || Date.now()) - rs.startTime)}`;
    }
    if (rs?.status === 'error') {
      return rs.error || 'Failed';
    }
    if (w.status === 'running') {
      if (w.url) return w.url;
      if (w.port) return `localhost:${w.port}`;
    }
    if (w.status === 'starting') return w.statusMessage || 'Starting...';
    if (w.status === 'error') return w.error || 'Failed';
    return '';
  };

  const detailColor = () => {
    const w = props.workload;
    const rs = props.rebuildState;
    if (w.status === 'error' && !isRebuilding()) return COLORS.error;
    if (rs?.status === 'error') return COLORS.error;
    if (rs?.status === 'done') return COLORS.success;
    return COLORS.muted;
  };

  const shortName = () => truncateText(props.workload.name, 16);
  const indexLabel = () => `[${props.index + 1}]`;

  const maxDetailLen = SIDEBAR_INNER - 5; // paddingLeft={5}
  const detailIsUrl = () => isHttpUrl(detailText());
  const detailDisplay = () => (detailIsUrl() ? detailText() : truncateText(detailText(), maxDetailLen));

  return (
    <box flexDirection="column" paddingBottom={1}>
      <box flexDirection="row">
        <text flexShrink={0} wrapMode="none" fg={numColor()}>{`${indexLabel()} `}</text>
        <Show when={isRebuilding()} fallback={<StatusDot status={props.workload.status} />}>
          <Spinner color={COLORS.rebuild} />
        </Show>
        <text flexShrink={0} wrapMode="none">
          {' '}
        </text>
        <text flexShrink={0} wrapMode="none" fg={workloadColor()}>
          <b>{shortName()}</b>
        </text>
        <text flexShrink={0} wrapMode="none" fg={typeIcon().color}>{` ${typeIcon().icon}`}</text>
      </box>
      <Show when={detailText()}>
        <box flexDirection="row" paddingLeft={5}>
          <text wrapMode="none" fg={detailIsUrl() ? COLORS.muted : detailColor()}>
            <Show when={detailIsUrl()} fallback={detailDisplay()}>
              <a href={detailText()}>{detailText()}</a>
            </Show>
          </text>
        </box>
      </Show>
    </box>
  );
};

// ── Resource row (running sidebar) ──────────────────────────────────────────

const ResourceRow = (props: { resource: LocalResource }) => {
  const typeIcon = () => RESOURCE_TYPE_ICONS[props.resource.type] || '◇';
  const detail = () => {
    const r = props.resource;
    if (r.status === 'running' && r.port) return `localhost:${r.port}`;
    if (r.status === 'starting') return 'starting...';
    if (r.status === 'error') return r.error || 'failed';
    return '';
  };
  const detailColor = () => (props.resource.status === 'error' ? COLORS.error : COLORS.muted);

  return (
    <box flexDirection="row" paddingBottom={1}>
      <text flexShrink={0}> </text>
      <StatusDot status={props.resource.status} />
      <text flexShrink={0}> {typeIcon()} </text>
      <text flexShrink={0} fg={COLORS.text}>
        {props.resource.name}
      </text>
      <Show when={detail()}>
        <text wrapMode="none" fg={detailColor()}>{`  ${detail()}`}</text>
      </Show>
    </box>
  );
};

// ── Startup sidebar rows ────────────────────────────────────────────────────

const StartupResourceRow = (props: { resource: LocalResource; isLast: boolean }) => {
  const icon = () => {
    const s = props.resource.status;
    if (s === 'running')
      return (
        <text flexShrink={0} fg={COLORS.success}>
          ✓
        </text>
      );
    if (s === 'error')
      return (
        <text flexShrink={0} fg={COLORS.error}>
          ✗
        </text>
      );
    if (s === 'starting') return <Spinner />;
    return (
      <text flexShrink={0} fg={COLORS.dim}>
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
  const detailColor = () => (props.resource.status === 'error' ? COLORS.error : COLORS.muted);

  return (
    <box flexDirection="row">
      <text flexShrink={0} fg={COLORS.dim}>{`  ${props.isLast ? '└' : '├'} `}</text>
      {icon()}
      <text flexShrink={0}> </text>
      <text flexShrink={0} fg={COLORS.text}>
        <b>{props.resource.name}</b>
      </text>
      <Show when={detail()}>
        <text wrapMode="none" fg={detailColor()}>{`  ${detail()}`}</text>
      </Show>
    </box>
  );
};

const StartupStepRow = (props: { step: SetupStep; isLast: boolean }) => {
  const icon = () => {
    const s = props.step.status;
    if (s === 'done')
      return (
        <text flexShrink={0} fg={COLORS.success}>
          ✓
        </text>
      );
    if (s === 'running') return <Spinner />;
    if (s === 'skipped')
      return (
        <text flexShrink={0} fg={COLORS.dim}>
          −
        </text>
      );
    return (
      <text flexShrink={0} fg={COLORS.dim}>
        ○
      </text>
    );
  };

  return (
    <box flexDirection="row">
      <text flexShrink={0} fg={COLORS.dim}>{`  ${props.isLast ? '└' : '├'} `}</text>
      {icon()}
      <text flexShrink={0} fg={COLORS.text}>{` ${props.step.label}`}</text>
      <Show when={props.step.detail}>
        <text wrapMode="none" fg={COLORS.muted}>{`  ${props.step.detail}`}</text>
      </Show>
    </box>
  );
};

const StartupHookRow = (props: { hook: Hook; isLast: boolean }) => {
  const icon = () => {
    const s = props.hook.status;
    if (s === 'success')
      return (
        <text flexShrink={0} fg={COLORS.success}>
          ✓
        </text>
      );
    if (s === 'error')
      return (
        <text flexShrink={0} fg={COLORS.error}>
          ✗
        </text>
      );
    if (s === 'running') return <Spinner />;
    return (
      <text flexShrink={0} fg={COLORS.dim}>
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
  const detailColor = () => (props.hook.status === 'error' ? COLORS.error : COLORS.muted);

  return (
    <box flexDirection="row">
      <text flexShrink={0} fg={COLORS.dim}>{`  ${props.isLast ? '└' : '├'} `}</text>
      {icon()}
      <text flexShrink={0} fg={COLORS.text}>
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
  const workloadColor = () => getWorkloadColor(props.workload.name);
  const typeIcon = () => WORKLOAD_TYPE_ICONS[props.workload.type] || { icon: '◇', color: COLORS.dim };

  const icon = () => {
    const s = props.workload.status;
    if (s === 'running')
      return (
        <text flexShrink={0} fg={COLORS.success}>
          ✓
        </text>
      );
    if (s === 'error')
      return (
        <text flexShrink={0} fg={COLORS.error}>
          ✗
        </text>
      );
    if (s === 'starting') return <Spinner />;
    return (
      <text flexShrink={0} fg={COLORS.dim}>
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
  const detailColor = () => (props.workload.status === 'error' ? COLORS.error : COLORS.muted);
  const shortName = () => truncateText(props.workload.name, STARTUP_NAME_WIDTH).padEnd(STARTUP_NAME_WIDTH);
  const detailIsUrl = () => isHttpUrl(detail());
  // 4 (tree prefix "  ├ ") + 1 (icon) + 1 (space) + name + 1 (type icon) + 2 ("  " before detail)
  const maxDetailLen = SIDEBAR_INNER - 4 - 1 - 1 - STARTUP_NAME_WIDTH - 1 - 2;
  const detailDisplay = () => (detailIsUrl() ? detail() : truncateText(detail(), maxDetailLen));

  return (
    <box flexDirection="row" height={1}>
      <text flexShrink={0} wrapMode="none" fg={COLORS.dim}>{`  ${props.isLast ? '└' : '├'} `}</text>
      {icon()}
      <text flexShrink={0} wrapMode="none" fg={workloadColor()}>
        {' '}
        <b>{shortName()}</b>
      </text>
      <text flexShrink={0} wrapMode="none" fg={typeIcon().color}>{`${typeIcon().icon}`}</text>
      <Show when={detail()}>
        <text wrapMode="none" fg={detailIsUrl() ? COLORS.muted : detailColor()}>
          {'  '}
          <Show when={detailIsUrl()} fallback={detailDisplay()}>
            <a href={detail()}>{detail()}</a>
          </Show>
        </text>
      </Show>
    </box>
  );
};

// ── Startup sidebar ─────────────────────────────────────────────────────────

const StartupSidebar = () => {
  const localResources = createDevSignal((s) => s.localResources);
  const setupSteps = createDevSignal((s) => s.setupSteps);
  const hooks = createDevSignal((s) => s.hooks);
  const workloads = createDevSignal((s) => s.workloads);

  const resStatus = () => sectionStatus(localResources(), ['running', 'stopped', 'error'], ['starting']);
  const tunnelStatus = () => sectionStatus(setupSteps(), ['done', 'skipped'], ['running']);
  const hookStatus = () => sectionStatus(hooks(), ['success', 'error'], ['running']);
  const wlStatus = () => sectionStatus(workloads(), ['running', 'stopped', 'error'], ['starting']);

  return (
    <box flexDirection="column" width={SIDEBAR_WIDTH} borderStyle="single" borderColor={COLORS.border} paddingX={1}>
      <text fg={COLORS.muted}>
        <b>Setup</b>
      </text>
      <box height={1} />
      <scrollbox flexGrow={1}>
        <Show when={localResources().length > 0}>
          <box flexDirection="column" paddingBottom={1}>
            <box flexDirection="row">
              <SectionIcon status={resStatus()} />
              <text fg={COLORS.text}>{' Local resources'}</text>
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
              <text fg={COLORS.text}>{' Creating tunnels'}</text>
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
              <text fg={COLORS.text}>{' Executing hooks'}</text>
            </box>
            <For each={hooks()}>{(h, idx) => <StartupHookRow hook={h} isLast={idx() === hooks().length - 1} />}</For>
          </box>
        </Show>
        <Show when={workloads().length > 0}>
          <box flexDirection="column" paddingBottom={1}>
            <box flexDirection="row">
              <SectionIcon status={wlStatus()} />
              <text fg={COLORS.text}>{' Starting workloads'}</text>
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

// ── Running sidebar ─────────────────────────────────────────────────────────

const RunningSidebar = () => {
  const workloads = createDevSignal((s) => s.workloads);
  const localResources = createDevSignal((s) => s.localResources);
  const selectedLogFilter = createDevSignal((s) => s.selectedLogFilter);
  const rebuildingWorkloads = createDevSignal((s) => s.rebuildingWorkloads);

  const rebuildMap = () => {
    const map = new Map<string, RebuildWorkloadState>();
    for (const rw of rebuildingWorkloads()) {
      map.set(rw.name, rw);
    }
    return map;
  };

  const activeWorkloads = () =>
    workloads().filter((w) => w.status === 'running' || w.status === 'error' || w.status === 'starting');

  return (
    <box flexDirection="column" width={SIDEBAR_WIDTH} borderStyle="single" borderColor={COLORS.border} paddingX={1}>
      <text fg={COLORS.muted}>
        <b>Workloads</b>
      </text>
      <box height={1} />
      <scrollbox flexGrow={1}>
        <For each={activeWorkloads()}>
          {(workload, idx) => (
            <WorkloadRow
              workload={workload}
              index={idx()}
              isSelected={selectedLogFilter() === workload.name}
              rebuildState={rebuildMap().get(workload.name)}
            />
          )}
        </For>
        <Show when={localResources().length > 0}>
          <text fg={COLORS.muted}>
            <b>Resources</b>
          </text>
          <box height={1} />
          <For each={localResources()}>{(resource) => <ResourceRow resource={resource} />}</For>
        </Show>
      </scrollbox>
    </box>
  );
};

// ── Log panel ───────────────────────────────────────────────────────────────

const LogRow = (props: { entry: LogEntry; showSource: boolean }) => {
  const sourceColor = () => (props.entry.source === 'system' ? COLORS.dim : getWorkloadColor(props.entry.source));
  const msgColor = () => LEVEL_COLORS[props.entry.level] || COLORS.text;
  const sourceLabel = () => truncateText(props.entry.source, SOURCE_LABEL_WIDTH).padEnd(SOURCE_LABEL_WIDTH);

  return (
    <box flexDirection="row">
      <text flexShrink={0} wrapMode="none" fg={COLORS.dim}>
        {formatTimestamp(props.entry.timestamp)}{' '}
      </text>
      <Show when={props.showSource}>
        <text flexShrink={0} wrapMode="none" fg={sourceColor()}>
          <b>{sourceLabel()}</b>{' '}
        </text>
      </Show>
      <text fg={msgColor()}>{props.entry.message}</text>
    </box>
  );
};

const DevLogPanel = () => {
  const logs = createDevSignal((s) => s.logs);
  const selectedLogFilter = createDevSignal((s) => s.selectedLogFilter);
  const workloads = createDevSignal((s) => s.workloads);

  const filteredLogs = () => {
    const filter = selectedLogFilter();
    if (!filter) return logs();
    return logs().filter((l) => l.source === filter || l.sourceType === 'system');
  };

  const showSource = () => !selectedLogFilter() && workloads().length > 1;
  const filterLabel = () => (selectedLogFilter() ? `${selectedLogFilter()}` : 'all workloads');

  return (
    <box flexDirection="column" borderStyle="single" borderColor={COLORS.border} flexGrow={1} paddingX={1}>
      <box flexDirection="row" height={1} flexShrink={0}>
        <text flexShrink={0} fg={COLORS.muted}>
          <b>Logs</b>
        </text>
        <text flexShrink={0} fg={COLORS.dim}>{`  [${filterLabel()}]`}</text>
        <Show when={selectedLogFilter()}>
          <text flexShrink={0} fg={COLORS.dim}>
            {'  esc=all'}
          </text>
        </Show>
        <box flexGrow={1} />
        <text flexShrink={0} fg={COLORS.dim}>
          ↕ scroll
        </text>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true} focused>
        <Show when={filteredLogs().length > 0} fallback={<text fg={COLORS.dim}>Waiting for logs...</text>}>
          <For each={filteredLogs()}>{(entry) => <LogRow entry={entry} showSource={showSource()} />}</For>
        </Show>
      </scrollbox>
    </box>
  );
};

// ── Footer ──────────────────────────────────────────────────────────────────

const DevFooter = () => {
  const phase = createDevSignal((s) => s.phase);
  const workloads = createDevSignal((s) => s.workloads);
  const isQuitting = createDevSignal((s) => s.isQuitting);
  const selectedLogFilter = createDevSignal((s) => s.selectedLogFilter);

  const activeCount = () => workloads().filter((w) => w.status === 'running' || w.status === 'error').length;

  const hints = (): { key: string; label: string }[] => {
    if (phase() === 'startup') return [{ key: 'ctrl+c', label: 'quit' }];

    const items: { key: string; label: string }[] = [];
    if (activeCount() > 0 && !selectedLogFilter()) {
      items.push({ key: `1-${activeCount()}`, label: 'filter logs by workload' });
    }
    if (activeCount() > 0 && selectedLogFilter()) {
      items.push({ key: `1-${activeCount()}`, label: 'rebuild workload' });
    }
    if (selectedLogFilter()) {
      items.push({ key: 'esc', label: 'show all logs' });
      items.push({ key: 'r', label: 'rebuild selected' });
    } else {
      items.push({ key: 'r', label: 'rebuild' });
    }
    items.push(
      { key: 'a', label: 'rebuild all' },
      { key: 'c', label: 'clear logs' },
      { key: 's', label: 'toggle sidebar' },
      { key: 'ctrl+c', label: 'quit' }
    );
    return items;
  };

  return (
    <box height={1} paddingX={1} flexShrink={0}>
      <Show
        when={!isQuitting()}
        fallback={
          <text wrapMode="none" fg={COLORS.warning}>
            Stopping dev mode...
          </text>
        }
      >
        <KeyHints hints={hints()} />
      </Show>
    </box>
  );
};

// ── Main layout ─────────────────────────────────────────────────────────────

const DevDashboardInner = (props: Pick<DevDashboardProps, 'onRebuild' | 'onQuit'>) => {
  const phase = createDevSignal((s) => s.phase);
  const sidebarVisible = createDevSignal((s) => s.sidebarVisible);
  const selectedLogFilter = createDevSignal((s) => s.selectedLogFilter);
  const renderer = useRenderer();

  useSelectionHandler((selection: Selection) => {
    const text = selection.getSelectedText();
    if (text) copyToClipboard(text);
  });

  useKeyboard((key) => {
    if (phase() === 'startup') {
      if (key.ctrl && key.name === 'c') {
        props.onQuit?.();
      }
      return;
    }

    if (key.ctrl && key.name === 'c') {
      const sel = renderer.getSelection();
      if (sel) {
        const text = sel.getSelectedText();
        if (text) copyToClipboard(text);
        renderer.clearSelection();
        return;
      }
      props.onQuit?.();
      return;
    }

    if (key.name === 'escape') {
      const sel = renderer.getSelection();
      if (sel) {
        renderer.clearSelection();
        return;
      }
      if (selectedLogFilter()) {
        devTuiState.setLogFilter(null);
      }
      return;
    }

    if (phase() === 'rebuilding') return;

    const state = devTuiState.getState();
    const activeWorkloads = state.workloads.filter((w) => w.status === 'running' || w.status === 'error');

    if (key.name === 's') {
      devTuiState.toggleSidebar();
      return;
    }

    if (key.name === 'c') {
      devTuiState.clearLogs();
      return;
    }

    if (key.name === 'a') {
      props.onRebuild?.(null);
      return;
    }

    if (key.name === 'r') {
      if (selectedLogFilter()) {
        props.onRebuild?.(selectedLogFilter());
      } else if (activeWorkloads.length === 1) {
        props.onRebuild?.(activeWorkloads[0].name);
      }
      return;
    }

    const num = parseInt(key.name, 10);
    if (num >= 1 && num <= activeWorkloads.length) {
      if (selectedLogFilter()) {
        props.onRebuild?.(activeWorkloads[num - 1].name);
      } else {
        devTuiState.setLogFilter(activeWorkloads[num - 1].name);
      }
    }
  });

  return (
    <box flexDirection="column" width="100%" height="100%">
      <DevHeader />
      <box flexDirection="row" flexGrow={1}>
        <Show when={sidebarVisible()}>
          <Show when={phase() !== 'startup'} fallback={<StartupSidebar />}>
            <RunningSidebar />
          </Show>
        </Show>
        <DevLogPanel />
      </box>
      <DevFooter />
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
      <DevDashboardInner onRebuild={props.onRebuild} onQuit={props.onQuit} />
    </ErrorBoundary>
  );
};
