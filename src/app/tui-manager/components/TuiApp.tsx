/** @jsxImportSource @opentui/react */
import type { TuiPhase, TuiState } from '../types';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { tuiState } from '../state';
import { Header } from './Header';
import { Message } from './Message';
import { Phase } from './Phase';
import { Prompt } from './Prompt';
import { Summary } from './Summary';

type TuiAppProps = {
  isTTY: boolean;
};

type StaticItem =
  | { type: 'header'; id: string; data: TuiState['header'] }
  | {
      type: 'phase';
      id: string;
      data: { phase: TuiPhase; phaseNumber: number; warnings: TuiState['warnings']; messages: TuiState['messages'] };
    };

// Module-level tracking to survive React concurrent mode re-renders
// Reset when the module is first loaded (app start)
let globalRenderedIds = new Set<string>();
let globalStaticItems: StaticItem[] = [];

export const TuiApp: React.FC<TuiAppProps> = ({ isTTY }) => {
  const [state, setState] = useState<TuiState>(tuiState.getState());
  const [promptKey, setPromptKey] = useState(0);
  // Track if this is a fresh mount (reset tracking on new TUI session)
  const isFirstMount = useRef(true);

  useEffect(() => {
    // Reset tracking on first mount (new TUI session)
    if (isFirstMount.current) {
      globalRenderedIds = new Set<string>();
      globalStaticItems = [];
      isFirstMount.current = false;
    }
    return tuiState.subscribe(setState);
  }, []);

  // Increment key when a new prompt appears to ensure fresh component instance
  useEffect(() => {
    if (state.activePrompt) {
      setPromptKey((k) => k + 1);
    }
  }, [state.activePrompt]);

  // Compute static items synchronously during render using module-level tracking
  // This avoids React's async useEffect timing issues
  const staticItems = useMemo(() => {
    // Add header if present and not already added
    if (state.header && !globalRenderedIds.has('header')) {
      globalStaticItems = [...globalStaticItems, { type: 'header', id: 'header', data: state.header }];
      globalRenderedIds.add('header');
    }

    // Add completed phases
    for (let i = 0; i < state.phases.length; i++) {
      const phase = state.phases[i];
      const isVisible = isTTY ? phase.status !== 'pending' || phase.events.length > 0 : phase.events.length > 0;
      const isCompleted = phase.status === 'success' || phase.status === 'error';
      // For DEPLOY phase, ensure all events are completed (to capture final summary data)
      const allEventsCompleted =
        phase.id !== 'DEPLOY' || phase.events.every((e) => e.status === 'success' || e.status === 'error');

      if (isVisible && isCompleted && allEventsCompleted && !globalRenderedIds.has(phase.id)) {
        const phaseNumber = i + 1;
        globalStaticItems = [
          ...globalStaticItems,
          {
            type: 'phase',
            id: phase.id,
            data: { phase, phaseNumber, warnings: state.warnings, messages: state.messages }
          }
        ];
        globalRenderedIds.add(phase.id);
      }
    }

    return globalStaticItems;
  }, [state.header, state.phases, state.warnings, state.messages, isTTY]);

  // Messages without a phase are rendered at the bottom (global messages)
  const globalMessages = useMemo(() => {
    return state.messages.filter((m) => !m.phase);
  }, [state.messages]);

  // Active phases: running or pending with events, not completed (completed go to Static)
  const activePhases = useMemo(() => {
    return state.phases.filter((p) => {
      const isVisible = isTTY ? p.status !== 'pending' || p.events.length > 0 : p.events.length > 0;
      const isCompleted = p.status === 'success' || p.status === 'error';
      // For DEPLOY phase, also check if all events are completed
      const allEventsCompleted =
        p.id !== 'DEPLOY' || p.events.every((e) => e.status === 'success' || e.status === 'error');
      // Completed phases go to Static, so exclude them from dynamic section
      return isVisible && !(isCompleted && allEventsCompleted);
    });
  }, [state.phases, isTTY]);

  return (
    <box flexDirection="column">
      {staticItems.map((item) => {
        if (item.type === 'header') {
          return <Header key={item.id} header={item.data!} />;
        }
        if (item.type === 'phase') {
          return (
            <Phase
              key={item.id}
              phase={item.data.phase}
              phaseNumber={item.data.phaseNumber}
              warnings={item.data.warnings}
              messages={item.data.messages}
              isTTY={isTTY}
            />
          );
        }
        return null;
      })}

      {!state.streamingMode && staticItems.length > 0 && activePhases.length > 0 && <text> </text>}
      {!state.streamingMode &&
        activePhases.map((phase) => {
          const phaseNumber = state.phases.findIndex((p) => p.id === phase.id) + 1;
          return (
            <Phase
              key={phase.id}
              phase={phase}
              phaseNumber={phaseNumber}
              warnings={state.warnings}
              messages={state.messages}
              isTTY={isTTY}
            />
          );
        })}

      {globalMessages.length > 0 && (
        <box flexDirection="column" marginTop={1}>
          {globalMessages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))}
        </box>
      )}

      {state.activePrompt && <Prompt key={promptKey} prompt={state.activePrompt} />}

      {state.summary && <Summary summary={state.summary} />}
    </box>
  );
};
