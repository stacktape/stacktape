import type { TuiEvent, TuiMessageType, TuiPhase, TuiState } from './types';
import { logCollectorStream } from '@utils/log-collector';
import { PHASE_NAMES, PHASE_ORDER } from './types';
import { formatDuration } from './utils';

// ASCII-safe symbols for non-TTY output (Unicode doesn't render well when piped)
const SYMBOLS = {
  success: '[+]',
  error: '[x]',
  running: '[~]',
  parent: '>',
  warning: '[!]'
};

const MESSAGE_TYPE_PREFIXES: Record<TuiMessageType, string> = {
  info: '[i]',
  success: '[+]',
  error: '[x]',
  warn: '[!]',
  debug: '[.]',
  hint: '[?]',
  start: '[>]',
  announcement: '[*]'
};

const PARENT_EVENT_TYPES: LoggableEventType[] = [
  'LOAD_METADATA_FROM_AWS',
  'PACKAGE_ARTIFACTS',
  'UPLOAD_DEPLOYMENT_ARTIFACTS'
];

class NonTTYRenderer {
  private printedItems: Set<string> = new Set();
  private lastState: TuiState | null = null;
  private lastAdditionalMessages: Map<string, string> = new Map();

  private log(message: string) {
    console.info(message);
    logCollectorStream.write(message);
  }

  private stripAnsi(message?: string) {
    if (!message) return message;
    // eslint-disable-next-line no-control-regex
    return message.replace(/\x1B\[[0-9;]*m/g, '');
  }

  private normalizeProgressMessage(message: string) {
    return message.replace(/Estimate:\s*~?(<)?\d+%/gi, 'Estimate: ~%').trim();
  }

  reset() {
    this.printedItems.clear();
    this.lastState = null;
    this.lastAdditionalMessages.clear();
  }

  render(state: TuiState) {
    if (state.header && !this.printedItems.has('header')) {
      this.printHeader(state);
      this.printedItems.add('header');
    }

    for (const phase of state.phases) {
      this.renderPhase(phase, state);
    }

    // Render messages after phases (hints, errors, etc.)
    this.renderMessages(state);

    if (state.summary && !this.printedItems.has('summary')) {
      this.printSummary(state);
      this.printedItems.add('summary');
    }

    this.lastState = state;
  }

  private renderMessages(state: TuiState) {
    // Only render global messages (without a phase) here
    // Phase-specific messages are rendered inline by renderPhase
    const globalMessages = state.messages.filter((m) => !m.phase);
    for (const msg of globalMessages) {
      const msgKey = `message-${msg.id}`;
      if (!this.printedItems.has(msgKey)) {
        const prefix = MESSAGE_TYPE_PREFIXES[msg.type];
        this.log(`${prefix} ${msg.message}`);
        this.printedItems.add(msgKey);
      }
    }
  }

  private printHeader(state: TuiState) {
    const { header } = state;
    if (!header) return;

    this.log('');
    this.log('+--------------------------------------------------------------------+');
    this.log(`| ${header.action.padEnd(66)} |`);
    this.log(`| ${`${header.projectName} -> ${header.stageName} (${header.region})`.padEnd(66)} |`);
    this.log('+--------------------------------------------------------------------+');
    this.log('');
  }

  private renderPhase(phase: TuiPhase, state: TuiState) {
    const phaseKey = `phase-${phase.id}`;
    const phaseNumber = PHASE_ORDER.indexOf(phase.id) + 1;

    if (phase.status !== 'pending' && !this.printedItems.has(phaseKey)) {
      this.log('');
      this.log(`${SYMBOLS.parent} PHASE ${phaseNumber} - ${PHASE_NAMES[phase.id]}`);
      this.log('--------------------------------------------------------------------');
      this.log('');
      this.printedItems.add(phaseKey);
    }

    for (const event of phase.events) {
      this.renderEvent(event, 1);
    }

    const phaseWarnings = state.warnings.filter((w) => w.phase === phase.id);
    for (const warning of phaseWarnings) {
      const warningKey = `warning-${warning.id}`;
      if (!this.printedItems.has(warningKey)) {
        this.log(`  ${SYMBOLS.warning} ${warning.message}`);
        this.printedItems.add(warningKey);
      }
    }

    // Render phase-specific messages inline
    const phaseMessages = state.messages.filter((m) => m.phase === phase.id);
    for (const msg of phaseMessages) {
      const msgKey = `message-${msg.id}`;
      if (!this.printedItems.has(msgKey)) {
        const prefix = MESSAGE_TYPE_PREFIXES[msg.type];
        this.log(`  ${prefix} ${msg.message}`);
        this.printedItems.add(msgKey);
      }
    }
  }

  private renderEvent(event: TuiEvent, indent: number, isChild: boolean = false) {
    const prefix = '  '.repeat(indent);
    const startKey = `event-start-${event.id}`;
    const finishKey = `event-finish-${event.id}`;
    const isKnownParent = PARENT_EVENT_TYPES.includes(event.eventType);

    // Include instanceId in description for child events (e.g., workload name)
    const description = event.instanceId ? `${event.description} (${event.instanceId})` : event.description;

    if (event.status === 'running' && !this.printedItems.has(startKey)) {
      const icon = isChild ? SYMBOLS.running : isKnownParent ? SYMBOLS.parent : SYMBOLS.running;
      this.log(`${prefix}${icon} ${description}`);
      this.printedItems.add(startKey);
    }

    if (event.status === 'running' && event.additionalMessage) {
      const cleanedMessage = this.stripAnsi(event.additionalMessage)?.trim();
      if (cleanedMessage) {
        const normalized = this.normalizeProgressMessage(cleanedMessage);
        const previous = this.lastAdditionalMessages.get(event.id);
        if (previous !== normalized) {
          this.log(`${prefix}${SYMBOLS.running} ${description} - ${cleanedMessage}`);
          this.lastAdditionalMessages.set(event.id, normalized);
        }
      }
    }

    // Render output lines (e.g., from script execution)
    if (event.outputLines) {
      for (let i = 0; i < event.outputLines.length; i++) {
        const line = event.outputLines[i];
        if (!line.trim()) continue; // Skip empty lines
        const lineKey = `event-output-${event.id}-${i}`;
        if (!this.printedItems.has(lineKey)) {
          this.log(`${prefix}   ${line}`);
          this.printedItems.add(lineKey);
        }
      }
    }

    for (const child of event.children) {
      this.renderEvent(child, indent + 1, true);
    }

    if ((event.status === 'success' || event.status === 'error') && !this.printedItems.has(finishKey)) {
      const icon = event.status === 'success' ? SYMBOLS.success : SYMBOLS.error;
      const duration = event.duration ? ` (${formatDuration(event.duration)})` : '';
      const message = event.finalMessage ? ` ${event.finalMessage}` : '';
      this.log(`${prefix}${icon} ${description}${duration}${message}`);
      this.printedItems.add(finishKey);
    }
  }

  private printSummary(state: TuiState) {
    const { summary } = state;
    if (!summary) return;

    this.log('');
    const icon = summary.success ? SYMBOLS.success : SYMBOLS.error;
    this.log(`${icon} ${summary.message}`);
    this.log('--------------------------------------------------------------------');

    for (const link of summary.links) {
      this.log(`  * ${link.label}`);
      this.log(`    ${link.url}`);
      this.log('');
    }

    if (summary.consoleUrl) {
      this.log('  Stack details:');
      this.log(`    ${summary.consoleUrl}`);
    }
  }
}

export const nonTTYRenderer = new NonTTYRenderer();
