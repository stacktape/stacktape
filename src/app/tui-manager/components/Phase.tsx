import type { TuiMessage, TuiPhase, TuiWarning } from '../types';
import { Box, Text } from 'ink';
import React from 'react';
import { DeployPhase } from './DeployPhase';
import { Event } from './Event';
import { Message } from './Message';
import { PhaseTimer } from './PhaseTimer';

type PhaseProps = {
  phase: TuiPhase;
  phaseNumber: number;
  warnings: TuiWarning[];
  messages: TuiMessage[];
  isTTY: boolean;
};

// Event types that trigger the fancy CloudFormation progress UI
const CF_DEPLOY_EVENT_TYPES: LoggableEventType[] = [
  'UPDATE_STACK',
  'CREATE_RESOURCES_FOR_ARTIFACTS',
  'DELETE_STACK',
  'ROLLBACK_STACK',
  'HOTSWAP_UPDATE'
];

export const Phase: React.FC<PhaseProps> = ({ phase, phaseNumber, warnings, messages, isTTY }) => {
  // Only use DeployPhase when there are CloudFormation-related events (not for codebuild monitoring, etc.)
  const hasCfEvents = phase.events.some((e) => CF_DEPLOY_EVENT_TYPES.includes(e.eventType));
  if (phase.id === 'DEPLOY' && isTTY && hasCfEvents) {
    return <DeployPhase phase={phase} phaseNumber={phaseNumber} warnings={warnings} messages={messages} />;
  }
  const phaseWarnings = warnings.filter((w) => w.phase === phase.id);
  const phaseMessages = messages.filter((m) => m.phase === phase.id);
  // All events are visible - child hiding is handled in Event.tsx
  const visibleEvents = phase.events;

  if (phase.status === 'pending' && isTTY) {
    return null;
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold>PHASE {phaseNumber}</Text>
        <Text> • </Text>
        <Text bold>{phase.name}</Text>
        {phase.status !== 'pending' && (
          <PhaseTimer startTime={phase.startTime} duration={phase.duration} isRunning={phase.status === 'running'} />
        )}
      </Box>
      <Text color="gray">{'─'.repeat(54)}</Text>

      {visibleEvents.map((event) => (
        <Event key={event.id} event={event} isTTY={isTTY} />
      ))}

      {phaseWarnings.map((warning) => (
        <Box key={warning.id} flexDirection="column">
          {warning.message.split('\n').map((line, idx) => (
            <Box key={idx}>
              {idx === 0 ? <Text color="yellow">⚠ </Text> : <Text> </Text>}
              <Text color="yellow">{line}</Text>
            </Box>
          ))}
        </Box>
      ))}

      {phaseMessages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
    </Box>
  );
};
