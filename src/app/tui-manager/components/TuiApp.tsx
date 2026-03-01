import { Box, Static, Text, useStdout } from 'ink';
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { tuiState } from '../state';
import type { TuiEvent, TuiPhase, TuiState } from '../types';
import { renderGlobalMessageToString, renderHeaderToString, renderPhaseToString } from '../tty-text-renderer';
import { CancelBanner } from './CancelBanner';
import { Event } from './Event';
import { Message } from './Message';
import { Phase } from './Phase';
import { Prompt } from './Prompt';
import { Summary } from './Summary';

type TuiAppProps = {
  isTTY: boolean;
};

type StaticItem = {
  key: string;
  content: string;
};

const subscribe = (cb: () => void) => tuiState.subscribe(cb);

const DEPLOY_EVENT_TYPES: LoggableEventType[] = ['UPDATE_STACK', 'DELETE_STACK', 'ROLLBACK_STACK', 'HOTSWAP_UPDATE'];

/**
 * Estimate how many terminal lines a phase occupies when rendered.
 * Doesn't need to be pixel-perfect — just close enough to avoid overflow.
 */
const estimatePhaseHeight = (phase: TuiPhase, showPhaseHeader: boolean, state: TuiState): number => {
  let lines = 0;

  if (showPhaseHeader) {
    lines += 2; // header line + separator
  }

  const hasCfEvents = phase.events.some((e) => DEPLOY_EVENT_TYPES.includes(e.eventType));
  if (hasCfEvents) {
    // Deploy phase: progress bar area + resource lists + summary
    lines += 6; // progress bar, status, resource lines (rough estimate)
  }

  const countEventLines = (event: TuiEvent, depth: number): number => {
    let count = 1; // the event line itself
    if (event.outputLines) {
      count += event.outputLines.filter((l) => l.trim()).length;
    }
    if (event.children.length > 0 && !(event.hideChildrenWhenFinished && event.status === 'success')) {
      for (const child of event.children) {
        count += countEventLines(child, depth + 1);
      }
    }
    return count;
  };

  for (const event of phase.events) {
    if (phase.status === 'running' && event.status === 'pending') continue;
    lines += countEventLines(event, 0);
  }

  // warnings + messages
  const phaseWarnings = state.warnings.filter((w) => w.phase === phase.id);
  for (const w of phaseWarnings) {
    lines += w.message.split('\n').length;
  }
  const phaseMessages = state.messages.filter((m) => m.phase === phase.id);
  lines += phaseMessages.length;

  lines += 1; // marginBottom

  return lines;
};

