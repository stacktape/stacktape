import { useKeyboard, useTerminalDimensions } from '@opentui/solid';
import { createEffect, createSignal, ErrorBoundary, For, onCleanup, Show } from 'solid-js';
import { formatClock, formatDuration } from '../../format/text';
import { interactionCoordinator } from '../../interaction/coordinator';
import { glyphs } from '../../ui/glyphs';
import { KeyHints, type Hint } from '../../ui/key-hint';
import { Spinner } from '../../ui/spinner';
import { ThemeProvider, useTheme } from '../../ui/theme';
import { sessionElapsedMs, type CfProgressData, type TuiEvent, type TuiPhase } from '../types';
import { PromptBlock } from './prompt-overlay';
import { createTuiSignal } from './signals';

type DashboardProps = {
  onQuit?: () => void;
  onCancel?: () => void;
  onSwitchView?: () => void;
  onRenderError?: (error: Error) => void;
};

type ActivityRow = { event: TuiEvent; phase: TuiPhase; depth: number };

const statusGlyph = (event: TuiEvent) =>
  event.status === 'success'
    ? glyphs.success
    : event.status === 'error'
      ? glyphs.error
      : event.status === 'warning'
        ? glyphs.warning
        : event.status === 'pending'
          ? glyphs.pending
          : undefined;

const flattenEvent = (event: TuiEvent, phase: TuiPhase, depth = 0): ActivityRow[] => [
  { event, phase, depth },
  ...event.children.flatMap((child) => flattenEvent(child, phase, depth + 1))
];

const Header = () => {
  const { theme } = useTheme();
  const dimensions = useTerminalDimensions();
  const header = createTuiSignal((state) => state.header);
  const state = createTuiSignal((value) => value);
  const [now, setNow] = createSignal(Date.now());
  const interval = setInterval(() => setNow(Date.now()), 1_000);
  onCleanup(() => clearInterval(interval));
  const narrow = () => dimensions().width < 72;
  const action = () => header()?.action.toLowerCase() ?? 'working';

  return (
    <box flexDirection="column" flexShrink={0} border={['bottom']} borderColor={theme.border} paddingX={2} paddingY={1}>
      <box height={1} flexDirection="row" overflow="hidden">
        <text flexShrink={0} fg={theme.running}>
          <b>stacktape</b>
        </text>
        <text flexShrink={0} fg={theme.dim}>
          {' '}
          / {action()}
        </text>
        <box flexGrow={1} />
        <text flexShrink={0} fg={theme.muted}>
          {formatClock(sessionElapsedMs(state(), now()))}
        </text>
      </box>
      <Show when={header()}>
        {(value) => (
          <box height={1} flexDirection="row" overflow="hidden">
            <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
              <b>{value().projectName}</b> <span style={{ fg: theme.dim }}>→</span> <b>{value().stageName}</b>
            </text>
            <Show when={!narrow()}>
              <text flexShrink={0} wrapMode="none" fg={theme.muted}>
                {' '}
                {value().region}
              </text>
            </Show>
          </box>
        )}
      </Show>
    </box>
  );
};

const PhaseRail = () => {
  const { theme } = useTheme();
  const dimensions = useTerminalDimensions();
  const phases = createTuiSignal((state) => state.phases);
  const current = createTuiSignal((state) => state.currentPhase);
  const show = createTuiSignal((state) => state.showPhaseHeaders !== false);
  const compact = () => dimensions().width < 72;
  const phaseName = (phase: TuiPhase) => {
    if (!compact()) return phase.name;
    if (phase.id === 'INITIALIZE') return 'Init';
    if (phase.id === 'BUILD_AND_PACKAGE') return 'Build';
    return phase.name;
  };
  return (
    <Show when={show()}>
      <box height={3} flexShrink={0} paddingX={2} paddingY={1} flexDirection="row" overflow="hidden">
        <For each={phases()}>
          {(phase, index) => (
            <>
              <Show
                when={phase.status === 'running' && phase.id === current()}
                fallback={
                  <text
                    flexShrink={0}
                    fg={phase.status === 'success' ? theme.success : phase.status === 'error' ? theme.error : theme.dim}
                  >
                    {phase.status === 'success'
                      ? glyphs.success
                      : phase.status === 'error'
                        ? glyphs.error
                        : glyphs.pending}
                  </text>
                }
              >
                <Spinner />
              </Show>
              <text
                flexShrink={0}
                fg={phase.id === current() ? theme.textBright : phase.status === 'success' ? theme.text : theme.muted}
              >
                {' '}
                {phaseName(phase)}
              </text>
              <Show when={index() < phases().length - 1}>
                <text flexShrink={0} fg={theme.border}>
                  {compact() ? ` ${glyphs.separator} ` : `  ${glyphs.separator}  `}
                </text>
              </Show>
            </>
          )}
        </For>
      </box>
    </Show>
  );
};

