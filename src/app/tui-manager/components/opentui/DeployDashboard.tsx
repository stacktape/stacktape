/** @jsxImportSource @opentui/react */

import React, { useState, useCallback, useEffect } from 'react';
import { useKeyboard } from '@opentui/react';
import { useTuiState } from './use-tui-state';
import { PhaseList } from './PhaseList';
import { DetailPanel } from './DetailPanel';
import { LogPanel } from './LogPanel';
import { Footer } from './Footer';
import { PromptOverlay } from './PromptOverlay';
import { ErrorBoundary } from './ErrorBoundary';
import { formatDuration } from '../../utils';

type DashboardProps = {
  onQuit?: () => void;
  onCancel?: () => void;
  onRenderError?: (error: Error) => void;
};

const Header = () => {
  const header = useTuiState((s) => s.header);
  const isComplete = useTuiState((s) => s.isComplete);
  const summary = useTuiState((s) => s.summary);
  const startTime = useTuiState((s) => s.startTime);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (isComplete) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isComplete]);

  if (!header) return null;

  const elapsed = formatDuration(Date.now() - startTime);
  const actionColor = isComplete ? (summary?.success ? '#22c55e' : '#ef4444') : '#06b6d4';
  const actionText = isComplete ? (summary?.success ? 'COMPLETED' : 'FAILED') : header.action;

  return (
    <box flexDirection="row" height={1} paddingX={1}>
      <text fg={actionColor}>
        <b>{actionText}</b>
      </text>
      <text fg="#e5e7eb">
        {'  '}
        {header.projectName}
      </text>
      <text fg="#6b7280"> → </text>
      <text fg="#e5e7eb">{header.stageName}</text>
      <text fg="#6b7280">
        {'  '}
        {header.region}
      </text>
      <box flexGrow={1} />
      <text fg="#6b7280">{elapsed}</text>
    </box>
  );
};

const CancelConfirmOverlay = ({ onConfirm, onDismiss }: { onConfirm: () => void; onDismiss: () => void }) => {
  useKeyboard((key) => {
    if (key.sequence === 'y' || key.sequence === 'Y') {
      onConfirm();
    } else if (key.name === 'escape' || key.sequence === 'n' || key.sequence === 'N') {
      onDismiss();
    }
  });

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
      backgroundColor="#1a1a2e"
    >
      <box
        flexDirection="column"
        borderStyle="single"
        borderColor="#ef4444"
        paddingX={2}
        paddingY={1}
        width={64}
        backgroundColor="#1a1a2e"
      >
        <text fg="#ef4444">
          <b>Cancel deployment?</b>
        </text>
        <box height={1} />
        <text fg="#d1d5db">Your stack will be rolled back to its previous working state.</text>
        <text fg="#6b7280">No partial changes will be left behind.</text>
        <box height={1} />
        <box flexDirection="row">
          <text fg="#e5e7eb">
            <b>y</b>
          </text>
          <text fg="#6b7280"> yes, rollback </text>
          <text fg="#374151"> │ </text>
          <text fg="#e5e7eb">
            <b>n</b>
          </text>
          <text fg="#6b7280">/</text>
          <text fg="#e5e7eb">
            <b>esc</b>
          </text>
          <text fg="#6b7280"> keep deploying</text>
        </box>
      </box>
    </box>
  );
};

const DashboardInner = ({ onQuit, onCancel }: Pick<DashboardProps, 'onQuit' | 'onCancel'>) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const isComplete = useTuiState((s) => s.isComplete);
  const cancelDeployment = useTuiState((s) => s.cancelDeployment);
  const activePrompt = useTuiState((s) => s.activePrompt);
  const isCancelling = cancelDeployment?.isCancelling;

  const handleCancelConfirm = useCallback(() => {
    setShowCancelConfirm(false);
    if (cancelDeployment) {
      cancelDeployment.onCancel();
    } else {
      onCancel?.();
    }
  }, [cancelDeployment, onCancel]);

  const handleCancelDismiss = useCallback(() => {
    setShowCancelConfirm(false);
  }, []);

  useKeyboard((key) => {
    if (activePrompt || showCancelConfirm) return;

    // Ctrl+C: hard abort (destroy TUI, re-raise SIGINT)
    if (key.ctrl && key.name === 'c') {
      onCancel?.();
      return;
    }

    if (isComplete) {
      // When complete: q or Enter to exit
      if (key.sequence === 'q' || key.sequence === 'Q' || key.name === 'return') {
        onQuit?.();
      }
      return;
    }

    // During deployment: c opens cancel confirmation
    if (key.sequence === 'c' || key.sequence === 'C') {
      if (!isCancelling) {
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
      <Footer isCancelling={!!isCancelling} />
      {showCancelConfirm ? (
        <CancelConfirmOverlay onConfirm={handleCancelConfirm} onDismiss={handleCancelDismiss} />
      ) : null}
    </box>
  );
};

export const DeployDashboard = ({ onQuit, onCancel, onRenderError }: DashboardProps) => {
  const handleRenderError = useCallback(
    (error: Error) => {
      onRenderError?.(error);
    },
    [onRenderError]
  );

  // Use React.createElement to wrap with ErrorBoundary (a class component) to avoid
  // JSX type conflicts between React's and OpenTUI's IntrinsicElements.
  return React.createElement(
    ErrorBoundary,
    { onError: handleRenderError },
    React.createElement(DashboardInner, { onQuit, onCancel })
  );
};
