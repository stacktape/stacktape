import { Box, useStdout } from 'ink';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { tuiState } from '../state';
import type { TuiState } from '../types';
import { renderHeaderToString, renderPhaseToString, renderGlobalMessageToString, renderEventToString } from '../tty-text-renderer';
import { CancelBanner } from './CancelBanner';
import { Event } from './Event';
import { Message } from './Message';
import { Phase } from './Phase';
import { Prompt } from './Prompt';
import { Summary } from './Summary';

type TuiAppProps = {
  isTTY: boolean;
};

export const TuiApp: React.FC<TuiAppProps> = ({ isTTY }) => {
  const [state, setState] = useState<TuiState>(tuiState.getState());
  const [promptKey, setPromptKey] = useState(0);
  const { write } = useStdout();

  const flushedHeader = useRef(false);
  const flushedPhaseIds = useRef<Set<DeploymentPhase>>(new Set());
  const flushedMessageIds = useRef<Set<string>>(new Set());
  const flushedEventIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    return tuiState.subscribe(setState);
  }, []);

  useEffect(() => {
    if (state.activePrompt) {
      setPromptKey((k) => k + 1);
    }
  }, [state.activePrompt]);

  const isSimpleMode = state.showPhaseHeaders === false;

  useLayoutEffect(() => {
    if (isSimpleMode) {
      if (state.header && !flushedHeader.current) {
        write(renderHeaderToString(state.header));
        flushedHeader.current = true;
      }
      for (const phase of state.phases) {
        for (const event of phase.events) {
          if ((event.status === 'success' || event.status === 'error') && !flushedEventIds.current.has(event.id)) {
            write(renderEventToString(event));
            flushedEventIds.current.add(event.id);
          }
        }
      }
      for (const msg of state.messages) {
        if (!flushedMessageIds.current.has(msg.id)) {
          write(renderGlobalMessageToString(msg));
          flushedMessageIds.current.add(msg.id);
        }
      }
      return;
    }

    if (state.header && !flushedHeader.current) {
      write(renderHeaderToString(state.header));
      flushedHeader.current = true;
    }

    for (const phase of state.phases) {
      if ((phase.status === 'success' || phase.status === 'error') && !flushedPhaseIds.current.has(phase.id)) {
        const phaseNumber = state.phases.findIndex((p) => p.id === phase.id) + 1;
        const phaseWarnings = state.warnings.filter((w) => w.phase === phase.id);
        const phaseMessages = state.messages.filter((m) => m.phase === phase.id);
        write(renderPhaseToString(phase, phaseNumber, phaseWarnings, phaseMessages, !!state.header));
        flushedPhaseIds.current.add(phase.id);
      }
    }

    for (const msg of state.messages) {
      if (!msg.phase && !flushedMessageIds.current.has(msg.id)) {
        write(renderGlobalMessageToString(msg));
        flushedMessageIds.current.add(msg.id);
      }
    }
  }, [state, isSimpleMode, write]);

  const simpleModeEvents = useMemo(() => {
    if (!isSimpleMode) return [];
    return state.phases
      .flatMap((phase) => phase.events)
      .filter((event) => event.status !== 'pending' && !flushedEventIds.current.has(event.id))
      .sort((a, b) => a.startTime - b.startTime);
  }, [state.phases, isSimpleMode]);

  const simpleModeMessages = useMemo(() => {
    if (!isSimpleMode) return [];
    return state.messages
      .filter((msg) => !flushedMessageIds.current.has(msg.id))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [state.messages, isSimpleMode]);

  const activePhases = useMemo(() => {
    if (isSimpleMode) return [];
    return state.phases.filter(
      (phase) =>
        phase.status !== 'success' &&
        phase.status !== 'error' &&
        (phase.status !== 'pending' || phase.events.length > 0)
    );
  }, [state.phases, isSimpleMode]);

  return (
    <Box flexDirection="column">
      {isSimpleMode ? (
        <Box flexDirection="column">
          {simpleModeEvents.map((event) => (
            <Event key={event.id} event={event} isTTY={isTTY} isSnapshot={event.status !== 'running'} />
          ))}
          {simpleModeMessages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))}
        </Box>
      ) : (
        <Box flexDirection="column">
          {activePhases.map((phase) => {
            const phaseNumber = state.phases.findIndex((candidate) => candidate.id === phase.id) + 1;
            return (
              <Phase
                key={phase.id}
                phase={phase}
                phaseNumber={phaseNumber}
                warnings={state.warnings}
                messages={state.messages}
                isTTY={isTTY}
                showPhaseHeader={!!state.header}
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
