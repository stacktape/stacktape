import { createSignal, onCleanup, Show, For, ErrorBoundary } from 'solid-js';
import { useKeyboard, useTerminalDimensions } from '@opentui/solid';
import type { TuiDeploymentHeader } from '../../types';
import { ThemeProvider, useTheme } from '../../ui/theme';
import { glyphs } from '../../ui/glyphs';
import { formatClock } from '../../format/text';
import { createTuiSignal } from './signals';
import { LivePanel } from './live-panel';
import { PromptBlock, promptHints, type PromptHint } from './prompt-overlay';

type DashboardProps = {
  onQuit?: () => void;
  onCancel?: () => void;
  onRenderError?: (error: Error) => void;
};

/**
 * Fixed footer geometry. The footer NEVER changes height or row ownership while
 * mounted — every state (running, prompt, cancel confirm, rollback, complete)
 * renders into the same reserved rows, so nothing on screen ever jumps.
 *
 * Phase mode (12 rows):        Simple mode (8 rows):
 *   0  divider                   0  divider
 *   1  identity + clock          1  identity + clock
 *   2  phase rail                2  blank
 *   3  blank                     3-5  body (3 rows)
 *   4-9  body (6 rows)           6  status strip
 *   10 status strip              7  hints
 *   11 hints
 */

/** Rail labels are deliberately short; scrollback keeps the full phase names. */
const SHORT_RAIL_LABELS: Record<string, string> = {
  'Build & Package': 'Package'
};

const NARROW_RAIL_LABELS: Record<string, string> = {
  Initialize: 'Init',
  'Prepare Pipeline': 'Pipeline'
};

const commandVerb = (action?: TuiDeploymentHeader['action']): string => {
  if (!action) return '';
  if (action === 'DELETING') return 'delete';
  if (action === 'COMPILING TEMPLATE') return 'synth';
  if (action === 'PREVIEWING CHANGES') return 'diff';
  if (action === 'VALIDATING') return 'validate';
  if (action === 'RUNNING DEV MODE' || action === 'RUNNING DEV MODE (legacy)') return 'dev';
  if (action.startsWith('RUNNING SCRIPT')) return 'script';
  if (action === 'UPDATING') return 'update';
  return 'deploy';
};

const Divider = () => {
  const { theme } = useTheme();
  const dimensions = useTerminalDimensions();
  const header = createTuiSignal((s) => s.header);
  const verb = () => commandVerb(header()?.action);
  const label = () => ` stacktape ${verb() ? `/ ${verb()} ` : ''}`;
  const fill = () => glyphs.rule.repeat(Math.max(0, dimensions().width - label().length - 2));

  return (
    <box height={1} flexShrink={0} flexDirection="row" overflow="hidden">
      <text flexShrink={0} wrapMode="none" fg={theme.border}>
        {glyphs.rule.repeat(2)}
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.muted}>
        {' '}
        stacktape{' '}
      </text>
      <Show when={verb()}>
        <text flexShrink={0} wrapMode="none" fg={theme.dim}>
          /{' '}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.muted}>
          {verb()}{' '}
        </text>
      </Show>
      <text flexShrink={1} wrapMode="none" fg={theme.border}>
        {fill()}
      </text>
    </box>
  );
};

const Identity = () => {
  const { theme } = useTheme();
  const header = createTuiSignal((s) => s.header);
  const isComplete = createTuiSignal((s) => s.isComplete);
  const startTime = createTuiSignal((s) => s.startTime);
  const [now, setNow] = createSignal(Date.now());

  const interval = setInterval(() => {
    if (!isComplete()) setNow(Date.now());
  }, 1000);
  onCleanup(() => clearInterval(interval));

  return (
    <box height={1} flexShrink={0} flexDirection="row" paddingLeft={2} paddingRight={1} overflow="hidden">
      <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
        <b>{header()?.projectName ?? ''}</b>
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        {' '}
        /{' '}
      </text>
      <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
        <b>{header()?.stageName ?? ''}</b>
      </text>
      <box flexGrow={1} />
      <text flexShrink={0} wrapMode="none" fg={theme.muted}>
        {header()?.region ?? ''}
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        {'   '}
        {formatClock(now() - startTime())}
      </text>
    </box>
  );
};

/**
 * Compact, non-animated state map of the phases. Single-cell icons only:
 * check = done, filled dot = current, middle dot = pending, cross = failed.
 * The spinner belongs to the live work rows, never to the rail.
 */