const ActivityList = (props: { rows: ActivityRow[]; selectedId?: string }) => {
  const { theme } = useTheme();
  return (
    <scrollbox flexGrow={1} stickyScroll={false} paddingX={1}>
      <For each={props.rows}>
        {(row) => {
          const selected = () => props.selectedId === row.event.id;
          const glyph = () => statusGlyph(row.event);
          return (
            <box
              height={1}
              flexDirection="row"
              paddingLeft={row.depth * 2}
              backgroundColor={selected() ? theme.border : undefined}
              overflow="hidden"
            >
              <Show when={glyph()} fallback={<Spinner />}>
                {(value) => (
                  <text
                    flexShrink={0}
                    fg={
                      row.event.status === 'success'
                        ? theme.success
                        : row.event.status === 'error'
                          ? theme.error
                          : row.event.status === 'warning'
                            ? theme.warning
                            : theme.dim
                    }
                  >
                    {value()}
                  </text>
                )}
              </Show>
              <text flexShrink={1} wrapMode="none" fg={selected() ? theme.textBright : theme.text}>
                {' '}
                {row.event.instanceId ?? row.event.description}
              </text>
              <Show when={row.event.duration !== undefined}>
                <text flexShrink={0} fg={theme.muted}>
                  {' '}
                  {formatDuration(row.event.duration!)}
                </text>
              </Show>
            </box>
          );
        }}
      </For>
      <Show when={props.rows.length === 0}>
        <box height={1} flexDirection="row">
          <Spinner />
          <text fg={theme.muted}> Waiting for activity</text>
        </box>
      </Show>
    </scrollbox>
  );
};

const CloudFormationDetail = (props: { data: CfProgressData }) => {
  const { theme } = useTheme();
  const percent = () =>
    props.data.totalPlanned
      ? Math.min(100, Math.round((props.data.completedCount / props.data.totalPlanned) * 100))
      : 0;
  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme.textBright}>
        <b>
          {props.data.stackAction} · {percent()}%
        </b>
        {'  '}
        {props.data.completedCount}/{props.data.totalPlanned ?? '?'} complete
      </text>
      <text fg={theme.muted}>
        {props.data.changeCounts.created} create · {props.data.changeCounts.updated} update ·{' '}
        {props.data.changeCounts.deleted} delete
      </text>
      <For each={props.data.inProgressDetails ?? []}>
        {(resource) => (
          <box height={1} flexDirection="row" overflow="hidden">
            <Spinner />
            <text flexShrink={0} fg={theme.running}>
              {' '}
              {resource.action.toLowerCase()}{' '}
            </text>
            <text flexShrink={1} wrapMode="none" fg={theme.text}>
              {resource.name}
            </text>
            <Show when={resource.resourceType}>
              <text flexShrink={0} fg={theme.muted}>
                {' '}
                {resource.resourceType}
              </text>
            </Show>
          </box>
        )}
      </For>
    </box>
  );
};

