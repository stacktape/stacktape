import { createSignal, createEffect, onCleanup, Show, For, ErrorBoundary } from 'solid-js';
import { useKeyboard, useRenderer } from '@opentui/solid';
import { actionSupportsCancel, type TuiPrompt } from '../../types';
import { ThemeProvider, useTheme } from '../../context/theme';
import { createTuiSignal } from '../../context/deploy-state';
import { PhaseIcon } from '../../ui/status-icon';
import { formatDuration } from '../../utils';
import { CF_EVENT_TYPES, HOTSWAP_EVENT_TYPES, CfDeployView, HotswapView } from './deploy-progress';
import { EventTree } from './event-tree';
import { Footer } from './footer';
import { PromptOverlay } from './prompt-overlay';

type DashboardProps = {
  onQuit?: () => void;
  onCancel?: () => void;
  onRenderError?: (error: Error) => void;
};

const FOOTER_BASE_HEIGHT = 12;
const FOOTER_SIMPLE_HEIGHT = 8;
const FOOTER_COMPLETE_HEIGHT = 5;

const promptFooterHeight = (prompt: TuiPrompt): number => {
  const chrome = 7; // header + phases + prompt border/padding + hints
  switch (prompt.type) {
    case 'select':
      return chrome + Math.min(prompt.options.length, 15) + 5;
    case 'multiSelect':
      return chrome + Math.min(prompt.options.length, 15) + 4;
    case 'confirm':
      return chrome + 3;
    case 'text':
      return chrome + 6;
  }
};

const clampFooterHeight = (height: number) => Math.max(FOOTER_COMPLETE_HEIGHT, Math.min(height, 26));

const createIsDeleteSignal = () => {
  const action = createTuiSignal((s) => s.header?.action);
  return () => action() === 'DELETING';
};

const Header = () => {
  const { theme } = useTheme();
  const header = createTuiSignal((s) => s.header);
  const isComplete = createTuiSignal((s) => s.isComplete);
  const summary = createTuiSignal((s) => s.summary);
  const startTime = createTuiSignal((s) => s.startTime);
  const [now, setNow] = createSignal(Date.now());

  const interval = setInterval(() => {
    if (!isComplete()) setNow(Date.now());
  }, 1000);
  onCleanup(() => clearInterval(interval));

  const elapsed = () => formatDuration(now() - startTime());
  const actionColor = () => (isComplete() ? (summary()?.success ? theme.success : theme.error) : theme.running);
  const actionText = () => (isComplete() ? (summary()?.success ? 'COMPLETED' : 'FAILED') : (header()?.action ?? ''));

  return (
    <Show when={header()}>
      {(h) => (
        <box flexDirection="row" height={1} paddingX={1}>
          <text flexShrink={0} wrapMode="none" fg={actionColor()}>
            <b>{actionText()}</b>
          </text>
          <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
            {'  '}
            {h().projectName}
          </text>
          <text flexShrink={0} wrapMode="none" fg={theme.dim}>
            {' '}
            →{' '}
          </text>
          <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
            {h().stageName}
          </text>
          <text flexShrink={0} wrapMode="none" fg={theme.dim}>
            {'  '}
            {h().region}
          </text>
          <box flexGrow={1} />
          <text flexShrink={0} wrapMode="none" fg={theme.dim}>
            {elapsed()}
          </text>
        </box>
      )}
    </Show>
  );
};

const PhasesInline = () => {
  const { theme } = useTheme();
  const phases = createTuiSignal((s) => s.phases);
  const currentPhase = createTuiSignal((s) => s.currentPhase);

  return (
    <box flexDirection="row" height={1} paddingX={1}>
      <For each={phases()}>
        {(phase) => {
          const isActive = () => phase.id === currentPhase() && phase.status === 'running';
          const nameColor = () => (isActive() ? theme.running : phase.status === 'success' ? theme.text : theme.dim);
          return (
            <box flexDirection="row" flexShrink={0}>
              <PhaseIcon status={phase.status} />
              <text flexShrink={0} wrapMode="none" fg={nameColor()}>
                {' '}
                {phase.name}
                {'   '}
              </text>
            </box>
          );
        }}
      </For>
    </box>
  );
};