const PhaseRail = () => {
  const { theme } = useTheme();
  const dimensions = useTerminalDimensions();
  const phases = createTuiSignal((s) => s.phases);
  const currentPhase = createTuiSignal((s) => s.currentPhase);

  const railLabel = (name: string) => {
    const label = SHORT_RAIL_LABELS[name] ?? name;
    return dimensions().width < 80 ? (NARROW_RAIL_LABELS[label] ?? label) : label;
  };

  return (
    <box height={1} flexShrink={0} flexDirection="row" paddingLeft={2} overflow="hidden">
      <For each={phases()}>
        {(phase) => {
          const isCurrent = () => phase.id === currentPhase() && phase.status === 'running';
          const icon = () =>
            phase.status === 'error'
              ? glyphs.error
              : phase.status === 'success'
                ? glyphs.success
                : isCurrent()
                  ? glyphs.current
                  : glyphs.pending;
          const iconColor = () =>
            phase.status === 'error'
              ? theme.error
              : phase.status === 'success'
                ? theme.text
                : isCurrent()
                  ? theme.running
                  : theme.dim;
          const labelColor = () =>
            isCurrent() ? theme.textBright : phase.status === 'success' ? theme.text : theme.dim;
          return (
            <>
              <text flexShrink={0} wrapMode="none" fg={iconColor()}>
                {icon()}
              </text>
              <text flexShrink={0} wrapMode="none" fg={labelColor()}>
                {' '}
                {railLabel(phase.name)}
                {'   '}
              </text>
            </>
          );
        }}
      </For>
    </box>
  );
};

const CompleteBanner = () => {
  const { theme } = useTheme();
  const summary = createTuiSignal((s) => s.summary);

  return (
    <box flexDirection="column" paddingLeft={2}>
      <Show when={summary()}>
        {(s) => (
          <box height={1} flexDirection="row" overflow="hidden">
            <text flexShrink={0} wrapMode="none" fg={s().success ? theme.success : theme.error}>
              {s().success ? glyphs.success : glyphs.error}
            </text>
            <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
              {' '}
              <b>{s().message}</b>
            </text>
          </box>
        )}
      </Show>
    </box>
  );
};

const CancelConfirm = (props: { onConfirm: () => void; onDismiss: () => void }) => {
  const { theme } = useTheme();
  const header = createTuiSignal((s) => s.header);
  const isDelete = () => header()?.action === 'DELETING';
  const [choice, setChoice] = createSignal(0);

  useKeyboard((key) => {
    if (key.sequence === 'y' || key.sequence === 'Y') {
      props.onConfirm();
    } else if (key.name === 'escape' || key.sequence === 'n' || key.sequence === 'N') {
      props.onDismiss();
    } else if (key.name === 'up' || key.name === 'down') {
      setChoice((prev) => (prev === 0 ? 1 : 0));
    } else if (key.name === 'return') {
      if (choice() === 0) props.onConfirm();
      else props.onDismiss();
    }
  });

  const question = () => (isDelete() ? 'Cancel the deletion?' : 'Cancel the deployment and roll back?');
  const consequence = () =>
    isDelete()
      ? 'Resources deleted so far will not be restored.'
      : 'The stack will be rolled back to its previous working state.';
  const confirmLabel = () => (isDelete() ? 'Cancel deletion' : 'Roll back');
  const dismissLabel = () => (isDelete() ? 'Keep deleting' : 'Keep deploying');

  const OptionRow = (rowProps: { index: number; label: string }) => (
    <box height={1} flexDirection="row" overflow="hidden">
      <text flexShrink={0} wrapMode="none" fg={theme.warning}>
        {glyphs.accentBar}
      </text>
      <Show
        when={choice() === rowProps.index}
        fallback={
          <text flexShrink={1} wrapMode="none" fg={theme.text}>
            {'   '}
            {rowProps.label}
          </text>
        }
      >
        <text flexShrink={0} wrapMode="none" fg={theme.running}>
          {' '}
          {glyphs.selected}{' '}
        </text>
        <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
          <b>{rowProps.label}</b>
        </text>
      </Show>
    </box>
  );

  return (
    <box flexDirection="column" paddingLeft={2}>
      <box height={1} flexDirection="row" overflow="hidden">
        <text flexShrink={0} wrapMode="none" fg={theme.warning}>
          {glyphs.accentBar}
        </text>
        <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
          {' '}
          <b>{question()}</b>
        </text>
      </box>
      <box height={1} flexDirection="row" overflow="hidden">
        <text flexShrink={0} wrapMode="none" fg={theme.warning}>
          {glyphs.accentBar}
        </text>
        <text flexShrink={1} wrapMode="none" fg={theme.muted}>
          {' '}
          {consequence()}
        </text>
      </box>
      <text flexShrink={0} wrapMode="none" fg={theme.warning}>
        {glyphs.accentBar}
      </text>
      <OptionRow index={0} label={confirmLabel()} />
      <OptionRow index={1} label={dismissLabel()} />
    </box>
  );
};

