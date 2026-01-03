import type { TuiPhase, TuiState } from '../types';
import { Box, Static } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
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

export const TuiApp: React.FC<TuiAppProps> = ({ isTTY }) => {
  const [state, setState] = useState<TuiState>(tuiState.getState());
  const [promptKey, setPromptKey] = useState(0);
  // Track completed items that have been added to Static (using state for proper tracking)
  const [staticItems, setStaticItems] = useState<StaticItem[]>([]);
  const [renderedIds, setRenderedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    return tuiState.subscribe(setState);
  }, []);

  // Increment key when a new prompt appears to ensure fresh component instance
  useEffect(() => {
    if (state.activePrompt) {
      setPromptKey((k) => k + 1);
    }
  }, [state.activePrompt]);

  // Add new completed items to static list
  useEffect(() => {
    const newItems: StaticItem[] = [];
    const newIds = new Set(renderedIds);

    // Add header to static if present and not already added
    if (state.header && !renderedIds.has('header')) {
      newItems.push({ type: 'header', id: 'header', data: state.header });
      newIds.add('header');
    }

    // Add completed phases to static
    for (let i = 0; i < state.phases.length; i++) {
      const phase = state.phases[i];
      const isVisible = isTTY ? phase.status !== 'pending' || phase.events.length > 0 : phase.events.length > 0;
      const isCompleted = phase.status === 'success' || phase.status === 'error';

      if (isVisible && isCompleted && !renderedIds.has(phase.id)) {
        const phaseNumber = i + 1; // Use index in current phase order
        newItems.push({
          type: 'phase',
          id: phase.id,
          data: { phase, phaseNumber, warnings: state.warnings, messages: state.messages }
        });
        newIds.add(phase.id);
      }
    }

    if (newItems.length > 0) {
      setStaticItems((prev) => [...prev, ...newItems]);
      setRenderedIds(newIds);
    }
  }, [state.header, state.phases, state.warnings, state.messages, isTTY, renderedIds]);

  // Messages without a phase are rendered at the bottom (global messages)
  const globalMessages = useMemo(() => {
    return state.messages.filter((m) => !m.phase);
  }, [state.messages]);

  // Active phases: running or pending with events, not yet rendered to Static
  const activePhases = useMemo(() => {
    return state.phases.filter((p) => {
      const isVisible = isTTY ? p.status !== 'pending' || p.events.length > 0 : p.events.length > 0;
      return isVisible && !renderedIds.has(p.id);
    });
  }, [state.phases, isTTY, renderedIds]);

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
      {/* Hide active phases in streaming mode to prevent conflicts with console.log */}
      <Box flexDirection="column">
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
          <Box flexDirection="column" marginTop={1}>
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
