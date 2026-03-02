/** @jsxImportSource @opentui/react */

import React, { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { useKeyboard } from '@opentui/react';
import { devTuiState } from '../state';
import { formatDuration, getWorkloadColor } from '../utils';
import type {
  DevTuiState,
  Hook,
  LocalResource,
  LogEntry,
  RebuildWorkloadState,
  SetupStep,
  Workload,
  WorkloadType
} from '../types';

const subscribe = (listener: () => void) => devTuiState.subscribe(listener);
const useDevState = <T,>(selector: (s: DevTuiState) => T): T =>
  useSyncExternalStore(
    subscribe,
    () => selector(devTuiState.getState()),
    () => selector(devTuiState.getState())
  );

type DevDashboardProps = {
  onRebuild?: (workloadName: string | null) => void;
  onQuit?: () => void;
  onRenderError?: (error: Error) => void;
};

const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SIDEBAR_WIDTH = 42;

const COLOR_PENDING = '#6b7280';
const COLOR_RUNNING = '#06b6d4';
const COLOR_SUCCESS = '#22c55e';
const COLOR_ERROR = '#ef4444';
const COLOR_WARNING = '#eab308';
const COLOR_REBUILD = '#c084fc';
const COLOR_DIM = '#4b5563';
const COLOR_BORDER = '#374151';
const COLOR_TEXT = '#d1d5db';
const COLOR_TEXT_BRIGHT = '#e5e7eb';
const COLOR_MUTED = '#9ca3af';

const Spinner = ({ color = COLOR_RUNNING }: { color?: string }) => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % BRAILLE_FRAMES.length), 80);
    return () => clearInterval(id);
  }, []);
  return <text fg={color}>{BRAILLE_FRAMES[frame]}</text>;
};

const StatusDot = ({ status }: { status: string }) => {
  if (status === 'running') return <text fg={COLOR_SUCCESS}>●</text>;
  if (status === 'error') return <text fg={COLOR_ERROR}>●</text>;
  if (status === 'starting') return <Spinner />;
  if (status === 'stopped') return <text fg={COLOR_DIM}>○</text>;
  return <text fg={COLOR_DIM}>○</text>;
};

const WORKLOAD_TYPE_ICONS: Record<WorkloadType, { icon: string; color: string }> = {
  container: { icon: '⬢', color: '#38bdf8' },
  function: { icon: 'λ', color: '#f97316' },
  'hosting-bucket': { icon: '☁', color: '#60a5fa' },
  'nextjs-web': { icon: '▲', color: '#e5e7eb' },
  'ssr-web': { icon: '◉', color: '#a78bfa' }
};

