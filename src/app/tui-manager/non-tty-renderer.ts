import type { TuiEvent, TuiMessageType, TuiPhase, TuiState } from './types';
import { logCollectorStream } from '@utils/log-collector';
import stringWidth from 'string-width';
import type { ErrorDisplayData } from './components/Error';
import type { NextStep } from './components/NextSteps';
import type { StackError } from './components/StackErrors';
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

const BORDER_CHAR = '─';
const CORNER_TL = '┌';
const CORNER_TR = '┐';
const CORNER_BL = '└';
const CORNER_BR = '┘';
const VERTICAL = '│';

const ERROR_TYPE_LABELS: Record<string, string> = {
  API_KEY: 'API Key Error',
  API_SERVER: 'API Server Error',
  AWS_ACCOUNT: 'AWS Account Error',
  BUDGET: 'Budget Error',
  CLI: 'CLI Error',
  CODEBUILD: 'CodeBuild Error',
  CONFIG: 'Configuration Error',
  CONFIG_GENERATION: 'Config Generation Error',
  CONFIG_VALIDATION: 'Config Validation Error',
  CONFIRMATION_REQUIRED: 'Confirmation Required',
  CONTAINER: 'Container Error',
  CREDENTIALS: 'Credentials Error',
  DIRECTIVE: 'Directive Error',
  DOCKER: 'Docker Error',
  DOMAIN_MANAGEMENT: 'Domain Management Error',
  EXISTING_STACK: 'Existing Stack Error',
  INPUT: 'Input Error',
  MISSING_OUTPUT: 'Missing Output Error',
  MISSING_PREREQUISITE: 'Missing Prerequisite',
  NON_EXISTING_RESOURCE: 'Resource Not Found',
  NON_EXISTING_STACK: 'Stack Not Found',
  NOT_YET_IMPLEMENTED: 'Not Yet Implemented',
  PACKAGING_CONFIG: 'Packaging Config Error',
  PARAMETER: 'Parameter Error',
  RUNTIME: 'Runtime Error',
  SCRIPT: 'Script Error',
  SOURCE_CODE: 'Source Code Error',
  STACK: 'Stack Error',
  STACK_MONITORING: 'Stack Monitoring Error',
  SUBSCRIPTION_REQUIRED: 'Subscription Required',
  SYNC_BUCKET: 'Bucket Sync Error',
  UNSUPPORTED_RESOURCE: 'Unsupported Resource'
};

const getErrorLabel = (errorType: string): string => {
  return ERROR_TYPE_LABELS[errorType] || errorType.replace(/_/g, ' ') + ' Error';
};

const wrapText = (text: string, maxWidth: number): string[] => {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
};

export const renderErrorToString = (
  error: ErrorDisplayData,
  colorize: (color: string, text: string) => string,
  makeBold: (text: string) => string
): string => {
  const lines: string[] = [];
  const boxWidth = 44;
  const contentWidth = boxWidth - 2;
  const typeLabel = error.isExpected === false ? 'Unexpected Error' : getErrorLabel(error.errorType);

  lines.push(colorize('red', `${CORNER_TL}${BORDER_CHAR.repeat(boxWidth)}${CORNER_TR}`));

  const headerText = `✖ ${typeLabel}`;
  const headerTextWidth = stringWidth(headerText);
  const headerPadding = Math.max(0, contentWidth - headerTextWidth);
  const headerLeftPad = Math.floor(headerPadding / 2);
  const headerRightPad = headerPadding - headerLeftPad;
  lines.push(
    colorize('red', VERTICAL) +
      ' '.repeat(headerLeftPad + 1) +
      colorize('red', makeBold(headerText)) +
      ' '.repeat(headerRightPad + 1) +
      colorize('red', VERTICAL)
  );

  lines.push(colorize('red', `${CORNER_BL}${BORDER_CHAR.repeat(boxWidth)}${CORNER_BR}`));

  lines.push('');
  const messageLines = wrapText(error.message, 100);
  for (const msgLine of messageLines) {
    lines.push(msgLine);
  }

  const hints = error.hints || [];
  if (hints.length > 0) {
    lines.push('');
    lines.push(colorize('blue', makeBold('Hints:')));
    hints.forEach((hint) => {
      lines.push(`  ${colorize('gray', '→')} ${hint}`);
    });
  }

  if (error.stackTrace) {
    lines.push('');
    lines.push(colorize('yellow', makeBold('Stack trace:')));
    lines.push(colorize('gray', error.stackTrace));
  }

  if (error.sentryEventId) {
    lines.push('');
    lines.push(colorize('gray', `Error ID: ${error.sentryEventId}`));
  }

  return lines.join('\n');
};