/**
 * Live view of the current phase: only running events. Finished events have
 * already been streamed into terminal scrollback above the footer.
 */
const LiveEvents = () => {
  const { theme } = useTheme();
  const phases = createTuiSignal((s) => s.phases);
  const currentPhaseId = createTuiSignal((s) => s.currentPhase);
  const isComplete = createTuiSignal((s) => s.isComplete);
  const isFinalizing = createTuiSignal((s) => s.isFinalizing);

  const activePhase = () => phases().find((p) => p.id === currentPhaseId());
  const runningEvents = () => activePhase()?.events.filter((e) => e.status === 'running') ?? [];
  const cfEvent = () => runningEvents().find((e) => CF_EVENT_TYPES.includes(e.eventType));
  const hotswapEvent = () => runningEvents().find((e) => HOTSWAP_EVENT_TYPES.includes(e.eventType));
  const plainEvents = () =>
    runningEvents().filter((e) => !CF_EVENT_TYPES.includes(e.eventType) && !HOTSWAP_EVENT_TYPES.includes(e.eventType));

  const idleText = () => {
    if (isComplete()) return '';
    if (isFinalizing()) return 'Finalizing...';
    if (!activePhase()) return 'Waiting to start...';
    return 'Working...';
  };

  return (
    <scrollbox flexGrow={1} paddingX={1} stickyScroll={true} viewportCulling={true} focused={true}>
      <Show when={hotswapEvent()}>{(ev) => <HotswapView event={ev()} />}</Show>
      <Show when={!hotswapEvent() && cfEvent()}>
        {(ev) => <CfDeployView event={ev()} isDelete={ev().eventType === 'DELETE_STACK'} />}
      </Show>
      <Show when={plainEvents().length > 0}>
        <EventTree events={plainEvents()} />
      </Show>
      <Show when={runningEvents().length === 0 && idleText()}>
        <text fg={theme.dim}>{idleText()}</text>
      </Show>
    </scrollbox>
  );
};

const CompleteBanner = () => {
  const { theme } = useTheme();
  const summary = createTuiSignal((s) => s.summary);

  return (
    <box flexGrow={1} paddingX={1} flexDirection="column" justifyContent="center">
      <Show when={summary()}>
        {(s) => (
          <box flexDirection="row">
            <text flexShrink={0} wrapMode="none" fg={s().success ? theme.success : theme.error}>
              {s().success ? '✓' : '✗'}{' '}
            </text>
            <text fg={theme.textBright}>{s().message}</text>
          </box>
        )}
      </Show>
    </box>
  );
};

const CancelConfirm = (props: { onConfirm: () => void; onDismiss: () => void }) => {
  const { theme } = useTheme();
  const isDelete = createIsDeleteSignal();

  useKeyboard((key) => {
    if (key.sequence === 'y' || key.sequence === 'Y') {
      props.onConfirm();
    } else if (key.name === 'escape' || key.sequence === 'n' || key.sequence === 'N') {
      props.onDismiss();
    }
  });

  const title = () => (isDelete() ? 'Cancel deletion?' : 'Cancel deployment?');
  const description = () =>
    isDelete()
      ? 'The stack deletion will be cancelled. Already deleted resources may need to be recreated.'
      : 'Your stack will be rolled back to its previous working state.';
  const confirmLabel = () => (isDelete() ? ' yes, cancel ' : ' yes, rollback ');
  const dismissLabel = () => (isDelete() ? ' keep deleting' : ' keep deploying');

  return (
    <box flexGrow={1} flexDirection="column" borderStyle="single" borderColor={theme.error} paddingX={2}>
      <text fg={theme.error}>
        <b>{title()}</b>
      </text>
      <text fg={theme.text}>{description()}</text>
      <box flexDirection="row">
        <text fg={theme.textBright}>
          <b>y</b>
        </text>
        <text fg={theme.dim}>{confirmLabel()}</text>
        <text fg={theme.border}> │ </text>
        <text fg={theme.textBright}>
          <b>n</b>
        </text>
        <text fg={theme.dim}>/</text>
        <text fg={theme.textBright}>
          <b>esc</b>
        </text>
        <text fg={theme.dim}>{dismissLabel()}</text>
      </box>
    </box>
  );
};

