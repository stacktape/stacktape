import { createSignal, onCleanup, Show, For, Switch, Match, ErrorBoundary } from 'solid-js';
import { useKeyboard, useTerminalDimensions } from '@opentui/solid';
import type { TuiDeploymentHeader } from '../../types';
import { ThemeProvider, useTheme } from '../../ui/theme';
import { glyphs } from '../../ui/glyphs';
import { formatClock, formatDuration, formatPhaseTimer } from '../../format/text';
import { footerVariant, type TuiPhase } from '../types';
import { Spinner } from '../../ui/spinner';
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

/** Live hh:mm:ss session clock; freezes when the run completes. */
const createSessionClock = () => {
  const isComplete = createTuiSignal((s) => s.isComplete);
  const startTime = createTuiSignal((s) => s.startTime);
  const [now, setNow] = createSignal(Date.now());
  const interval = setInterval(() => {
    if (!isComplete()) setNow(Date.now());
  }, 1000);
  onCleanup(() => clearInterval(interval));
  return () => formatClock(now() - startTime());
};

const Identity = () => {
  const { theme } = useTheme();
  const header = createTuiSignal((s) => s.header);
  const clock = createSessionClock();

  return (
    <box height={1} flexShrink={0} flexDirection="row" paddingLeft={2} paddingRight={1} overflow="hidden">
      <Show when={header()}>
        {(h) => (
          <>
            <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
              <b>{h().projectName}</b>
            </text>
            <text flexShrink={0} wrapMode="none" fg={theme.dim}>
              {' '}
              /{' '}
            </text>
            <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
              <b>{h().stageName}</b>
            </text>
          </>
        )}
      </Show>
      <box flexGrow={1} />
      <text flexShrink={0} wrapMode="none" fg={theme.muted}>
        {header()?.region ?? ''}
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        {'   '}
        {clock()}
      </text>
    </box>
  );
};

/** Inverse accent title bar (`bar` chrome) — tmux/vim statusline style. */
const BarHeader = () => {
  const { theme } = useTheme();
  const header = createTuiSignal((s) => s.header);
  const clock = createSessionClock();
  const verb = () => commandVerb(header()?.action);

  return (
    <box
      height={1}
      flexShrink={0}
      flexDirection="row"
      backgroundColor={theme.running}
      paddingLeft={1}
      paddingRight={1}
      overflow="hidden"
    >
      <text flexShrink={0} wrapMode="none" fg={theme.accentContrast}>
        <b>stacktape</b>
      </text>
      <Show when={verb()}>
        <text flexShrink={0} wrapMode="none" fg={theme.accentContrast}>
          {' '}
          / {verb()}
        </text>
      </Show>
      <box flexGrow={1} />
      <Show when={header()}>
        {(h) => (
          <text flexShrink={1} wrapMode="none" fg={theme.accentContrast}>
            <b>{h().projectName}</b> / <b>{h().stageName}</b> {glyphs.separator} {h().region}
          </text>
        )}
      </Show>
      <text flexShrink={0} wrapMode="none" fg={theme.accentContrast}>
        {'   '}
        {clock()}
      </text>
    </box>
  );
};

/**
 * The phase rail — a single-row state map of the phases. The ACTIVE phase
 * style is selectable while the final look is being chosen (`STP_TUI_RAIL`,
 * also settable as a trailing demo argument):
 *
 *   dot       ✓ Initialize   ● Deploy   · Finalize          (default)
 *   chip      ✓ Initialize   inverted accent pill  Deploy
 *   chevrons  Initialize › Package › DEPLOY › Finalize      (typographic route)
 *   timer     ✓ Initialize · 1.2s   spinner Deploy · 00:42  (data-rich, live timing)
 */
type RailVariant = 'dot' | 'chip' | 'chevrons' | 'timer';

const railVariant = (): RailVariant => {
  const value = process.env.STP_TUI_RAIL;
  return value === 'chip' || value === 'chevrons' || value === 'timer' ? value : 'dot';
};

