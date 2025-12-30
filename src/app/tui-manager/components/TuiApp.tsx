import type { TuiState } from '../types';
import { Box } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import { tuiState } from '../state';
import { PHASE_ORDER } from '../types';
import { Header } from './Header';
import { Message } from './Message';
import { Phase } from './Phase';
import { Prompt } from './Prompt';
import { Summary } from './Summary';

type TuiAppProps = {
  isTTY: boolean;
};

export const TuiApp: React.FC<TuiAppProps> = ({ isTTY }) => {
  const [state, setState] = useState<TuiState>(tuiState.getState());
  const [, setTick] = useState(0);

  useEffect(() => {
    return tuiState.subscribe(setState);
  }, []);

  // Memoize to prevent effect from restarting unnecessarily
  const hasRunningPhase = useMemo(() => state.phases.some((p) => p.status === 'running'), [state.phases]);

  // Force re-render every second to update phase timers (only when a phase is running)
  useEffect(() => {
    if (!isTTY || !hasRunningPhase) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isTTY, hasRunningPhase]);

  const visiblePhases = useMemo(() => {
    return state.phases.filter((p) => {
      if (isTTY) {
        return p.status !== 'pending' || p.events.length > 0;
      }
      return p.events.length > 0;
    });
  }, [state.phases, isTTY]);

  // Messages without a phase are rendered at the bottom (global messages)
  const globalMessages = useMemo(() => {
    return state.messages.filter((m) => !m.phase);
  }, [state.messages]);

  return (
    <Box flexDirection="column">
      {state.header && <Header header={state.header} />}

      {visiblePhases.map((phase) => {
        const phaseNumber = PHASE_ORDER.indexOf(phase.id) + 1;
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

      {state.activePrompt && <Prompt prompt={state.activePrompt} />}

      {state.summary && <Summary summary={state.summary} />}
    </Box>
  );
};
