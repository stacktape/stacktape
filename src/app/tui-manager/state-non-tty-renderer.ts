import type { TuiEvent, TuiPhase, TuiState } from './types';
import { PHASE_NAMES } from './types';
import { formatDuration } from './utils';

export class NonTtyRenderer {
  private printedItems = new Set<string>();
  private lastAdditionalMessages = new Map<string, string>();

  reset() {
    this.printedItems.clear();
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

    const globalMessages = state.messages.filter((m) => !m.phase);
    for (const msg of globalMessages) {
      const msgKey = `msg-${msg.id}`;
      if (!this.printedItems.has(msgKey)) {
        const prefix = this.getMessagePrefix(msg.type);
        this.log(`${prefix} ${msg.message}`);
        this.printedItems.add(msgKey);
      }
    }

    if (state.summary && !this.printedItems.has('summary')) {
      this.printSummary(state);
      this.printedItems.add('summary');
    }
  }

  private log(message: string) {
    console.info(message);
  }

  private printHeader(state: TuiState) {
    if (!state.header) return;
    const { header } = state;
    const subtitleLine = header.subtitle ? `| ${header.subtitle.padEnd(68)} |` : null;
    this.log('');
    this.log('+----------------------------------------------------------------------+');
    this.log(`| ${header.action.padEnd(68)} |`);
    this.log(`| ${`${header.projectName} -> ${header.stageName} (${header.region})`.padEnd(68)} |`);
    if (subtitleLine) {
      this.log(subtitleLine);
    }
    this.log('+----------------------------------------------------------------------+');
    this.log('');
  }

  private renderPhase(phase: TuiPhase, state: TuiState) {
    const phaseKey = `phase-${phase.id}`;
    const phaseNumber = state.phases.findIndex((p) => p.id === phase.id) + 1;
    const phaseName = state.phases.find((p) => p.id === phase.id)?.name || PHASE_NAMES[phase.id] || phase.name;
    const simpleMode = state.showPhaseHeaders === false;
    const eventIndent = simpleMode ? 0 : 1;

    if (phase.status !== 'pending' && !this.printedItems.has(phaseKey) && !simpleMode) {
      this.log('');
      this.log(`PHASE ${phaseNumber} • ${phaseName}`);
      this.log('------------------------------------------------------');
      this.printedItems.add(phaseKey);
    }

    for (const event of phase.events) {
      this.renderEvent(event, eventIndent);
    }

    const phaseWarnings = state.warnings.filter((w) => w.phase === phase.id);
    for (const warning of phaseWarnings) {
      const warnKey = `warn-${warning.id}`;
      if (!this.printedItems.has(warnKey)) {
        this.log(`  [!] ${warning.message}`);
        this.printedItems.add(warnKey);
      }
    }

    const phaseMessages = state.messages.filter((m) => m.phase === phase.id);
    for (const msg of phaseMessages) {
      const msgKey = `msg-${msg.id}`;
      if (!this.printedItems.has(msgKey)) {
        const prefix = this.getMessagePrefix(msg.type);
        this.log(`  ${prefix} ${msg.message}`);
        this.printedItems.add(msgKey);
      }
    }
  }

  private renderEvent(event: TuiEvent, indent: number) {
    const prefix = '  '.repeat(indent);
    const startKey = `event-start-${event.id}`;
    const finishKey = `event-finish-${event.id}`;
    const description = event.instanceId ? `${event.description} (${event.instanceId})` : event.description;

    if (event.status === 'running' && !this.printedItems.has(startKey)) {
      this.log(`${prefix}[i] ${description}`);
      this.printedItems.add(startKey);
    }

    if (event.status === 'running' && event.additionalMessage) {
      const cleanMsg = this.stripAnsi(event.additionalMessage)?.trim();
      if (cleanMsg) {
        const normalized = this.normalizeProgress(cleanMsg);
        const previous = this.lastAdditionalMessages.get(event.id);
        if (previous !== normalized) {
          this.log(`${prefix}[i] ${description} - ${cleanMsg}`);
          this.lastAdditionalMessages.set(event.id, normalized);
        }
      }
    }

    if (event.outputLines) {
      for (let i = 0; i < event.outputLines.length; i++) {
        const line = event.outputLines[i];
        if (!line.trim()) continue;
        const lineKey = `output-${event.id}-${i}`;
        if (!this.printedItems.has(lineKey)) {
          this.log(`${prefix}   ${line}`);
          this.printedItems.add(lineKey);
        }
      }
    }

    for (const child of event.children) {
      this.renderEvent(child, indent + 1);
    }

    if ((event.status === 'success' || event.status === 'error') && !this.printedItems.has(finishKey)) {
      const icon = event.status === 'success' ? '[+]' : '[x]';
      const duration = event.duration ? ` (${formatDuration(event.duration)})` : '';
      const finalMsg = event.finalMessage ? ` ${event.finalMessage}` : '';
      this.log(`${prefix}${icon} ${description}${duration}${finalMsg}`);
      this.printedItems.add(finishKey);
    }
  }

  private printSummary(state: TuiState) {
    if (!state.summary) return;
    const { summary } = state;

    this.log('');
    this.log('------------------------------------------------------------------------');
    const icon = summary.success ? '[+]' : '[x]';
    this.log(`${icon} ${summary.message}`);

    for (const link of summary.links) {
      this.log(`  * ${link.label}`);
      this.log(`    ${link.url}`);
    }

    if (summary.consoleUrl) {
      this.log('');
      this.log('  Stack details:');
      this.log(`    ${summary.consoleUrl}`);
    }
  }

  private getMessagePrefix(type: string): string {
    switch (type) {
      case 'success':
        return '[+]';
      case 'error':
        return '[x]';
      case 'warn':
        return '[!]';
      case 'info':
        return '[i]';
      case 'hint':
        return '[?]';
      case 'debug':
        return '[.]';
      default:
        return '[*]';
    }
  }

  private stripAnsi(text?: string): string | undefined {
    if (!text) return text;
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1B\[[0-9;]*m/g, '');
  }

  private normalizeProgress(msg: string): string {
    return msg.replace(/Estimate:\s*~?(<)?\d+%/gi, 'Estimate: ~%').trim();
  }
}
