import type { TuiMessage, TuiPhase, TuiWarning } from '../types';
import { Box, Text } from 'ink';
import React from 'react';
import { formatPhaseTimer } from '../utils';
import { DeployPhase } from './DeployPhase';
import { Event } from './Event';
import { Message } from './Message';

type PhaseProps = {
  phase: TuiPhase;
  phaseNumber: number;
  warnings: TuiWarning[];
  messages: TuiMessage[];
  isTTY: boolean;
};

export const Phase: React.FC<PhaseProps> = ({ phase, phaseNumber, warnings, messages, isTTY }) => {
  if (phase.id === 'DEPLOY' && isTTY) {
    return <DeployPhase phase={phase} phaseNumber={phaseNumber} warnings={warnings} messages={messages} />;
  }
  const phaseWarnings = warnings.filter((w) => w.phase === phase.id);
  const phaseMessages = messages.filter((m) => m.phase === phase.id);
  // All events are visible - child hiding is handled in Event.tsx
  const visibleEvents = phase.events;

  if (phase.status === 'pending' && isTTY) {
    return null;
  }

  // eslint-disable-next-line react-hooks/purity
  const duration = phase.duration || (phase.startTime ? Date.now() - phase.startTime : 0);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold>PHASE {phaseNumber}</Text>
        <Text> • </Text>
        <Text bold>{phase.name}</Text>
        {phase.status !== 'pending' && <Text color="gray"> {formatPhaseTimer(duration)}</Text>}
      </Box>
      <Text color="gray">{'─'.repeat(54)}</Text>

      {visibleEvents.map((event) => (
        <Event key={event.id} event={event} isTTY={isTTY} />
      ))}

      {phaseWarnings.map((warning) => (
        <Box key={warning.id}>
          <Text color="yellow">⚠ {warning.message}</Text>
        </Box>
      ))}

      {phaseMessages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
    </Box>
  );
};
