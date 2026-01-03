/** @jsxImportSource @opentui/react */
import type { TuiMessage, TuiPhase, TuiWarning } from '../types';
import React from 'react';
import { stripAnsi } from '../utils';
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
    <box flexDirection="column" marginBottom={1}>
      <box flexDirection="row">
        <text>
          <strong>PHASE {phaseNumber}</strong>
        </text>
        <text> - </text>
        <text>
          <strong>{phase.name}</strong>
        </text>
        {phase.status !== 'pending' && (
          <PhaseTimer startTime={phase.startTime} duration={phase.duration} isRunning={phase.status === 'running'} />
        )}
      </box>
      <text fg="gray">{'-'.repeat(54)}</text>

      {visibleEvents.map((event) => (
        <Event key={event.id} event={event} isTTY={isTTY} />
      ))}

      {phaseWarnings.map((warning) => (
        <box key={warning.id} flexDirection="column">
          {warning.message.split('\n').map((line, idx) => (
            <box key={idx} flexDirection="row">
              {idx === 0 ? <text fg="yellow">? </text> : <text> </text>}
              <text fg="yellow">{stripAnsi(line)}</text>
            </box>
          ))}
        </box>
      ))}

      {phaseMessages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
    </box>
  );
};
