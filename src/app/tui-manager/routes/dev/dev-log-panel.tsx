import { Show, For } from 'solid-js';
import { useTheme } from '../../context/theme';
import { createDevSignal } from '../../context/dev-state';
import { truncateText, formatTimestamp } from '../../util/text-helpers';
import { compileLogFilter, describeFilter } from '../../util/log-filter';
import { getWorkloadColor } from '../../dev-tui/utils';
import { devTuiState } from '../../dev-tui/state';
import { FilterBar } from '../../ui/filter-bar';
import type { LogEntry } from '../../dev-tui/types';

const SOURCE_LABEL_WIDTH = 16;

const LEVEL_COLORS_KEYS = {
  error: 'error',
  warn: 'warning',
  info: 'text',
  debug: 'dim'
} as const;

const DevLogRow = (props: { entry: LogEntry; showSource: boolean }) => {
  const { theme } = useTheme();
  const sourceColor = () => (props.entry.source === 'system' ? theme.dim : getWorkloadColor(props.entry.source));
  const msgColor = () => theme[LEVEL_COLORS_KEYS[props.entry.level] || 'text'];
  const sourceLabel = () => truncateText(props.entry.source, SOURCE_LABEL_WIDTH).padEnd(SOURCE_LABEL_WIDTH);

  return (
    <box flexDirection="row">
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
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

export const DevLogPanel = () => {
  const { theme } = useTheme();
  const logs = createDevSignal((s) => s.logs);
  const selectedLogFilter = createDevSignal((s) => s.selectedLogFilter);
  const textFilter = createDevSignal((s) => s.textFilter);
  const filterInputActive = createDevSignal((s) => s.filterInputActive);
  const workloads = createDevSignal((s) => s.workloads);

  const filteredLogs = () => {
    let result = logs();

    // Workload filter
    const wlFilter = selectedLogFilter();
    if (wlFilter) {
      result = result.filter((l) => l.source === wlFilter || l.sourceType === 'system');
    }

    // Text filter
    const predicate = compileLogFilter(textFilter());
    if (predicate) {
      result = result.filter(predicate);
    }

    return result;
  };

  const showSource = () => !selectedLogFilter() && workloads().length > 1;

  const filterSummary = () => {
    const parts: string[] = [];
    const wl = selectedLogFilter();
    if (wl) parts.push(wl);
    const desc = describeFilter(textFilter());
    if (desc) parts.push(desc);
    return parts.length > 0 ? parts.join(' + ') : 'all workloads';
  };

  const matchCount = () => filteredLogs().length;
  const totalCount = () => logs().length;
  const hasActiveFilter = () => !!selectedLogFilter() || !!textFilter();

  return (
    <box flexDirection="column" borderStyle="single" borderColor={theme.border} flexGrow={1} paddingX={1}>
      <Show
        when={filterInputActive()}
        fallback={
          <box flexDirection="row" height={1} flexShrink={0}>
            <text flexShrink={0} fg={theme.muted}>
              <b>Logs</b>
            </text>
            <text flexShrink={0} fg={theme.dim}>{`  [${filterSummary()}]`}</text>
            <Show when={hasActiveFilter()}>
              <text flexShrink={0} fg={theme.dim}>
                {'  '}
                {matchCount()}/{totalCount()}
              </text>
            </Show>
            <box flexGrow={1} />
            <text flexShrink={0} fg={theme.dim}>
              ↕ scroll
            </text>
          </box>
        }
      >
        <FilterBar
          value={textFilter()}
          onUpdate={(v) => devTuiState.setTextFilter(v)}
          onSubmit={() => devTuiState.closeFilterInput()}
          onCancel={() => {
            if (textFilter()) {
              devTuiState.setTextFilter('');
            }
            devTuiState.closeFilterInput();
          }}
        />
      </Show>
      <scrollbox flexGrow={1} stickyScroll={true} focused={!filterInputActive()}>
        <Show
          when={filteredLogs().length > 0}
          fallback={<text fg={theme.dim}>{hasActiveFilter() ? 'No matching logs' : 'Waiting for logs...'}</text>}
        >
          <For each={filteredLogs()}>{(entry) => <DevLogRow entry={entry} showSource={showSource()} />}</For>
        </Show>
      </scrollbox>
    </box>
  );
};
