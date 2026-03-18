import { Show, For } from 'solid-js';
import { useTheme } from '../../context/theme';
import { createDevSignal } from '../../context/dev-state';
import { KeyHints } from '../../ui/key-hint';
import { getWorkloadColor } from '../../dev-tui/utils';

const RebuildPicker = () => {
  const { theme } = useTheme();
  const workloads = createDevSignal((s) => s.workloads);
  const active = () => workloads().filter((w) => w.status === 'running' || w.status === 'error');

  return (
    <box flexDirection="row" height={1}>
      <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
        rebuild:{' '}
      </text>
      <For each={active()}>
        {(w, i) => (
          <text flexShrink={0} wrapMode="none" fg={getWorkloadColor(w.name)}>
            <b>{i() + 1}</b>
            {` ${w.name}  `}
          </text>
        )}
      </For>
      <text flexShrink={0} wrapMode="none" fg={theme.muted}>
        <b>a</b>
        {' all  '}
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        <b>esc</b>
        {' cancel'}
      </text>
    </box>
  );
};

export const DevFooter = () => {
  const { theme } = useTheme();
  const phase = createDevSignal((s) => s.phase);
  const isQuitting = createDevSignal((s) => s.isQuitting);
  const filterInputActive = createDevSignal((s) => s.filterInputActive);
  const textFilter = createDevSignal((s) => s.textFilter);
  const selectedLogFilter = createDevSignal((s) => s.selectedLogFilter);
  const rebuildPickerActive = createDevSignal((s) => s.rebuildPickerActive);

  const hints = (): { key: string; label: string }[] => {
    if (phase() === 'startup') return [{ key: 'ctrl+c', label: 'quit' }];

    if (filterInputActive()) {
      return [
        { key: 'enter', label: 'apply' },
        { key: 'esc', label: 'cancel' },
        { key: 'ctrl+u', label: 'clear input' }
      ];
    }

    const items: { key: string; label: string }[] = [];
    items.push({ key: 'ctrl+r', label: 'rebuild' });
    items.push({ key: 'ctrl+a', label: 'rebuild all' });
    items.push({ key: 'ctrl+f', label: 'filter' });

    if (textFilter() || selectedLogFilter()) {
      items.push({ key: 'esc', label: 'clear filter' });
    }

    items.push(
      { key: 'ctrl+l', label: 'clear' },
      { key: 'ctrl+b', label: 'sidebar' },
      { key: 'ctrl+c', label: 'quit' }
    );
    return items;
  };

  return (
    <box height={1} paddingX={1} flexShrink={0}>
      <Show
        when={!isQuitting()}
        fallback={
          <text wrapMode="none" fg={theme.warning}>
            Stopping dev mode...
          </text>
        }
      >
        <Show when={rebuildPickerActive()} fallback={<KeyHints hints={hints()} />}>
          <RebuildPicker />
        </Show>
      </Show>
    </box>
  );
};