export const TuiApp: React.FC<TuiAppProps> = ({ isTTY }) => {
  const state = useSyncExternalStore(subscribe, tuiState.getSnapshot, tuiState.getSnapshot);
  const [promptKey, setPromptKey] = useState(0);
  const { stdout } = useStdout();

  const flushedKeys = useRef<Set<string>>(new Set());
  const staticItemsRef = useRef<StaticItem[]>([]);

  // Track terminal rows reactively
  const [terminalRows, setTerminalRows] = useState(stdout?.rows || 24);
  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setTerminalRows(stdout.rows);
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);

  useEffect(() => {
    if (state.activePrompt) {
      setPromptKey((k) => k + 1);
    }
  }, [state.activePrompt]);

  const isSimpleMode = state.showPhaseHeaders === false;

  // Flush header to static (one-time, never changes)
  if (state.header && !flushedKeys.current.has('header')) {
    staticItemsRef.current.push({ key: 'header', content: renderHeaderToString(state.header) });
    flushedKeys.current.add('header');
  }

  // Determine which phases to show in live zone vs flush to static.
  // Only flush completed phases when the live zone would exceed terminal height.
  const showPhaseHeader = !!state.header;
  const nonPendingPhases = useMemo(
    () => (isSimpleMode ? [] : state.phases.filter((phase) => phase.status !== 'pending' || phase.events.length > 0)),
    [state.phases, isSimpleMode]
  );

  // Extra lines for cancel banner, prompt, summary
  const extraLines = (state.cancelDeployment ? 6 : 0) + (state.activePrompt ? 4 : 0) + (state.summary ? 5 : 0);
  const availableRows = terminalRows - extraLines - 2; // 2 lines buffer for safety

  // Compute heights and decide what to flush
  const phaseHeights = nonPendingPhases.map((phase) => estimatePhaseHeight(phase, showPhaseHeader, state));
  const totalHeight = phaseHeights.reduce((sum, h) => sum + h, 0);

  // Flush completed phases to <Static> when:
  // 1. The live zone would exceed terminal height (prevent jumping/overflow), OR
  // 2. The deployment is finalizing/complete (preserve history before Ink unmounts)
  const shouldFlushAll = state.isComplete || state.isFinalizing;
  if (shouldFlushAll || totalHeight > availableRows) {
    for (let i = 0; i < nonPendingPhases.length; i++) {
      const phase = nonPendingPhases[i];
      const isCompleted = phase.status === 'success' || phase.status === 'error';
      if (isCompleted && !flushedKeys.current.has(`phase-${phase.id}`)) {
        const phaseNumber = state.phases.findIndex((p) => p.id === phase.id) + 1;
        const phaseWarnings = state.warnings.filter((w) => w.phase === phase.id);
        const phaseMessages = state.messages.filter((m) => m.phase === phase.id);
        staticItemsRef.current.push({
          key: `phase-${phase.id}`,
          content: renderPhaseToString(phase, phaseNumber, phaseWarnings, phaseMessages, showPhaseHeader)
        });
        flushedKeys.current.add(`phase-${phase.id}`);
      }
    }
  }

  // Also flush global (non-phase) messages when finalizing
  if (shouldFlushAll) {
    for (const msg of state.messages) {
      if (!msg.phase && !flushedKeys.current.has(`msg-${msg.id}`)) {
        staticItemsRef.current.push({
          key: `msg-${msg.id}`,
          content: renderGlobalMessageToString(msg)
        });
        flushedKeys.current.add(`msg-${msg.id}`);
      }
    }
  }

  const staticItems = staticItemsRef.current;

  const livePhases = useMemo(() => {
    if (isSimpleMode) return [];
    return nonPendingPhases.filter((phase) => !flushedKeys.current.has(`phase-${phase.id}`));
  }, [nonPendingPhases, isSimpleMode]);

  const simpleModeEvents = useMemo(() => {
    if (!isSimpleMode) return [];
    return state.phases
      .flatMap((phase) => phase.events)
      .filter((event) => event.status !== 'pending')
      .sort((a, b) => a.startTime - b.startTime);
  }, [state.phases, isSimpleMode]);

  const simpleModeMessages = useMemo(() => {
    if (!isSimpleMode) return [];
    return state.messages.sort((a, b) => a.timestamp - b.timestamp);
  }, [state.messages, isSimpleMode]);

  return (
    <Box flexDirection="column">
      <Static items={staticItems}>{(item) => <Text key={item.key}>{item.content}</Text>}</Static>

      {isSimpleMode ? (
        <Box flexDirection="column">
          {simpleModeEvents.map((event) => (
            <Event key={event.id} event={event} isTTY={isTTY} />
          ))}
          {simpleModeMessages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))}
        </Box>
      ) : (
        <Box flexDirection="column">
          {livePhases.map((phase) => {
            const phaseNumber = state.phases.findIndex((candidate) => candidate.id === phase.id) + 1;
            return (
              <Phase
                key={phase.id}
                phase={phase}
                phaseNumber={phaseNumber}
                warnings={state.warnings}
                messages={state.messages}
                isTTY={isTTY}
                showPhaseHeader={showPhaseHeader}
                cancelDeployment={state.cancelDeployment}
              />
            );
          })}
        </Box>
      )}

      {state.cancelDeployment && <CancelBanner cancelDeployment={state.cancelDeployment} />}
      {state.activePrompt && <Prompt key={promptKey} prompt={state.activePrompt} />}
      {state.summary && <Summary summary={state.summary} />}
    </Box>
  );
};