const PhaseRail = () => {
  const { theme } = useTheme();
  const dimensions = useTerminalDimensions();
  const phases = createTuiSignal((s) => s.phases);
  const currentPhase = createTuiSignal((s) => s.currentPhase);
  const [now, setNow] = createSignal(Date.now());
  const timerInterval = setInterval(() => {
    if (railVariant() === 'timer') setNow(Date.now());
  }, 1000);
  onCleanup(() => clearInterval(timerInterval));

  const railLabel = (name: string) => {
    const label = SHORT_RAIL_LABELS[name] ?? name;
    return dimensions().width < 80 ? (NARROW_RAIL_LABELS[label] ?? label) : label;
  };

  const isCurrent = (phase: TuiPhase) => phase.id === currentPhase() && phase.status === 'running';

  const stateIcon = (phase: TuiPhase) =>
    phase.status === 'error' ? glyphs.error : phase.status === 'success' ? glyphs.success : glyphs.pending;
  const stateIconColor = (phase: TuiPhase) =>
    phase.status === 'error' ? theme.error : phase.status === 'success' ? theme.success : theme.dim;

  const DotEntry = (entry: { phase: TuiPhase }) => {
    const active = () => isCurrent(entry.phase);
    return (
      <>
        <text flexShrink={0} wrapMode="none" fg={active() ? theme.running : stateIconColor(entry.phase)}>
          {active() ? glyphs.current : stateIcon(entry.phase)}
        </text>
        <text
          flexShrink={0}
          wrapMode="none"
          fg={active() ? theme.textBright : entry.phase.status === 'success' ? theme.text : theme.dim}
        >
          {' '}
          {railLabel(entry.phase.name)}
          {'   '}
        </text>
      </>
    );
  };

  const ChipEntry = (entry: { phase: TuiPhase }) => {
    const active = () => isCurrent(entry.phase);
    return (
      <Show
        when={active()}
        fallback={
          <>
            <text flexShrink={0} wrapMode="none" fg={stateIconColor(entry.phase)}>
              {stateIcon(entry.phase)}
            </text>
            <text flexShrink={0} wrapMode="none" fg={entry.phase.status === 'success' ? theme.text : theme.dim}>
              {' '}
              {railLabel(entry.phase.name)}
              {'   '}
            </text>
          </>
        }
      >
        <text flexShrink={0} wrapMode="none" bg={theme.running} fg={theme.accentContrast}>
          <b> {railLabel(entry.phase.name)} </b>
        </text>
        <text flexShrink={0} wrapMode="none">
          {'   '}
        </text>
      </Show>
    );
  };

  const ChevronEntry = (entry: { phase: TuiPhase; index: number }) => {
    const active = () => isCurrent(entry.phase);
    const labelColor = () =>
      entry.phase.status === 'error'
        ? theme.error
        : active()
          ? theme.running
          : entry.phase.status === 'success'
            ? theme.success
            : theme.dim;
    return (
      <>
        <Show when={entry.index > 0}>
          <text
            flexShrink={0}
            wrapMode="none"
            fg={phases()[entry.index - 1]?.status === 'success' ? theme.success : theme.border}
          >
            {' '}
            {glyphs.selected}{' '}
          </text>
        </Show>
        <text flexShrink={0} wrapMode="none" fg={labelColor()}>
          <Show when={active()} fallback={railLabel(entry.phase.name)}>
            <b>{railLabel(entry.phase.name).toUpperCase()}</b>
          </Show>
        </text>
      </>
    );
  };

  const TimerEntry = (entry: { phase: TuiPhase }) => {
    const active = () => isCurrent(entry.phase);
    const timing = () => {
      if (active() && entry.phase.startTime) return formatPhaseTimer(now() - entry.phase.startTime);
      if ((entry.phase.status === 'success' || entry.phase.status === 'error') && entry.phase.duration) {
        return formatDuration(entry.phase.duration);
      }
      return null;
    };
    return (
      <>
        <Show
          when={active()}
          fallback={
            <text flexShrink={0} wrapMode="none" fg={stateIconColor(entry.phase)}>
              {stateIcon(entry.phase)}
            </text>
          }
        >
          <Spinner />
        </Show>
        <text
          flexShrink={0}
          wrapMode="none"
          fg={active() ? theme.textBright : entry.phase.status === 'success' ? theme.text : theme.dim}
        >
          {' '}
          {railLabel(entry.phase.name)}
        </text>
        <Show when={timing()}>
          <text flexShrink={0} wrapMode="none" fg={theme.dim}>
            {' '}
            {glyphs.separator} {timing()}
          </text>
        </Show>
        <text flexShrink={0} wrapMode="none">
          {'   '}
        </text>
      </>
    );
  };

  return (
    <box height={1} flexShrink={0} flexDirection="row" paddingLeft={2} overflow="hidden">
      <For each={phases()}>
        {(phase, index) => (
          <Switch fallback={<DotEntry phase={phase} />}>
            <Match when={railVariant() === 'chip'}>
              <ChipEntry phase={phase} />
            </Match>
            <Match when={railVariant() === 'chevrons'}>
              <ChevronEntry phase={phase} index={index()} />
            </Match>
            <Match when={railVariant() === 'timer'}>
              <TimerEntry phase={phase} />
            </Match>
          </Switch>
        )}
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
  const { theme } = useTheme();
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
  const header = createTuiSignal((s) => s.header);
  // The chrome cannot change while mounted (env-driven), so branch eagerly.
  const chrome = footerVariant();

  const Rows = () => (
    <>
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
    </>
  );

  if (chrome === 'frame') {
    const frameTitle = () => {
      const verb = commandVerb(header()?.action);
      return verb ? ` stacktape / ${verb} ` : ' stacktape ';
    };
    return (
      <box
        flexDirection="column"
        width="100%"
        height="100%"
        overflow="hidden"
        border={true}
        borderStyle="rounded"
        borderColor={theme.border}
        title={frameTitle()}
        titleColor={theme.muted}
        titleAlignment="left"
        backgroundColor={theme.panel}
      >
        <Identity />
        <Rows />
      </box>
    );
  }

  if (chrome === 'edge') {
    return (
      <box flexDirection="row" width="100%" height="100%" overflow="hidden">
        <box width={1} height="100%" flexShrink={0} backgroundColor={theme.running} />
        <box flexDirection="column" flexGrow={1} overflow="hidden" backgroundColor={theme.panel}>
          <Divider />
          <Identity />
          <Rows />
        </box>
      </box>
    );
  }

  if (chrome === 'bar') {
    return (
      <box flexDirection="column" width="100%" height="100%" overflow="hidden" backgroundColor={theme.panel}>
        <BarHeader />
        <Rows />
      </box>
    );
  }

  return (
    <box flexDirection="column" width="100%" height="100%" overflow="hidden" backgroundColor={theme.panel}>
      <Divider />
      <Identity />
      <Rows />
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
