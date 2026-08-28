import {
  operationSession,
  type OperationActivity,
  type OperationRecord
} from '@application-services/operation-manager';
import { tuiDebug } from '../debug';
import { displayInstanceLabel, formatDuration, stripAnsi } from '../format/text';

type StreamPresenterOptions = { onToggle: () => void; onCancel: () => void };

const symbolForStatus = (status: OperationActivity['status']) =>
  status === 'success' ? '✓' : status === 'error' ? '✗' : status === 'warning' ? '!' : '·';

const truncate = (value: string, width: number): string => {
  const clean = stripAnsi(value).replace(/\s+/g, ' ').trim();
  if (clean.length <= width) return clean;
  return width <= 1 ? '…' : `${clean.slice(0, width - 1)}…`;
};

/** Primary-screen presenter: durable lines plus a tiny repaintable active block. */
export class StreamPresenter {
  private unsubscribeJournal: (() => void) | undefined;
  private unsubscribeState: (() => void) | undefined;
  private transientRows = 0;
  private redrawTimer: ReturnType<typeof setTimeout> | undefined;
  private cursor = 0;
  private started = false;
  private inputAttached = false;
  private inputListener: ((chunk: Buffer | Uint8Array | string) => void) | undefined;
  private promptMessages = new Map<string, string>();

  constructor(private options: StreamPresenterOptions) {}

  start(afterSequence = 0) {
    if (this.started) return;
    this.started = true;
    this.cursor = afterSequence;
    for (const record of operationSession.journal.replay(afterSequence)) this.consume(record);
    this.unsubscribeJournal = operationSession.journal.subscribe((record) => this.consume(record));
    this.unsubscribeState = operationSession.store.subscribe(() => this.scheduleRedraw());
    this.attachInput();
    this.redraw();
  }

  stop(): number {
    if (!this.started) return this.cursor;
    this.unsubscribeJournal?.();
    this.unsubscribeState?.();
    this.unsubscribeJournal = undefined;
    this.unsubscribeState = undefined;
    if (this.redrawTimer) clearTimeout(this.redrawTimer);
    this.redrawTimer = undefined;
    this.clearTransient();
    this.detachInput(true);
    this.started = false;
    return this.cursor;
  }

  suspendTerminal() {
    this.clearTransient();
    this.detachInput(true);
  }

  resumeTerminal() {
    if (!this.started) return;
    this.attachInput();
    this.redraw();
  }

  private consume(record: OperationRecord) {
    if (record.sequence <= this.cursor) return;
    this.cursor = record.sequence;
    switch (record.type) {
      case 'header-set':
        this.writePermanent([
          '',
          `stacktape / ${record.header.action.toLowerCase()}`,
          `${record.header.projectName} → ${record.header.stageName}  ${record.header.region}${record.header.subtitle ? `  ${record.header.subtitle}` : ''}`,
          ''
        ]);
        break;
      case 'phase-entered': {
        const phase = operationSession.store.getSnapshot().phases.find((candidate) => candidate.id === record.phase);
        if (operationSession.store.getSnapshot().showPhaseHeaders)
          this.writePermanent([`── ${phase?.name ?? record.phase} ──`]);
        break;
      }
      case 'activity-output': {
        const activity = operationSession.store.getSnapshot().activities[record.activityId];
        const running = Object.values(operationSession.store.getSnapshot().activities).filter(
          (candidate) => candidate.status === 'running'
        );
        const source =
          running.length > 1 && activity?.instanceId ? `[${displayInstanceLabel(activity.instanceId)}] ` : '';
        this.writePermanent(record.lines.filter(Boolean).map((line) => `${source}${stripAnsi(line)}`));
        break;
      }
      case 'activity-finished': {
        const activity = operationSession.store.getSnapshot().activities[record.activityId];
        if (!activity) break;
        const prefix = activity.parentActivityId ? '  ' : '';
        const duration = activity.duration === undefined ? '' : ` (${formatDuration(activity.duration)})`;
        const outcome =
          activity.finalMessage && activity.finalMessage !== activity.description ? ` — ${activity.finalMessage}` : '';
        this.writePermanent([
          `${prefix}${symbolForStatus(activity.status)} ${activity.description}${duration}${outcome}`
        ]);
        break;
      }
      case 'message': {
        const symbol =
          record.level === 'error' ? '✗' : record.level === 'warn' ? '!' : record.level === 'success' ? '✓' : 'i';
        this.writePermanent([`${symbol} ${stripAnsi(record.message)}`]);
        break;
      }
      case 'prompt-opened':
        this.promptMessages.set(record.prompt.id, record.prompt.message);
        break;
      case 'prompt-closed': {
        if (!record.cancelled) {
          const answer = record.sensitive ? 'provided' : (record.answer ?? 'answered');
          this.writePermanent([`? ${this.promptMessages.get(record.promptId) ?? 'Input'}  ${answer}`]);
        }
        this.promptMessages.delete(record.promptId);
        break;
      }
      case 'session-completed':
        this.writePermanent([
          '',
          `${record.summary.success ? '✓' : '✗'} ${record.summary.message}`,
          ...record.summary.links.map((link) => `  ${link.label}: ${link.url}`),
          ''
        ]);
        break;
      default:
        break;
    }
    this.scheduleRedraw();
  }