const truncateText = (value: string, maxLen: number): string => {
  if (maxLen < 4) return value.slice(0, Math.max(0, maxLen));
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1)}…`;
};

const truncateUrlForDisplay = (url: string, maxLen: number): string => {
  if (url.length <= maxLen) return url;
  if (maxLen < 10) return truncateText(url, maxLen);
  const tailLen = Math.min(10, Math.max(5, Math.floor(maxLen / 3)));
  const headLen = Math.max(1, maxLen - tailLen - 1);
  return `${url.slice(0, headLen)}…${url.slice(-tailLen)}`;
};

const isHttpUrl = (value: string): boolean => value.startsWith('http://') || value.startsWith('https://');

const RESOURCE_TYPE_ICONS: Record<string, string> = {
  postgres: '🐘',
  mysql: '🐬',
  mariadb: '🐬',
  redis: '◆',
  dynamodb: '⚡',
  opensearch: '🔍'
};

const DevHeader = () => {
  const projectName = useDevState((s) => s.projectName);
  const stageName = useDevState((s) => s.stageName);
  const phase = useDevState((s) => s.phase);
  const startTime = useDevState((s) => s.startTime);
  const workloads = useDevState((s) => s.workloads);
  const sidebarVisible = useDevState((s) => s.sidebarVisible);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = formatDuration(Date.now() - startTime);
  const runningCount = workloads.filter((w) => w.status === 'running').length;
  const errorCount = workloads.filter((w) => w.status === 'error').length;
  const phaseColor = phase === 'rebuilding' ? COLOR_REBUILD : COLOR_RUNNING;
  const phaseLabel = phase === 'rebuilding' ? 'REBUILDING' : phase === 'startup' ? 'STARTING' : 'DEV';

  return (
    <box flexDirection="row" height={1} paddingX={1}>
      <text fg={phaseColor}>
        <b>{phaseLabel}</b>
      </text>
      <text fg={COLOR_TEXT_BRIGHT}>
        {'  '}
        {projectName}
      </text>
      <text fg={COLOR_PENDING}> → </text>
      <text fg={COLOR_TEXT_BRIGHT}>{stageName}</text>
      {!sidebarVisible && phase === 'running' ? (
        <text fg={COLOR_MUTED}>
          {'  '}
          {runningCount > 0 ? `✓${runningCount}` : ''}
          {errorCount > 0 ? ` ✗${errorCount}` : ''}
        </text>
      ) : null}
      <box flexGrow={1} />
      <text fg={COLOR_PENDING}>{elapsed}</text>
    </box>
  );
};

const WorkloadRow = ({
  workload,
  index,
  isSelected,
  rebuildState
}: {
  workload: Workload;
  index: number;
  isSelected: boolean;
  rebuildState?: RebuildWorkloadState;
}) => {
  const isRebuilding = rebuildState && rebuildState.status !== 'done' && rebuildState.status !== 'error';
  const numColor = isSelected ? COLOR_RUNNING : COLOR_MUTED;
  const workloadColor = getWorkloadColor(workload.name);
  const icon = isRebuilding ? <Spinner color={COLOR_REBUILD} /> : <StatusDot status={workload.status} />;
  const typeIcon = WORKLOAD_TYPE_ICONS[workload.type] || { icon: '◇', color: COLOR_DIM };

  let detailText = '';
  if (isRebuilding && rebuildState?.step) {
    const stepLabels: Record<string, string> = {
      stopping: 'Stopping',
      packaging: 'Packaging',
      starting: 'Starting',
      'updating-code': 'Updating',
      done: 'Done',
      error: 'Failed'
    };
    detailText = stepLabels[rebuildState.step] || rebuildState.step;
    if (rebuildState.stepDetail) detailText += ` ${rebuildState.stepDetail}`;
  } else if (rebuildState?.status === 'done') {
    const dur = formatDuration((rebuildState.endTime || Date.now()) - rebuildState.startTime);
    detailText = `✓ ${dur}`;
  } else if (rebuildState?.status === 'error') {
    detailText = rebuildState.error || 'Failed';
  } else if (workload.status === 'running') {
    if (workload.url) detailText = workload.url;
    else if (workload.port) detailText = `localhost:${workload.port}`;
  } else if (workload.status === 'starting') {
    detailText = workload.statusMessage || 'Starting...';
  } else if (workload.status === 'error') {
    detailText = workload.error || 'Failed';
  }

  const detailColor =
    workload.status === 'error' && !isRebuilding
      ? COLOR_ERROR
      : rebuildState?.status === 'error'
        ? COLOR_ERROR
        : rebuildState?.status === 'done'
          ? COLOR_SUCCESS
          : COLOR_MUTED;

  const shortName = truncateText(workload.name, 16);
  const indexLabel = `[${index + 1}]`;

  if (isHttpUrl(detailText)) {
    const rowWidth = SIDEBAR_WIDTH - 4;
    const staticLen = indexLabel.length + 1 + 1 + 1 + shortName.length + 1 + 1 + 1;
    const maxUrlLen = Math.max(12, Math.min(16, rowWidth - staticLen - 2));
    const displayUrl = truncateUrlForDisplay(detailText, maxUrlLen);

    return (
      <box flexDirection="row" paddingBottom={1}>
        <text fg={numColor}>{`${indexLabel} `}</text>
        {icon}
        <text> </text>
        <text fg={workloadColor}>
          <b>{shortName}</b>
        </text>
        <text fg={typeIcon.color}>{` ${typeIcon.icon} `}</text>
        <text fg={COLOR_MUTED}>
          <a href={detailText}>{displayUrl}</a>
        </text>
      </box>
    );
  }

  return (
    <box flexDirection="column" paddingBottom={1}>
      <box flexDirection="row">
        <text fg={numColor}>{`${indexLabel} `}</text>
        {icon}
        <text> </text>
        <text fg={workloadColor}>
          <b>{shortName}</b>
        </text>
        <text fg={typeIcon.color}>{` ${typeIcon.icon}`}</text>
      </box>
      {detailText ? (
        <text paddingLeft={5} fg={detailColor}>
          {truncateText(detailText, SIDEBAR_WIDTH - 8)}
        </text>
      ) : null}
    </box>
  );
};

const ResourceRow = ({ resource }: { resource: LocalResource }) => {
  const typeIcon = RESOURCE_TYPE_ICONS[resource.type] || '◇';
  let detail = '';
  if (resource.status === 'running' && resource.port) {
    detail = `localhost:${resource.port}`;
  } else if (resource.status === 'starting') {
    detail = 'starting...';
  } else if (resource.status === 'error') {
    detail = resource.error || 'failed';
  }
  const detailColor = resource.status === 'error' ? COLOR_ERROR : COLOR_MUTED;

  return (
    <box flexDirection="row" paddingBottom={1}>
      <text> </text>
      <StatusDot status={resource.status} />
      <text> {typeIcon} </text>
      <text fg={COLOR_TEXT}>{resource.name}</text>
      {detail ? <text fg={detailColor}>{`  ${detail}`}</text> : null}
    </box>
  );
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

const SectionIcon = ({ status }: { status: 'pending' | 'running' | 'success' | 'error' }) => {
  if (status === 'success') return <text fg={COLOR_SUCCESS}>✓</text>;
  if (status === 'error') return <text fg={COLOR_ERROR}>✗</text>;
  if (status === 'running') return <Spinner />;
  return <text fg={COLOR_DIM}>○</text>;
};

const StartupResourceRow = ({ resource, isLast }: { resource: LocalResource; isLast: boolean }) => {
  const icon =
    resource.status === 'running' ? (
      <text fg={COLOR_SUCCESS}>✓</text>
    ) : resource.status === 'error' ? (
      <text fg={COLOR_ERROR}>✗</text>
    ) : resource.status === 'starting' ? (
      <Spinner />
    ) : (
      <text fg={COLOR_DIM}>○</text>
    );

  let detail = '';
  if (resource.status === 'running') {
    detail = resource.port ? `localhost:${resource.port}` : 'Ready';
  } else if (resource.status === 'starting') {
    detail = 'Starting...';
  } else if (resource.status === 'error') {
    detail = resource.error || 'Failed';
  }
  const detailColor = resource.status === 'error' ? COLOR_ERROR : COLOR_MUTED;

  return (
    <box flexDirection="row">
      <text fg={COLOR_DIM}>{`  ${isLast ? '└' : '├'} `}</text>
      {icon}
      <text> </text>
      <text fg={COLOR_TEXT}>
        <b>{resource.name}</b>
      </text>
      {detail ? <text fg={detailColor}>{`  ${detail}`}</text> : null}
    </box>
  );
};

const StartupStepRow = ({ step, isLast }: { step: SetupStep; isLast: boolean }) => {
  const icon =
    step.status === 'done' ? (
      <text fg={COLOR_SUCCESS}>✓</text>
    ) : step.status === 'running' ? (
      <Spinner />
    ) : step.status === 'skipped' ? (
      <text fg={COLOR_DIM}>−</text>
    ) : (
      <text fg={COLOR_DIM}>○</text>
    );

  return (
    <box flexDirection="row">
      <text fg={COLOR_DIM}>{`  ${isLast ? '└' : '├'} `}</text>
      {icon}
      <text fg={COLOR_TEXT}>{` ${step.label}`}</text>
      {step.detail ? <text fg={COLOR_MUTED}>{`  ${step.detail}`}</text> : null}
    </box>
  );
};

const StartupHookRow = ({ hook, isLast }: { hook: Hook; isLast: boolean }) => {
  const icon =
    hook.status === 'success' ? (
      <text fg={COLOR_SUCCESS}>✓</text>
    ) : hook.status === 'error' ? (
      <text fg={COLOR_ERROR}>✗</text>
    ) : hook.status === 'running' ? (
      <Spinner />
    ) : (
      <text fg={COLOR_DIM}>○</text>
    );

  let detail = '';
  if (hook.status === 'success') {
    detail = hook.duration ? formatDuration(hook.duration) : 'Done';
  } else if (hook.status === 'running') {
    detail = hook.message || 'Running...';
  } else if (hook.status === 'error') {
    detail = hook.error || 'Failed';
  }
  const detailColor = hook.status === 'error' ? COLOR_ERROR : COLOR_MUTED;

  return (
    <box flexDirection="row">
      <text fg={COLOR_DIM}>{`  ${isLast ? '└' : '├'} `}</text>
      {icon}
      <text fg={COLOR_TEXT}>
        {' '}
        <b>{hook.name}</b>
      </text>
      {detail ? <text fg={detailColor}>{`  ${detail}`}</text> : null}
    </box>
  );
};

const StartupWorkloadRow = ({ workload, isLast }: { workload: Workload; isLast: boolean }) => {
  const workloadColor = getWorkloadColor(workload.name);
  const typeIcon = WORKLOAD_TYPE_ICONS[workload.type] || { icon: '◇', color: COLOR_DIM };
  const icon =
    workload.status === 'running' ? (
      <text fg={COLOR_SUCCESS}>✓</text>
    ) : workload.status === 'error' ? (
      <text fg={COLOR_ERROR}>✗</text>
    ) : workload.status === 'starting' ? (
      <Spinner />
    ) : (
      <text fg={COLOR_DIM}>○</text>
    );

  let detail = '';
  if (workload.status === 'running') {
    detail = workload.url || workload.size || 'Ready';
  } else if (workload.status === 'starting') {
    detail = workload.statusMessage || 'Starting...';
  } else if (workload.status === 'error') {
    detail = workload.error || 'Failed';
  }
  const detailColor = workload.status === 'error' ? COLOR_ERROR : COLOR_MUTED;
  const shortName = truncateText(workload.name, 14);
  const detailIsUrl = isHttpUrl(detail);
  const detailDisplay = detailIsUrl ? truncateUrlForDisplay(detail, 20) : truncateText(detail, 20);

  return (
    <box flexDirection="row">
      <text fg={COLOR_DIM}>{`  ${isLast ? '└' : '├'} `}</text>
      {icon}
      <text fg={workloadColor}>
        {' '}
        <b>{shortName}</b>
      </text>
      <text fg={typeIcon.color}>{` ${typeIcon.icon}`}</text>
      {detail ? (
        <text fg={detailColor}>
          {`  `}
          {detailIsUrl ? <a href={detail}>{detailDisplay}</a> : detailDisplay}
        </text>
      ) : null}
    </box>
  );
};

const StartupSidebar = ({ focused }: { focused: boolean }) => {
  const localResources = useDevState((s) => s.localResources);
  const setupSteps = useDevState((s) => s.setupSteps);
  const hooks = useDevState((s) => s.hooks);
  const workloads = useDevState((s) => s.workloads);

  const resStatus = sectionStatus(localResources, ['running', 'stopped', 'error'], ['starting']);
  const tunnelStatus = sectionStatus(setupSteps, ['done', 'skipped'], ['running']);
  const hookStatus = sectionStatus(hooks, ['success', 'error'], ['running']);
  const wlStatus = sectionStatus(workloads, ['running', 'stopped', 'error'], ['starting']);

  return (
    <box flexDirection="column" width={SIDEBAR_WIDTH} borderStyle="single" borderColor={COLOR_BORDER} paddingX={1}>
      <text fg={COLOR_MUTED}>
        <b>Setup</b>
      </text>
      <box height={1} />
      <scrollbox flexGrow={1} focused={focused}>
        {localResources.length > 0 ? (
          <box flexDirection="column" paddingBottom={1}>
            <box flexDirection="row">
              <SectionIcon status={resStatus} />
              <text fg={COLOR_TEXT}>{' Local resources'}</text>
            </box>
            {localResources.map((r, idx) => (
              <StartupResourceRow key={r.name} resource={r} isLast={idx === localResources.length - 1} />
            ))}
          </box>
        ) : null}
        {setupSteps.length > 0 ? (
          <box flexDirection="column" paddingBottom={1}>
            <box flexDirection="row">
              <SectionIcon status={tunnelStatus} />
              <text fg={COLOR_TEXT}>{' Creating tunnels'}</text>
            </box>
            {setupSteps.map((s, idx) => (
              <StartupStepRow key={s.id} step={s} isLast={idx === setupSteps.length - 1} />
            ))}
          </box>
        ) : null}
        {hooks.length > 0 ? (
          <box flexDirection="column" paddingBottom={1}>
            <box flexDirection="row">
              <SectionIcon status={hookStatus} />
              <text fg={COLOR_TEXT}>{' Executing hooks'}</text>
            </box>
            {hooks.map((h, idx) => (
              <StartupHookRow key={h.name} hook={h} isLast={idx === hooks.length - 1} />
            ))}
          </box>
        ) : null}
        {workloads.length > 0 ? (
          <box flexDirection="column" paddingBottom={1}>
            <box flexDirection="row">
              <SectionIcon status={wlStatus} />
              <text fg={COLOR_TEXT}>{' Starting workloads'}</text>
            </box>
            {workloads.map((w, idx) => (
              <StartupWorkloadRow key={w.name} workload={w} isLast={idx === workloads.length - 1} />
            ))}
          </box>
        ) : null}
      </scrollbox>
    </box>
  );
};

const RunningSidebar = ({ focused }: { focused: boolean }) => {
  const workloads = useDevState((s) => s.workloads);
  const localResources = useDevState((s) => s.localResources);
  const selectedLogFilter = useDevState((s) => s.selectedLogFilter);
  const rebuildingWorkloads = useDevState((s) => s.rebuildingWorkloads);

  const rebuildMap = useMemo(() => {
    const map = new Map<string, RebuildWorkloadState>();
    for (const rw of rebuildingWorkloads) {
      map.set(rw.name, rw);
    }
    return map;
  }, [rebuildingWorkloads]);

  const activeWorkloads = workloads.filter(
    (w) => w.status === 'running' || w.status === 'error' || w.status === 'starting'
  );

  return (
    <box flexDirection="column" width={SIDEBAR_WIDTH} borderStyle="single" borderColor={COLOR_BORDER} paddingX={1}>
      <text fg={COLOR_MUTED}>
        <b>Workloads</b>
      </text>
      <box height={1} />
      <scrollbox flexGrow={1} focused={focused}>
        {activeWorkloads.map((workload, idx) => (
          <WorkloadRow
            key={workload.name}
            workload={workload}
            index={idx}
            isSelected={selectedLogFilter === workload.name}
            rebuildState={rebuildMap.get(workload.name)}
          />
        ))}
        {localResources.length > 0 ? (
          <>
            <text fg={COLOR_MUTED}>
              <b>Resources</b>
            </text>
            <box height={1} />
            {localResources.map((resource) => (
              <ResourceRow key={resource.name} resource={resource} />
            ))}
          </>
        ) : null}
      </scrollbox>
    </box>
  );
};

const formatTimestamp = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const LEVEL_COLORS: Record<string, string> = {
  error: COLOR_ERROR,
  warn: COLOR_WARNING,
  info: COLOR_TEXT,
  debug: COLOR_DIM
};

const LogRow = ({ entry, showSource }: { entry: LogEntry; showSource: boolean }) => {
  const sourceColor = entry.source === 'system' ? COLOR_DIM : getWorkloadColor(entry.source);
  const msgColor = LEVEL_COLORS[entry.level] || COLOR_TEXT;

  return (
    <box flexDirection="row">
      <text fg={COLOR_DIM}>{formatTimestamp(entry.timestamp)} </text>
      {showSource ? <text fg={sourceColor}>{`${entry.source.padEnd(12)} `}</text> : null}
      <text fg={msgColor}>{entry.message}</text>
    </box>
  );
};

const DevLogPanel = ({ focused }: { focused: boolean }) => {
  const logs = useDevState((s) => s.logs);
  const selectedLogFilter = useDevState((s) => s.selectedLogFilter);
  const workloads = useDevState((s) => s.workloads);

  const filteredLogs = useMemo(() => {
    if (!selectedLogFilter) return logs;
    return logs.filter((l) => l.source === selectedLogFilter || l.sourceType === 'system');
  }, [logs, selectedLogFilter]);

  const showSource = !selectedLogFilter && workloads.length > 1;
  const filterLabel = selectedLogFilter ? `${selectedLogFilter}` : 'all workloads';

  return (
    <box flexDirection="column" borderStyle="single" borderColor={COLOR_BORDER} flexGrow={1} paddingX={1}>
      <box flexDirection="row" height={1}>
        <text fg={COLOR_MUTED}>
          <b>Logs</b>
        </text>
        <text fg={COLOR_DIM}>{`  [${filterLabel}]`}</text>
        {selectedLogFilter ? <text fg={COLOR_DIM}>{`  esc=all`}</text> : null}
        <box flexGrow={1} />
        <text fg={COLOR_DIM}>↕ scroll</text>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true} focused={focused}>
        {filteredLogs.length === 0 ? (
          <text fg={COLOR_DIM}>Waiting for logs...</text>
        ) : (
          filteredLogs.map((entry) => <LogRow key={entry.id} entry={entry} showSource={showSource} />)
        )}
      </scrollbox>
    </box>
  );
};

const DevFooter = () => {
  const phase = useDevState((s) => s.phase);
  const workloads = useDevState((s) => s.workloads);
  const isQuitting = useDevState((s) => s.isQuitting);
  const selectedLogFilter = useDevState((s) => s.selectedLogFilter);

  if (isQuitting) {
    return (
      <box flexDirection="row" height={1} paddingX={1}>
        <text fg={COLOR_WARNING}>Stopping dev mode...</text>
      </box>
    );
  }

  if (phase === 'startup') {
    return (
      <box flexDirection="row" height={1} paddingX={1}>
        <text fg={COLOR_TEXT_BRIGHT}>
          <b>ctrl+c</b>
        </text>
        <text fg={COLOR_DIM}> stop</text>
      </box>
    );
  }

  const activeCount = workloads.filter((w) => w.status === 'running' || w.status === 'error').length;

  return (
    <box flexDirection="row" height={1} paddingX={1}>
      {activeCount > 0 ? (
        <>
          <text fg={COLOR_TEXT_BRIGHT}>
            <b>1-{activeCount}</b>
          </text>
          <text fg={COLOR_DIM}>{selectedLogFilter ? ' rebuild' : ' filter'}</text>
          <text fg={COLOR_BORDER}> │ </text>
        </>
      ) : null}
      {selectedLogFilter ? (
        <>
          <text fg={COLOR_TEXT_BRIGHT}>
            <b>esc</b>
          </text>
          <text fg={COLOR_DIM}> all logs</text>
          <text fg={COLOR_BORDER}> │ </text>
        </>
      ) : null}
      <text fg={COLOR_TEXT_BRIGHT}>
        <b>r</b>
      </text>
      <text fg={COLOR_DIM}> rebuild</text>
      <text fg={COLOR_BORDER}> │ </text>
      <text fg={COLOR_TEXT_BRIGHT}>
        <b>a</b>
      </text>
      <text fg={COLOR_DIM}> rebuild all</text>
      <text fg={COLOR_BORDER}> │ </text>
      <text fg={COLOR_TEXT_BRIGHT}>
        <b>c</b>
      </text>
      <text fg={COLOR_DIM}> clear</text>
      <text fg={COLOR_BORDER}> │ </text>
      <text fg={COLOR_TEXT_BRIGHT}>
        <b>s</b>
      </text>
      <text fg={COLOR_DIM}> sidebar</text>
      <text fg={COLOR_BORDER}> │ </text>
      <text fg={COLOR_TEXT_BRIGHT}>
        <b>ctrl+c</b>
      </text>
      <text fg={COLOR_DIM}> stop</text>
    </box>
  );
};

const DashboardInner = ({ onRebuild, onQuit }: Pick<DevDashboardProps, 'onRebuild' | 'onQuit'>) => {
  const phase = useDevState((s) => s.phase);
  const sidebarVisible = useDevState((s) => s.sidebarVisible);
  const selectedLogFilter = useDevState((s) => s.selectedLogFilter);

  useKeyboard((key) => {
    if (phase === 'startup') {
      if (key.ctrl && key.name === 'c') {
        onQuit?.();
      }
      return;
    }

    if (key.ctrl && key.name === 'c') {
      onQuit?.();
      return;
    }

    if (key.name === 'escape') {
      if (selectedLogFilter) {
        devTuiState.setLogFilter(null);
      }
      return;
    }

    if (phase === 'rebuilding') return;

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
      onRebuild?.(null);
      return;
    }

    if (key.name === 'r') {
      if (selectedLogFilter) {
        onRebuild?.(selectedLogFilter);
      } else if (activeWorkloads.length === 1) {
        onRebuild?.(activeWorkloads[0].name);
      }
      return;
    }

    const num = parseInt(key.name, 10);
    if (num >= 1 && num <= activeWorkloads.length) {
      if (selectedLogFilter) {
        onRebuild?.(activeWorkloads[num - 1].name);
      } else {
        devTuiState.setLogFilter(activeWorkloads[num - 1].name);
      }
    }
  });

  const sidebar = phase === 'startup' ? <StartupSidebar focused={true} /> : <RunningSidebar focused={true} />;

  return (
    <box flexDirection="column" width="100%" height="100%">
      <DevHeader />
      <box flexDirection="row" flexGrow={1}>
        {sidebarVisible ? sidebar : null}
        <DevLogPanel focused={true} />
      </box>
      <DevFooter />
    </box>
  );
};

class DevErrorBoundary extends React.Component<
  { onError?: (error: Error) => void; children?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { onError?: (error: Error) => void; children?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export const DevDashboard = ({ onRebuild, onQuit, onRenderError }: DevDashboardProps) => {
  const handleError = useCallback(
    (error: Error) => {
      onRenderError?.(error);
    },
    [onRenderError]
  );

  return React.createElement(
    DevErrorBoundary,
    { onError: handleError },
    React.createElement(DashboardInner, { onRebuild, onQuit })
  );
};