const Details = (props: { row?: ActivityRow }) => {
  const { theme } = useTheme();
  const cfData = () => {
    const data = props.row?.event.data;
    return data?.kind === 'cloudformation-progress' ? (data as CfProgressData) : undefined;
  };
  const output = () => props.row?.event.outputLines ?? [];
  return (
    <box flexDirection="column" flexGrow={1} paddingX={2} paddingY={1} gap={1} overflow="hidden">
      <Show when={props.row} fallback={<text fg={theme.muted}>Select an activity to inspect it.</text>}>
        {(row) => (
          <>
            <text fg={theme.textBright} wrapMode="word">
              <b>{row().event.description}</b>
            </text>
            <text fg={theme.muted}>
              {row().phase.name} · {row().event.status}
              {row().event.duration !== undefined ? ` · ${formatDuration(row().event.duration!)}` : ''}
            </text>
            <Show when={row().event.additionalMessage}>
              <text fg={theme.text} wrapMode="word">
                {row().event.additionalMessage}
              </text>
            </Show>
            <Show when={row().event.finalMessage}>
              <text fg={row().event.status === 'error' ? theme.error : theme.success} wrapMode="word">
                {row().event.finalMessage}
              </text>
            </Show>
            <Show when={cfData()}>{(data) => <CloudFormationDetail data={data()} />}</Show>
            <Show when={output().length > 0}>
              <text fg={theme.muted}>
                <b>Output</b>
              </text>
              <scrollbox flexGrow={1} stickyScroll stickyStart="bottom">
                <For each={output()}>
                  {(line) => (
                    <text fg={theme.text} wrapMode="word">
                      {line}
                    </text>
                  )}
                </For>
              </scrollbox>
            </Show>
          </>
        )}
      </Show>
    </box>
  );
};

const CancelDialog = (props: { onConfirm: () => void; onDismiss: () => void }) => {
  const { theme } = useTheme();
  const header = createTuiSignal((state) => state.header);
  const [choice, setChoice] = createSignal(0);
  useKeyboard((key) => {
    if (key.name === 'escape' || key.sequence?.toLowerCase() === 'n') return props.onDismiss();
    if (key.sequence?.toLowerCase() === 'y') return props.onConfirm();
    if (key.name === 'up' || key.name === 'down') setChoice((value) => (value === 0 ? 1 : 0));
    if (key.name === 'return') (choice() === 0 ? props.onConfirm : props.onDismiss)();
  });
  const deletion = () => header()?.action === 'DELETING';
  return (
    <box width={58} maxWidth="90%" border borderColor={theme.warning} backgroundColor={theme.bg} padding={2} gap={1}>
      <text fg={theme.textBright}>
        <b>{deletion() ? 'Cancel the deletion?' : 'Cancel and roll back?'}</b>
      </text>
      <text fg={theme.muted} wrapMode="word">
        {deletion()
          ? 'Resources already deleted cannot be restored.'
          : 'The stack will return to its previous working state.'}
      </text>
      <For each={[deletion() ? 'Cancel deletion' : 'Roll back', deletion() ? 'Keep deleting' : 'Keep deploying']}>
        {(label, index) => (
          <text fg={choice() === index() ? theme.textBright : theme.muted}>
            {choice() === index() ? glyphs.selected : ' '} {label}
          </text>
        )}
      </For>
    </box>
  );
};

const ModalLayer = (props: { children: unknown }) => {
  const { theme } = useTheme();
  return (
    <box
      position="absolute"
      zIndex={100}
      width="100%"
      height="100%"
      alignItems="center"
      justifyContent="center"
      backgroundColor={theme.bg}
    >
      {props.children}
    </box>
  );
};