const FailureBanner = () => {
  const { theme } = useTheme();
  const cancelDeployment = createTuiSignal((s) => s.cancelDeployment);

  return (
    <Show when={cancelDeployment()?.message}>
      {(message) => (
        <box height={1} paddingX={1} flexShrink={0}>
          <text flexShrink={0} wrapMode="none" fg={theme.warning}>
            {'▲ '}
          </text>
          <text fg={theme.warning}>{message()}</text>
          <text fg={theme.dim}>{' Press '}</text>
          <text fg={theme.muted}>
            <b>c</b>
          </text>
          <text fg={theme.dim}>{' to cancel and rollback now.'}</text>
        </box>
      )}
    </Show>
  );
};

const DashboardInner = (props: Pick<DashboardProps, 'onQuit' | 'onCancel'>) => {
  const { theme } = useTheme();
  const renderer = useRenderer();
  const [showCancelConfirm, setShowCancelConfirm] = createSignal(false);
  const isComplete = createTuiSignal((s) => s.isComplete);
  const cancelDeployment = createTuiSignal((s) => s.cancelDeployment);
  const activePrompt = createTuiSignal((s) => s.activePrompt);
  const showPhases = createTuiSignal((s) => s.showPhaseHeaders !== false);
  const action = createTuiSignal((s) => s.header?.action);
  const isCancelling = () => cancelDeployment()?.isCancelling;
  const canCancel = () => actionSupportsCancel(action());

  // The footer is a fixed-height region pinned to the bottom of the terminal.
  // Phase commands (deploy/delete) get the taller base; simple-mode commands
  // (script:run, synth, validate) get a slimmer footer. Grows for prompts,
  // shrinks once complete.
  createEffect(() => {
    const prompt = activePrompt();
    const base = showPhases() ? FOOTER_BASE_HEIGHT : FOOTER_SIMPLE_HEIGHT;
    const target = prompt
      ? promptFooterHeight(prompt)
      : showCancelConfirm()
        ? FOOTER_BASE_HEIGHT
        : isComplete()
          ? FOOTER_COMPLETE_HEIGHT
          : base;
    try {
      renderer.footerHeight = clampFooterHeight(target);
    } catch {}
  });

  const handleCancelConfirm = () => {
    setShowCancelConfirm(false);
    const cd = cancelDeployment();
    if (cd) {
      cd.onCancel();
    } else {
      props.onCancel?.();
    }
  };

  useKeyboard((key) => {
    if (activePrompt() || showCancelConfirm()) return;

    if (key.ctrl && key.name === 'c') {
      props.onCancel?.();
      return;
    }

    if (isComplete()) {
      if (key.sequence === 'q' || key.sequence === 'Q' || key.name === 'return') {
        props.onQuit?.();
      }
      return;
    }

    if ((key.sequence === 'c' || key.sequence === 'C') && canCancel()) {
      if (!isCancelling()) {
        setShowCancelConfirm(true);
      }
    }
  });

  return (
    <box flexDirection="column" width="100%" height="100%" border={['top']} borderColor={theme.border}>
      <Header />
      <Show when={showPhases()}>
        <PhasesInline />
      </Show>
      <Show
        when={!activePrompt()}
        fallback={
          <box flexGrow={1} paddingX={1}>
            <PromptOverlay />
          </box>
        }
      >
        <Show
          when={!showCancelConfirm()}
          fallback={<CancelConfirm onConfirm={handleCancelConfirm} onDismiss={() => setShowCancelConfirm(false)} />}
        >
          <Show when={!isComplete()} fallback={<CompleteBanner />}>
            <LiveEvents />
          </Show>
        </Show>
      </Show>
      <FailureBanner />
      <Footer isCancelling={!!isCancelling()} />
    </box>
  );
};

export const DeployDashboard = (props: DashboardProps) => {
  return (
    <ErrorBoundary
      fallback={(err) => {
        props.onRenderError?.(err);
        return <box />;
      }}
    >
      <ThemeProvider>
        <DashboardInner onQuit={props.onQuit} onCancel={props.onCancel} />
      </ThemeProvider>
    </ErrorBoundary>
  );
};
