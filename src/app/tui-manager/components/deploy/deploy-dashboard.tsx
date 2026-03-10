import { createSignal, onCleanup, Show, ErrorBoundary } from 'solid-js';
import { useKeyboard } from '@opentui/solid';
import { createTuiSignal } from './use-deploy-state';
import { PhaseList } from './phase-list';
import { DetailPanel } from './detail-panel';
import { LogPanel } from './log-panel';
import { Footer } from './footer';
import { PromptOverlay } from './prompt-overlay';
import { formatDuration } from '../../utils';
import { COLORS } from '../shared/colors';

type DashboardProps = {
  onQuit?: () => void;
  onCancel?: () => void;
  onRenderError?: (error: Error) => void;
};

const createIsDeleteSignal = () => {
  const action = createTuiSignal((s) => s.header?.action);
  return () => action() === 'DELETING';
};

const Header = () => {
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
  const actionColor = () => (isComplete() ? (summary()?.success ? COLORS.success : COLORS.error) : COLORS.running);
  const actionText = () => (isComplete() ? (summary()?.success ? 'COMPLETED' : 'FAILED') : (header()?.action ?? ''));

  return (
    <Show when={header()}>
      {(h) => (
        <box flexDirection="row" height={1} paddingX={1}>
          <text flexShrink={0} wrapMode="none" fg={actionColor()}>
            <b>{actionText()}</b>
          </text>
          <text flexShrink={0} wrapMode="none" fg={COLORS.textBright}>
            {'  '}
            {h().projectName}
          </text>
          <text flexShrink={0} wrapMode="none" fg={COLORS.dim}>
            {' '}
            →{' '}
          </text>
          <text flexShrink={0} wrapMode="none" fg={COLORS.textBright}>
            {h().stageName}
          </text>
          <text flexShrink={0} wrapMode="none" fg={COLORS.dim}>
            {'  '}
            {h().region}
          </text>
          <box flexGrow={1} />
          <text flexShrink={0} wrapMode="none" fg={COLORS.dim}>
            {elapsed()}
          </text>
        </box>
      )}
    </Show>
  );
};

const CancelConfirmOverlay = (props: { onConfirm: () => void; onDismiss: () => void }) => {
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
  const subtitle = () =>
    isDelete() ? 'Deletion will stop as soon as possible.' : 'No partial changes will be left behind.';
  const confirmLabel = () => (isDelete() ? ' yes, cancel ' : ' yes, rollback ');
  const dismissLabel = () => (isDelete() ? ' keep deleting' : ' keep deploying');

  return (
    <box
      position="absolute"
      top={0}
      left={0}
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
      zIndex={10}
      backgroundColor={COLORS.bg}
    >
      <box
        flexDirection="column"
        borderStyle="single"
        borderColor={COLORS.error}
        paddingX={2}
        paddingY={1}
        width={64}
        backgroundColor={COLORS.bg}
      >
        <text fg={COLORS.error}>
          <b>{title()}</b>
        </text>
        <box height={1} />
        <text fg={COLORS.text}>{description()}</text>
        <text fg={COLORS.dim}>{subtitle()}</text>
        <box height={1} />
        <box flexDirection="row">
          <text fg={COLORS.textBright}>
            <b>y</b>
          </text>
          <text fg={COLORS.dim}>{confirmLabel()}</text>
          <text fg={COLORS.border}> │ </text>
          <text fg={COLORS.textBright}>
            <b>n</b>
          </text>
          <text fg={COLORS.dim}>/</text>
          <text fg={COLORS.textBright}>
            <b>esc</b>
          </text>
          <text fg={COLORS.dim}>{dismissLabel()}</text>
        </box>
      </box>
    </box>
  );
};

const DashboardInner = (props: Pick<DashboardProps, 'onQuit' | 'onCancel'>) => {
  const [showCancelConfirm, setShowCancelConfirm] = createSignal(false);
  const isComplete = createTuiSignal((s) => s.isComplete);
  const cancelDeployment = createTuiSignal((s) => s.cancelDeployment);
  const activePrompt = createTuiSignal((s) => s.activePrompt);
  const isCancelling = () => cancelDeployment()?.isCancelling;

  const handleCancelConfirm = () => {
    setShowCancelConfirm(false);
    const cd = cancelDeployment();
    if (cd) {
      cd.onCancel();
    } else {
      props.onCancel?.();
    }
  };

  const handleCancelDismiss = () => {
    setShowCancelConfirm(false);
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

    if (key.sequence === 'c' || key.sequence === 'C') {
      if (!isCancelling()) {
        setShowCancelConfirm(true);
      }
    }
  });

  return (
    <box flexDirection="column" width="100%" height="100%">
      <Header />
      <box flexDirection="row" flexGrow={1}>
        <PhaseList />
        <DetailPanel />
      </box>
      <LogPanel />
      <PromptOverlay />
      <Footer isCancelling={!!isCancelling()} />
      <Show when={showCancelConfirm()}>
        <CancelConfirmOverlay onConfirm={handleCancelConfirm} onDismiss={handleCancelDismiss} />
      </Show>
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
      <DashboardInner onQuit={props.onQuit} onCancel={props.onCancel} />
    </ErrorBoundary>
  );
};
