import { Show, ErrorBoundary } from 'solid-js';
import { useKeyboard, useRenderer, useSelectionHandler } from '@opentui/solid';
import type { Selection } from '@opentui/core';
import { ThemeProvider } from '../../context/theme';
import { DialogProvider } from '../../context/dialog';
import { createDevSignal } from '../../context/dev-state';
import { devTuiState } from '../../dev-tui/state';
import { copyToClipboard } from '../../util/clipboard';
import { DevHeader } from './dev-header';
import { DevFooter } from './dev-footer';
import { DevLogPanel } from './dev-log-panel';
import { StartupSidebar } from './startup-sidebar';
import { RunningSidebar } from './running-sidebar';

type DevDashboardProps = {
  onRebuild?: (workloadName: string | null) => void;
  onQuit?: () => void;
  onRenderError?: (error: Error) => void;
};

const getActiveWorkloads = () =>
  devTuiState.getState().workloads.filter((w) => w.status === 'running' || w.status === 'error');

const DevDashboardInner = (props: Pick<DevDashboardProps, 'onRebuild' | 'onQuit'>) => {
  const phase = createDevSignal((s) => s.phase);
  const sidebarVisible = createDevSignal((s) => s.sidebarVisible);
  const sidebarMode = createDevSignal((s) => s.sidebarMode);
  const selectedLogFilter = createDevSignal((s) => s.selectedLogFilter);
  const filterInputActive = createDevSignal((s) => s.filterInputActive);
  const rebuildPickerActive = createDevSignal((s) => s.rebuildPickerActive);
  const renderer = useRenderer();

  useSelectionHandler((selection: Selection) => {
    const text = selection.getSelectedText();
    if (text) copyToClipboard(text);
  });

  useKeyboard((key) => {
    // ── Startup phase: only Ctrl+C works ────────────────────────────────
    if (phase() === 'startup') {
      if (key.ctrl && key.name === 'c') props.onQuit?.();
      return;
    }

    // ── Filter input active: let FilterBar handle all keys ──────────────
    if (filterInputActive()) {
      if (key.ctrl && key.name === 'c') props.onQuit?.();
      return;
    }

    // ── Rebuild picker active: handle number keys + escape ──────────────
    if (rebuildPickerActive()) {
      if (key.name === 'escape') {
        devTuiState.setRebuildPickerActive(false);
        return;
      }
      if (key.ctrl && key.name === 'c') {
        devTuiState.setRebuildPickerActive(false);
        props.onQuit?.();
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

    // ── Ctrl+C: copy selection or quit ──────────────────────────────────
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

    // ── Escape: clear selection, then text filter, then workload filter ─
    if (key.name === 'escape') {
      const sel = renderer.getSelection();
      if (sel) {
        renderer.clearSelection();
        return;
      }
      const state = devTuiState.getState();
      if (state.textFilter) {
        devTuiState.setTextFilter('');
        return;
      }
      if (state.selectedLogFilter) {
        devTuiState.setLogFilter(null);
      }
      return;
    }

    // ── Rebuilding: ignore everything except Ctrl+C / Escape ────────────
    if (phase() === 'rebuilding') return;

    // ── Ctrl+F: open filter input ───────────────────────────────────────
    if (key.ctrl && key.name === 'f') {
      devTuiState.openFilterInput();
      return;
    }

    // ── Ctrl+B: toggle sidebar ──────────────────────────────────────────
    if (key.ctrl && key.name === 'b') {
      devTuiState.toggleSidebar();
      return;
    }

    // ── Ctrl+L: clear logs ──────────────────────────────────────────────
    if (key.ctrl && key.name === 'l') {
      devTuiState.clearLogs();
      return;
    }

    // ── Ctrl+A: rebuild all workloads ───────────────────────────────────
    if (key.ctrl && key.name === 'a') {
      props.onRebuild?.(null);
      return;
    }

    // ── Ctrl+R: rebuild ─────────────────────────────────────────────────
    if (key.ctrl && key.name === 'r') {
      const active = getActiveWorkloads();
      if (selectedLogFilter()) {
        props.onRebuild?.(selectedLogFilter());
      } else if (active.length === 1) {
        props.onRebuild?.(active[0].name);
      } else if (active.length > 1) {
        devTuiState.setRebuildPickerActive(true);
      }
    }
  });

  const isFullscreen = () => sidebarMode() === 'fullscreen';

  return (
    <box flexDirection="column" width="100%" height="100%">
      <DevHeader />
      <box flexDirection="row" flexGrow={1}>
        <Show when={sidebarVisible()}>
          <Show when={phase() !== 'startup'} fallback={<StartupSidebar />}>
            <RunningSidebar />
          </Show>
        </Show>
        <Show when={!isFullscreen()}>
          <DevLogPanel />
        </Show>
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
      <ThemeProvider>
        <DialogProvider>
          <DevDashboardInner onRebuild={props.onRebuild} onQuit={props.onQuit} />
        </DialogProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};
