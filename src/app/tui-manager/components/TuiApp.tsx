import type { TuiPhase, TuiState } from '../types';
import { Box, Static, Text } from 'ink';
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
      const allEventsCompleted = phase.events.every((e) => e.status === 'success' || e.status === 'error');

      // A phase is ready to be committed to Static when:
      // 1. It's explicitly marked as success/error, OR
      // 2. TUI is finalizing (stopping), it's the current phase, and all events are done
      // We use isFinalizing instead of isComplete to allow afterDeploy hooks to add events
      const isExplicitlyCompleted = phase.status === 'success' || phase.status === 'error';
      const isImplicitlyCompleted =
        state.isFinalizing && phase.id === state.currentPhase && allEventsCompleted && phase.status === 'running';

      if (isVisible && (isExplicitlyCompleted || isImplicitlyCompleted) && !globalRenderedIds.has(phase.id)) {
        const phaseNumber = i + 1;
        // For implicitly completed phases, update the status in the snapshot
        const phaseSnapshot =
          isImplicitlyCompleted && !isExplicitlyCompleted
            ? {
                ...phase,
                status: 'success' as const,
                endTime: Date.now(),
                duration: phase.startTime ? Date.now() - phase.startTime : 0
              }
            : phase;
        globalStaticItems = [
          ...globalStaticItems,
          {
            type: 'phase',
            id: phase.id,
            data: { phase: phaseSnapshot, phaseNumber, warnings: state.warnings, messages: state.messages }
          }
        ];
        globalRenderedIds.add(phase.id);
      }
    }

    return globalStaticItems;
  }, [state.header, state.phases, state.warnings, state.messages, state.isFinalizing, state.currentPhase, isTTY]);

  // Messages without a phase are rendered at the bottom (global messages)
  const globalMessages = useMemo(() => {
    return state.messages.filter((m) => !m.phase);
  }, [state.messages]);

  // Active phases: running or pending with events, not yet committed to Static
  // IMPORTANT: Use globalRenderedIds to check if already in Static, not just completion status.
  // This prevents duplicate rendering during the transition frame.
  const activePhases = useMemo(() => {
    return state.phases.filter((p) => {
      // If already committed to Static, never show in dynamic section
      if (globalRenderedIds.has(p.id)) {
        return false;
      }
      const isVisible = isTTY ? p.status !== 'pending' || p.events.length > 0 : p.events.length > 0;
      return isVisible;
    });
  }, [state.phases, isTTY, staticItems]); // staticItems dependency ensures re-eval when phases move to Static

  return (
    <>
      {/* Static content: header + completed phases - rendered once, never re-rendered */}
      <Static items={staticItems}>
        {(item) => {
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
        }}
      </Static>

      {/* Dynamic content: active phases, prompts, summary */}
      <Box flexDirection="column">
        {/* Add spacing between static (completed) phases and dynamic (active) phases */}
        {staticItems.length > 0 && activePhases.length > 0 && <Text> </Text>}
        {activePhases.map((phase) => {
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
          <Box flexDirection="column">
            {globalMessages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))}
          </Box>
        )}

        {state.activePrompt && <Prompt key={promptKey} prompt={state.activePrompt} />}

        {state.summary && <Summary summary={state.summary} />}
      </Box>
    </>
  );
};
