import type { TuiEvent, TuiMessage, TuiPhase, TuiState } from '../types';
import { Box, Static, Text } from 'ink';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { tuiState } from '../state';
import { Event } from './Event';
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
    }
  | { type: 'event'; id: string; data: TuiEvent }
  | { type: 'message'; id: string; data: TuiMessage };

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

  // Simple mode: no header, render events and messages in timestamp order
  const isSimpleMode = !state.header;

  // Compute static items synchronously during render using module-level tracking
  // This avoids React's async useEffect timing issues
  const staticItems = useMemo(() => {
    if (isSimpleMode) {
      // Simple mode: add completed events and messages in timestamp order
      const allEvents = state.phases.flatMap((p) => p.events);
      const completedEvents = allEvents.filter((e) => e.status === 'success' || e.status === 'error');

      // Combine completed events and messages, sort by timestamp
      const itemsToAdd: { type: 'event' | 'message'; timestamp: number; id: string; data: TuiEvent | TuiMessage }[] =
        [];

      for (const event of completedEvents) {
        if (!globalRenderedIds.has(event.id)) {
          itemsToAdd.push({ type: 'event', timestamp: event.startTime, id: event.id, data: event });
        }
      }

      for (const msg of state.messages) {
        if (!globalRenderedIds.has(`msg-${msg.id}`)) {
          itemsToAdd.push({ type: 'message', timestamp: msg.timestamp, id: `msg-${msg.id}`, data: msg });
        }
      }

      // Sort by timestamp and add to static items
      itemsToAdd.sort((a, b) => a.timestamp - b.timestamp);
      for (const item of itemsToAdd) {
        if (item.type === 'event') {
          globalStaticItems = [...globalStaticItems, { type: 'event', id: item.id, data: item.data as TuiEvent }];
        } else {
          globalStaticItems = [...globalStaticItems, { type: 'message', id: item.id, data: item.data as TuiMessage }];
        }
        globalRenderedIds.add(item.id);
      }
    } else {
      // Phase mode: add header and completed phases
      if (state.header && !globalRenderedIds.has('header')) {
        globalStaticItems = [...globalStaticItems, { type: 'header', id: 'header', data: state.header }];
        globalRenderedIds.add('header');
      }

      for (let i = 0; i < state.phases.length; i++) {
        const phase = state.phases[i];
        const isVisible = isTTY ? phase.status !== 'pending' || phase.events.length > 0 : phase.events.length > 0;
        const allEventsCompleted = phase.events.every((e) => e.status === 'success' || e.status === 'error');
        const isExplicitlyCompleted = phase.status === 'success' || phase.status === 'error';
        const isImplicitlyCompleted =
          state.isFinalizing && phase.id === state.currentPhase && allEventsCompleted && phase.status === 'running';

        if (isVisible && (isExplicitlyCompleted || isImplicitlyCompleted) && !globalRenderedIds.has(phase.id)) {
          const phaseNumber = i + 1;
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
    }

    return globalStaticItems;
  }, [
    isSimpleMode,
    state.header,
    state.phases,
    state.warnings,
    state.messages,
    state.isFinalizing,
    state.currentPhase,
    isTTY
  ]);

  // Messages without a phase are rendered at the bottom (global messages) - only for phase mode
  const globalMessages = useMemo(() => {
    if (isSimpleMode) return []; // In simple mode, messages are handled in staticItems
    return state.messages.filter((m) => !m.phase);
  }, [state.messages, isSimpleMode]);

  // Active phases: running or pending with events, not yet committed to Static
  // IMPORTANT: Use globalRenderedIds to check if already in Static, not just completion status.
  // This prevents duplicate rendering during the transition frame.
  const activePhases = useMemo(() => {
    if (isSimpleMode) return []; // In simple mode, we don't use phases
    return state.phases.filter((p) => {
      // If already committed to Static, never show in dynamic section
      if (globalRenderedIds.has(p.id)) {
        return false;
      }
      const isVisible = isTTY ? p.status !== 'pending' || p.events.length > 0 : p.events.length > 0;
      return isVisible;
    });
  }, [state.phases, isTTY, staticItems, isSimpleMode]);

  // Active events for simple mode (running events not yet in Static)
  const activeEvents = useMemo(() => {
    if (!isSimpleMode) return [];
    const allEvents = state.phases.flatMap((p) => p.events);
    return allEvents.filter((e) => e.status === 'running' && !globalRenderedIds.has(e.id));
  }, [state.phases, staticItems, isSimpleMode]);

  return (
    <>
      {/* Static content: header + completed phases/events - rendered once, never re-rendered */}
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
                showPhaseHeader={!!state.header}
              />
            );
          }
          if (item.type === 'event') {
            return <Event key={item.id} event={item.data} isTTY={isTTY} />;
          }
          if (item.type === 'message') {
            return <Message key={item.id} message={item.data} />;
          }
          return null;
        }}
      </Static>

      {/* Dynamic content: active phases/events, prompts, summary */}
      <Box flexDirection="column">
        {isSimpleMode ? (
          <>
            {/* Simple mode: show running events */}
            {activeEvents.map((event) => (
              <Event key={event.id} event={event} isTTY={isTTY} />
            ))}
          </>
        ) : (
          <>
            {/* Phase mode: show active phases */}
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
                  showPhaseHeader={!!state.header}
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
          </>
        )}

        {state.activePrompt && <Prompt key={promptKey} prompt={state.activePrompt} />}

        {state.summary && <Summary summary={state.summary} />}
      </Box>
    </>
  );
};