export const renderNextStepsToString = (
  steps: NextStep[],
  colorize: (color: string, text: string) => string,
  makeBold: (text: string) => string
): string => {
  const lines: string[] = [];

  lines.push('');
  lines.push(colorize('cyan', makeBold('Next steps:')));

  steps.forEach((step, index) => {
    let stepLine = `  ${colorize('cyan', `${index + 1}.`)} ${step.text}`;
    if (step.command) {
      stepLine += ` ${step.command}`;
    }
    lines.push(stepLine);

    step.details?.forEach((detail) => {
      lines.push(`     ${colorize('gray', '→')} ${detail}`);
    });

    step.links?.forEach((link) => {
      lines.push(`     ${colorize('gray', '→')} ${link}`);
    });
  });

  return lines.join('\n');
};

const cleanErrorMessage = (message: string): string => {
  let cleaned = message;
  cleaned = cleaned.replace(/\s*\(RequestToken:[^,]+,\s*HandlerErrorCode:[^)]+\)/gi, '');
  cleaned = cleaned.replace(/\s*\(RequestToken:[^)]+\)/gi, '');
  cleaned = cleaned.replace(/\s*\(HandlerErrorCode:[^)]+\)/gi, '');
  const handlerMatch = cleaned.match(/^Resource handler returned message:\s*"([\s\S]+)"\.?\s*$/);
  if (handlerMatch) {
    cleaned = handlerMatch[1];
  }
  cleaned = cleaned.replace(
    /\s*\(Service:[^,]+,\s*Status Code:\s*\d+,\s*Request ID:[^,]+,\s*SDK Attempt Count:\s*\d+\)/gi,
    ''
  );
  cleaned = cleaned.replace(/\s*\(Service:[^)]+\)/gi, '');
  cleaned = cleaned.replace(/\s*\(SDK Attempt Count:\s*\d+\)/gi, '');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ').trim();
  return cleaned;
};

const parseErrorMessage = (message: string): { resource?: string; context?: string; error: string } => {
  const cleaned = cleanErrorMessage(message);

  const partOfMatch = cleaned.match(/^Resource\s+(\S+)\s+\(part of\s+([^)]+)\):\s*([\s\S]+)$/);
  if (partOfMatch) {
    return {
      resource: partOfMatch[1],
      context: partOfMatch[2],
      error: partOfMatch[3]
    };
  }

  const resourceMatch = cleaned.match(/^Resource\s+(\S+):\s*([\s\S]+)$/);
  if (resourceMatch) {
    return {
      resource: resourceMatch[1],
      error: resourceMatch[2]
    };
  }

  return { error: cleaned };
};

export const renderStackErrorsToString = (
  errors: StackError[],
  colorize: (color: string, text: string) => string
): string => {
  if (errors.length === 0) return '';

  const lines: string[] = [];

  errors.forEach((error, index) => {
    const parsed = parseErrorMessage(error.errorMessage);

    let header = colorize('red', `${index + 1}.`);
    if (parsed.resource) {
      header += ` ${parsed.resource}`;
      if (parsed.context) {
        header += ` (in ${parsed.context})`;
      }
    }
    lines.push(header);

    const errorLines = parsed.error.split('\n');
    errorLines.forEach((line) => {
      lines.push(`   ${line}`);
    });

    if (index < errors.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n');
};