const StatusStrip = (props: { showCancelConfirm: boolean }) => {
  const { theme } = useTheme();
  const cancelDeployment = createTuiSignal((s) => s.cancelDeployment);
  const isComplete = createTuiSignal((s) => s.isComplete);

  const content = () => {
    if (cancelDeployment()?.isCancelling && !isComplete() && !props.showCancelConfirm) {
      return { color: theme.warning, text: `${glyphs.warning} Rolling back to the previous working state` };
    }
    return null;
  };

  return (
    <box height={1} flexShrink={0} paddingLeft={2} overflow="hidden">
      <text wrapMode="none" fg={content()?.color ?? theme.dim}>
        {content()?.text ?? ' '}
      </text>
    </box>
  );
};

const HintsRow = (props: { hints: PromptHint[] }) => {
  const { theme } = useTheme();
  return (
    <box height={1} flexShrink={0} paddingLeft={2} overflow="hidden" flexDirection="row">
      <For each={props.hints}>
        {(hint, index) => (
          <>
            <Show when={index() > 0}>
              <text flexShrink={0} wrapMode="none" fg={theme.border}>
                {' '}
                {glyphs.separator}{' '}
              </text>
            </Show>
            <text flexShrink={0} wrapMode="none" fg={theme.muted}>
              <b>{hint.key}</b>
            </text>
            <text flexShrink={0} wrapMode="none" fg={theme.dim}>
              {' '}
              {hint.label}
            </text>
          </>
        )}
      </For>
    </box>
  );
};

const DashboardInner = (props: Pick<DashboardProps, 'onQuit' | 'onCancel'>) => {
  const dimensions = useTerminalDimensions();
  const [showCancelConfirm, setShowCancelConfirm] = createSignal(false);
  const isComplete = createTuiSignal((s) => s.isComplete);
  const cancelDeployment = createTuiSignal((s) => s.cancelDeployment);
  const activePrompt = createTuiSignal((s) => s.activePrompt);
  const showPhases = createTuiSignal((s) => s.showPhaseHeaders !== false);
  const isCancelling = () => cancelDeployment()?.isCancelling;
  const canCancel = () => !!cancelDeployment() && !isCancelling();

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
      if (key.sequence === 'q' || key.name === 'return') props.onQuit?.();
      return;
    }

    if ((key.sequence === 'c' || key.sequence === 'C') && canCancel()) {
      setShowCancelConfirm(true);
    }
  });

  const hints = (): PromptHint[] => {
    const prompt = activePrompt();
    if (prompt) return promptHints(prompt);
    if (showCancelConfirm()) {
      return [
        { key: 'y', label: 'confirm' },
        { key: 'n', label: 'dismiss' },
        { key: 'enter', label: 'choose' }
      ];
    }
    if (isComplete()) return [];
    if (isCancelling()) {
      return [{ key: 'ctrl+c', label: dimensions().width < 80 ? 'detach' : 'detach (rollback continues in AWS)' }];
    }
    if (canCancel()) {
      return [
        { key: 'c', label: 'cancel & roll back' },
        { key: 'ctrl+c', label: dimensions().width < 80 ? 'detach' : 'detach (deployment continues in AWS)' }
      ];
    }
    return [{ key: 'ctrl+c', label: 'cancel' }];
  };

  const bodyRows = () => (showPhases() ? 6 : 3);

  return (
    <box flexDirection="column" width="100%" height="100%" overflow="hidden">
      <Divider />
      <Identity />
      <Show when={showPhases()} fallback={<box height={1} flexShrink={0} />}>
        <PhaseRail />
      </Show>
      <Show when={showPhases()}>
        <box height={1} flexShrink={0} />
      </Show>
      <box height={bodyRows()} flexShrink={0} flexDirection="column" overflow="hidden">
        <Show when={!activePrompt()} fallback={<PromptBlock prompt={activePrompt()!} />}>
          <Show
            when={!showCancelConfirm()}
            fallback={<CancelConfirm onConfirm={handleCancelConfirm} onDismiss={() => setShowCancelConfirm(false)} />}
          >
            <Show when={!isComplete()} fallback={<CompleteBanner />}>
              <LivePanel rows={bodyRows()} />
            </Show>
          </Show>
        </Show>
      </box>
      <StatusStrip showCancelConfirm={showCancelConfirm()} />
      <HintsRow hints={hints()} />
    </box>
  );
};

export const ProgressDashboard = (props: DashboardProps) => {
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