const DashboardInner = (props: Omit<DashboardProps, 'onRenderError'>) => {
  const { theme } = useTheme();
  const dimensions = useTerminalDimensions();
  const phases = createTuiSignal((state) => state.phases);
  const currentPhase = createTuiSignal((state) => state.currentPhase);
  const prompt = createTuiSignal((state) => state.activePrompt);
  const cancellation = createTuiSignal((state) => state.cancelDeployment);
  const summary = createTuiSignal((state) => state.summary);
  const isComplete = createTuiSignal((state) => state.isComplete);
  const [selectedId, setSelectedId] = createSignal<string>();
  const [narrowDetails, setNarrowDetails] = createSignal(false);
  const [showCancel, setShowCancel] = createSignal(false);
  const rows = () => {
    const phase = phases().find((candidate) => candidate.id === currentPhase());
    return phase?.events.flatMap((event) => flattenEvent(event, phase)) ?? [];
  };
  const selectedIndex = () =>
    Math.max(
      0,
      rows().findIndex((row) => row.event.id === selectedId())
    );
  const selected = () => rows().find((row) => row.event.id === selectedId()) ?? rows().at(-1);
  const narrow = () => dimensions().width < 86;

  createEffect(() => {
    const available = rows();
    if (available.length === 0) return;
    if (!selectedId() || !available.some((row) => row.event.id === selectedId())) {
      const running = [...available].reverse().find((row) => row.event.status === 'running');
      setSelectedId((running ?? available.at(-1))!.event.id);
    }
  });

  const confirmCancel = () => {
    setShowCancel(false);
    if (cancellation()) interactionCoordinator.invokeCancellation();
    else props.onCancel?.();
  };

  useKeyboard((key) => {
    if (key.ctrl && key.name === 'c') {
      if (prompt()) return interactionCoordinator.cancelPrompt(prompt()!.id);
      if (showCancel()) return setShowCancel(false);
      if (cancellation() && !cancellation()?.isCancelling) return setShowCancel(true);
      return props.onCancel?.();
    }
    if (prompt() || showCancel()) return;
    if (key.ctrl && key.name === 't') return props.onSwitchView?.();
    if (isComplete() && (key.sequence === 'q' || key.name === 'return')) return props.onQuit?.();
    if (key.sequence === 'd' && cancellation()) return props.onQuit?.();
    if (key.sequence === 'c' && cancellation() && !cancellation()?.isCancelling) return setShowCancel(true);
    if (narrow() && narrowDetails() && key.name === 'escape') return setNarrowDetails(false);
    if (narrow() && key.name === 'return') return setNarrowDetails(true);
    if (key.name === 'up' || key.sequence === 'k') {
      const next = Math.max(0, selectedIndex() - 1);
      setSelectedId(rows()[next]?.event.id);
    }
    if (key.name === 'down' || key.sequence === 'j') {
      const next = Math.min(rows().length - 1, selectedIndex() + 1);
      setSelectedId(rows()[next]?.event.id);
    }
  });

  const hints = (): Hint[] => [
    ...(isComplete() ? [{ key: 'q', label: 'close' }] : [{ key: '↑↓', label: narrow() ? 'move' : 'navigate' }]),
    ...(narrow() ? [{ key: narrowDetails() ? 'esc' : 'enter', label: narrowDetails() ? 'back' : 'details' }] : []),
    { key: 'ctrl+t', label: narrow() ? 'view' : 'stream view' },
    ...(cancellation() && !cancellation()?.isCancelling ? [{ key: 'c', label: 'cancel & roll back' }] : []),
    { key: 'ctrl+c', label: isComplete() ? 'close' : 'cancel' }
  ];

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor={theme.bg}>
      <Header />
      <PhaseRail />
      <Show when={summary()}>
        {(value) => (
          <box height={3} flexShrink={0} paddingX={2} paddingY={1} backgroundColor={theme.border}>
            <text fg={value().success ? theme.success : theme.error}>
              <b>
                {value().success ? glyphs.success : glyphs.error} {value().message}
              </b>
            </text>
          </box>
        )}
      </Show>
      <box flexGrow={1} flexDirection={narrow() ? 'column' : 'row'} overflow="hidden">
        <Show when={!narrow() || !narrowDetails()}>
          <box
            width={narrow() ? '100%' : '42%'}
            flexGrow={narrow() ? 1 : 0}
            flexDirection="column"
            border={narrow() ? undefined : ['right']}
            borderColor={theme.border}
            paddingTop={1}
          >
            <text flexShrink={0} fg={theme.muted} paddingLeft={2}>
              <b>ACTIVITY</b>
            </text>
            <ActivityList rows={rows()} selectedId={selected()?.event.id} />
          </box>
        </Show>
        <Show when={!narrow() || narrowDetails()}>
          <Details row={selected()} />
        </Show>
      </box>
      <box height={2} flexShrink={0} paddingX={2} border={['top']} borderColor={theme.border}>
        <KeyHints hints={hints()} />
      </box>
      <Show when={prompt()}>
        {(active) => (
          <ModalLayer>
            <PromptBlock prompt={active()} />
          </ModalLayer>
        )}
      </Show>
      <Show when={showCancel()}>
        <ModalLayer>
          <CancelDialog onConfirm={confirmCancel} onDismiss={() => setShowCancel(false)} />
        </ModalLayer>
      </Show>
    </box>
  );
};

export const ProgressDashboard = (props: DashboardProps) => (
  <ErrorBoundary
    fallback={(error) => {
      props.onRenderError?.(error);
      return <box />;
    }}
  >
    <ThemeProvider>
      <DashboardInner onQuit={props.onQuit} onCancel={props.onCancel} onSwitchView={props.onSwitchView} />
    </ThemeProvider>
  </ErrorBoundary>
);