  private activeLines(): string[] {
    const width = Math.max(20, (process.stdout.columns || 80) - 4);
    const state = operationSession.store.getSnapshot();
    const active = state.activityOrder
      .map((id) => state.activities[id])
      .filter((activity) => activity.status === 'running');
    if (active.length === 0 || state.isFinalizing) return [];
    const visible = active.slice(-6);
    const overflow = active.length - visible.length;
    return [
      ...visible.map((activity) => {
        const label = activity.instanceId ? displayInstanceLabel(activity.instanceId) : activity.description;
        const detail = activity.additionalMessage ? ` — ${activity.additionalMessage}` : '';
        return `⠋ ${truncate(`${label}${detail}`, width)}`;
      }),
      ...(overflow > 0 ? [`  +${overflow} more active`] : []),
      '  ctrl+t dashboard  ·  ctrl+c cancel'
    ];
  }

  private scheduleRedraw() {
    if (!this.started || this.redrawTimer) return;
    this.redrawTimer = setTimeout(() => {
      this.redrawTimer = undefined;
      this.redraw();
    }, 32);
  }

  private redraw() {
    if (!this.started) return;
    this.clearTransient();
    const lines = this.activeLines();
    if (lines.length === 0) return;
    this.writeRaw(`${lines.join('\n')}\n`);
    this.transientRows = lines.length;
  }

  private writePermanent(lines: string[]) {
    if (lines.length === 0) return;
    this.clearTransient();
    this.writeRaw(`${lines.join('\n')}\n`);
    if (this.started) this.redraw();
  }

  private clearTransient() {
    if (this.transientRows === 0) return;
    let sequence = '';
    for (let row = 0; row < this.transientRows; row++) sequence += '\x1b[1A\r\x1b[2K';
    this.writeRaw(sequence);
    this.transientRows = 0;
  }

  private writeRaw(value: string) {
    try {
      process.stdout.write(value);
    } catch {}
  }

  private onInput = (chunk: Buffer | Uint8Array | string) => {
    const value = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    const toggled = value.includes('\u0014');
    const cancelled = value.includes('\u0003');
    if (toggled || cancelled) tuiDebug('STREAM', 'control input', { toggled, cancelled });
    if (toggled) this.options.onToggle();
    if (cancelled) this.options.onCancel();
  };

  private attachInput() {
    if (this.inputAttached || !process.stdin.isTTY) return;
    try {
      process.stdin.setRawMode(true);
      process.stdin.ref();
      this.inputListener = (chunk) => this.onInput(chunk);
      process.stdin.prependListener('data', this.inputListener);
      process.stdin.resume();
      this.inputAttached = true;
      tuiDebug('STREAM', 'input attached', {
        isRaw: process.stdin.isRaw,
        isPaused: process.stdin.isPaused(),
        dataListeners: process.stdin.listenerCount('data')
      });
    } catch {}
  }

  private detachInput(release: boolean) {
    if (!this.inputAttached) return;
    try {
      if (this.inputListener) process.stdin.off('data', this.inputListener);
      this.inputListener = undefined;
      if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
      if (release) {
        process.stdin.pause();
        process.stdin.unref();
      }
    } catch {}
    this.inputAttached = false;
    tuiDebug('STREAM', 'input detached', { release });
  }
}
