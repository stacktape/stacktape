import { Show, For } from 'solid-js';
import { useTheme } from '../../context/theme';
import { createDevSignal } from '../../context/dev-state';
import { Spinner } from '../../ui/spinner';
import { truncateText, isHttpUrl } from '../../util/text-helpers';
import { getWorkloadColor, formatDuration } from '../../dev-tui/utils';
import { SidebarHeader } from '../../ui/sidebar-header';
import { SIDEBAR_WIDTH, SIDEBAR_INNER, StatusDot } from './startup-sidebar';
import type { LocalResource, RebuildWorkloadState, Workload } from '../../dev-tui/types';

const WorkloadRow = (props: { workload: Workload; rebuildState?: RebuildWorkloadState }) => {
  const { theme } = useTheme();
  const isRebuilding = () =>
    props.rebuildState && props.rebuildState.status !== 'done' && props.rebuildState.status !== 'error';
  const workloadColor = () => getWorkloadColor(props.workload.name);

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
    if (w.status === 'error' && !isRebuilding()) return theme.error;
    if (rs?.status === 'error') return theme.error;
    if (rs?.status === 'done') return theme.success;
    return theme.muted;
  };

  const shortName = () => truncateText(props.workload.name, 16);

  const maxDetailLen = SIDEBAR_INNER - 5;
  const detailIsUrl = () => isHttpUrl(detailText());
  const detailDisplay = () => (detailIsUrl() ? detailText() : truncateText(detailText(), maxDetailLen));

  return (
    <box flexDirection="column" paddingBottom={1}>
      <box flexDirection="row">
        <Show when={isRebuilding()} fallback={<StatusDot status={props.workload.status} />}>
          <Spinner color={theme.rebuild} />
        </Show>
        <text flexShrink={0} wrapMode="none">
          {' '}
        </text>
        <text flexShrink={0} wrapMode="none" fg={workloadColor()}>
          <b>{shortName()}</b>
        </text>
      </box>
      <Show when={detailText()}>
        <box flexDirection="row" paddingLeft={2}>
          <text wrapMode="none" fg={detailIsUrl() ? theme.muted : detailColor()}>
            <Show when={detailIsUrl()} fallback={detailDisplay()}>
              <a href={detailText()}>{detailText()}</a>
            </Show>
          </text>
        </box>
      </Show>
    </box>
  );
};

const ResourceRow = (props: { resource: LocalResource }) => {
  const { theme } = useTheme();
  const detail = () => {
    const r = props.resource;
    if (r.status === 'running' && r.port) return `localhost:${r.port}`;
    if (r.status === 'starting') return 'starting...';
    if (r.status === 'error') return r.error || 'failed';
    return '';
  };
  const detailColor = () => (props.resource.status === 'error' ? theme.error : theme.muted);

  return (
    <box flexDirection="row" paddingBottom={1}>
      <text flexShrink={0}> </text>
      <StatusDot status={props.resource.status} />
      <text flexShrink={0}> </text>
      <text flexShrink={0} fg={theme.text}>
        {props.resource.name}
      </text>
      <Show when={detail()}>
        <text wrapMode="none" fg={detailColor()}>{`  ${detail()}`}</text>
      </Show>
    </box>
  );
};

export const RunningSidebar = () => {
  const { theme } = useTheme();
  const workloads = createDevSignal((s) => s.workloads);
  const localResources = createDevSignal((s) => s.localResources);
  const rebuildingWorkloads = createDevSignal((s) => s.rebuildingWorkloads);
  const sidebarMode = createDevSignal((s) => s.sidebarMode);

  const rebuildMap = () => {
    const map = new Map<string, RebuildWorkloadState>();
    for (const rw of rebuildingWorkloads()) {
      map.set(rw.name, rw);
    }
    return map;
  };

  const activeWorkloads = () =>
    workloads().filter((w) => w.status === 'running' || w.status === 'error' || w.status === 'starting');

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
      <SidebarHeader title="Workloads" />
      <box height={1} />
      <scrollbox flexGrow={1}>
        <For each={activeWorkloads()}>
          {(workload) => <WorkloadRow workload={workload} rebuildState={rebuildMap().get(workload.name)} />}
        </For>
        <Show when={localResources().length > 0}>
          <text fg={theme.muted}>
            <b>Resources</b>
          </text>
          <box height={1} />
          <For each={localResources()}>{(resource) => <ResourceRow resource={resource} />}</For>
        </Show>
      </scrollbox>
    </box>
  );
};
