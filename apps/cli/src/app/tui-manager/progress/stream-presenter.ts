import {
  operationSession,
  type CloudFormationProgressDetail,
  type OperationActivity,
  type OperationHeader,
  type OperationRecord
} from '@application-services/operation-manager';
import { tuiDebug } from '../debug';
import { commandNameForHeaderAction } from '../format/blocks';
import {
  bold,
  colorize,
  displayInstanceLabel,
  formatDuration,
  isTextStylingEnabled,
  stripAnsi,
  visibleWidth
} from '../format/text';
import { glyphs } from '../ui/glyphs';

type StreamPresenterOptions = { onToggle: () => void; onCancel: () => void };
type CfMilestone = { completedCount: number; timestamp: number };

const statusColor = (status: OperationActivity['status']) =>
  status === 'success' ? 'green' : status === 'error' ? 'red' : status === 'warning' ? 'yellow' : 'gray';

const symbolForStatus = (status: OperationActivity['status']) =>
  colorize(
    statusColor(status),
    status === 'success'
      ? glyphs.success
      : status === 'error'
        ? glyphs.error
        : status === 'warning'
          ? glyphs.warning
          : glyphs.pending
  );

const collapseWhitespace = (value: string): string => stripAnsi(value).replace(/\s+/g, ' ').trim();

const truncatePlain = (value: string, width: number): string => {
  const clean = collapseWhitespace(value);
  if (visibleWidth(clean) <= width) return clean;
  if (width <= 1) return '…';
  let result = '';
  for (const character of clean) {
    if (visibleWidth(`${result}${character}…`) > width) break;
    result += character;
  }
  return `${result}…`;
};

const isCloudFormationDetail = (detail: unknown): detail is CloudFormationProgressDetail =>
  !!detail && typeof detail === 'object' && Reflect.get(detail, 'kind') === 'cloudformation-progress';

const scriptDetail = (activity: OperationActivity): { trigger?: string; target?: string } | undefined => {
  if (!activity.detail || typeof activity.detail !== 'object' || Reflect.get(activity.detail, 'kind') !== 'script') {
    return undefined;
  }
  const trigger = Reflect.get(activity.detail, 'trigger');
  const target = Reflect.get(activity.detail, 'target');
  return {
    ...(typeof trigger === 'string' && trigger ? { trigger } : {}),
    ...(typeof target === 'string' && target && target !== 'local' ? { target } : {})
  };
};

const displayLabel = (activity: OperationActivity): string | undefined =>
  activity.label ?? (activity.instanceId ? displayInstanceLabel(activity.instanceId) : undefined);

const pastTense = (action: 'CREATE' | 'UPDATE' | 'DELETE', count: number) => {
  const verb = action === 'CREATE' ? 'created' : action === 'UPDATE' ? 'updated' : 'deleted';
  return `${count} ${verb}`;
};

/** Primary-screen presenter: durable native scrollback plus a bounded running-work block. */
export class StreamPresenter {
  private unsubscribeJournal: (() => void) | undefined;
  private unsubscribeState: (() => void) | undefined;
  private transientRows = 0;
  private redrawTimer: ReturnType<typeof setTimeout> | undefined;
  private animationClock: ReturnType<typeof setInterval> | undefined;
  private animationFrame = 0;
  private cursor = 0;
  private started = false;
  private suspended = false;
  private inputAttached = false;
  private cursorHidden = false;
  private inputListener: ((chunk: Buffer | Uint8Array | string) => void) | undefined;
  private resizeListener: (() => void) | undefined;
  private promptMessages = new Map<string, string>();
  private scriptBlocks = new Set<string>();
  private cfMilestones = new Map<string, CfMilestone>();
  private hasPermanentOutput = false;
  private permanentEndsWithBlank = false;

  constructor(private options: StreamPresenterOptions) {}

  start(afterSequence = 0) {
    if (this.started) return;
    this.started = true;
    this.suspended = false;
    this.cursor = afterSequence;
    for (const record of operationSession.journal.replay(afterSequence)) this.consume(record);
    this.unsubscribeJournal = operationSession.journal.subscribe((record) => this.consume(record));
    this.unsubscribeState = operationSession.store.subscribe(() => this.scheduleRedraw());
    this.attachResize();
    this.attachInput();
    this.redraw();
  }

  stop(): number {
    if (!this.started) return this.cursor;
    this.unsubscribeJournal?.();
    this.unsubscribeState?.();
    this.unsubscribeJournal = undefined;
    this.unsubscribeState = undefined;
    this.clearRedrawTimer();
    this.stopAnimationClock();
    this.clearTransient(true);
    this.detachResize();
    this.detachInput(true);
    this.started = false;
    this.suspended = false;
    return this.cursor;
  }

  suspendTerminal() {
    if (!this.started || this.suspended) return;
    this.suspended = true;
    this.clearRedrawTimer();
    this.stopAnimationClock();
    this.clearTransient(true);
    this.detachResize();
    this.detachInput(true);
  }

  resumeTerminal() {
    if (!this.started || !this.suspended) return;
    this.suspended = false;
    for (const record of operationSession.journal.replay(this.cursor)) this.consume(record);
    this.attachResize();
    this.attachInput();
    this.redraw();
  }

  private consume(record: OperationRecord) {
    if (this.suspended || record.sequence <= this.cursor) return;
    this.cursor = record.sequence;
    switch (record.type) {
      case 'session-configured':
        this.promptMessages.clear();
        this.scriptBlocks.clear();
        this.cfMilestones.clear();
        this.hasPermanentOutput = false;
        this.permanentEndsWithBlank = false;
        break;
      case 'header-set':
        this.writeHeader(record.header);
        break;
      case 'phase-entered': {
        const phase = operationSession.store.getSnapshot().phases.find((candidate) => candidate.id === record.phase);
        if (operationSession.store.getSnapshot().showPhaseHeaders) {
          this.writePermanent(['', this.phaseHeader(phase?.name ?? record.phase)]);
        }
        break;
      }
      case 'activity-started':
        if (record.activity.eventType === 'RUN_SCRIPT') this.openScriptBlock(record.activity);
        break;
      case 'activity-updated':
        this.writeCloudFormationMilestone(record);
        break;
      case 'activity-output':
        this.writeActivityOutput(record);
        break;
      case 'activity-finished': {
        const activity = operationSession.store.getSnapshot().activities[record.activityId];
        if (!activity) break;
        if (activity.eventType === 'RUN_SCRIPT' && this.scriptBlocks.has(activity.id)) {
          this.closeScriptBlock(activity);
        } else {
          this.writePermanent([this.finishedActivityLine(activity)]);
        }
        break;
      }
      case 'message': {
        const lines = stripAnsi(record.message).split(/\r?\n/);
        const symbol = colorize(
          record.level === 'error'
            ? 'red'
            : record.level === 'warn'
              ? 'yellow'
              : record.level === 'success'
                ? 'green'
                : 'cyan',
          record.level === 'error'
            ? glyphs.error
            : record.level === 'warn'
              ? glyphs.warning
              : record.level === 'success'
                ? glyphs.success
                : glyphs.info
        );
        this.writePermanent(lines.map((line, index) => (index === 0 ? `${symbol} ${line}` : `  ${line}`)));
        break;
      }
      case 'prompt-opened':
        this.promptMessages.set(record.prompt.id, record.prompt.message);
        break;
      case 'prompt-closed': {
        if (!record.cancelled) {
          const answer = record.sensitive ? 'provided' : (record.answer ?? 'answered');
          this.writePermanent([
            `${colorize('cyan', '?')} ${this.promptMessages.get(record.promptId) ?? 'Input'}  ${colorize('gray', answer)}`
          ]);
        }
        this.promptMessages.delete(record.promptId);
        break;
      }
      case 'session-completed':
        this.writePermanent([
          '',
          `${colorize(record.summary.success ? 'green' : 'red', record.summary.success ? glyphs.success : glyphs.error)} ${bold(record.summary.message)}`,
          ...record.summary.links.map((link) => `  ${colorize('gray', `${link.label}:`)} ${link.url}`),
          ''
        ]);
        break;
      default:
        break;
    }
    this.scheduleRedraw();
  }

  private writeHeader(header: OperationHeader) {
    const command = commandNameForHeaderAction(header.action);
    const target = `${bold(header.projectName)} ${colorize('gray', '/')} ${bold(header.stageName)}`;
    const metadata = `${colorize('gray', `· ${header.region}`)}${header.subtitle ? colorize('gray', ` · ${header.subtitle}`) : ''}`;
    this.writePermanent([`${bold(colorize('cyan', 'stacktape'))} ${bold(command)}`, `${target}  ${metadata}`, '']);
  }

  private phaseHeader(name: string): string {
    const width = Math.min(72, Math.max(32, (process.stdout.columns || 80) - 1));
    const prefix = `── ${name} `;
    const rule = glyphs.rule.repeat(Math.max(2, width - visibleWidth(prefix)));
    return `${colorize('gray', '──')} ${bold(name)} ${colorize('gray', rule)}`;
  }

  private openScriptBlock(activity: OperationActivity) {
    this.scriptBlocks.add(activity.id);
    const label = displayLabel(activity) ?? 'script';
    const detail = scriptDetail(activity);
    const context = [
      detail?.trigger ? `${detail.trigger} hook` : undefined,
      detail?.target ? `via ${detail.target}` : undefined
    ]
      .filter(Boolean)
      .join(' · ');
    this.writePermanent([
      '',
      `  ${colorize('gray', '┌')} ${bold(label)}${context ? `  ${colorize('gray', context)}` : ''}`
    ]);
  }

  private writeActivityOutput(record: Extract<OperationRecord, { type: 'activity-output' }>) {
    const activity = operationSession.store.getSnapshot().activities[record.activityId];
    if (!activity) return;
    const label = displayLabel(activity);
    const indent = activity.eventType === 'RUN_SCRIPT' || activity.parentActivityId ? '  ' : '';
    const gutterColor = record.stream === 'stderr' ? 'yellow' : 'gray';
    const gutter = colorize(gutterColor, `${indent}${glyphs.gutter}`);
    const source = label ? `${colorize('gray', `[${label}]`)} ` : '';
    const preserveStyle = record.stream !== 'diagnostic' && isTextStylingEnabled();
    this.writePermanent(
      record.lines.map((line) => {
        const content = preserveStyle ? line : stripAnsi(line);
        const reset = preserveStyle && content.includes('\x1b[') ? '\x1b[0m' : '';
        return `${gutter} ${source}${content}${reset}`;
      })
    );
  }

  private closeScriptBlock(activity: OperationActivity) {
    this.scriptBlocks.delete(activity.id);
    const label = displayLabel(activity) ?? 'script';
    const fallbackStatus =
      activity.status === 'success' ? 'finished' : activity.status === 'error' ? 'failed' : activity.status;
    const finalMessage = activity.finalMessage?.trim();
    const labelIndex = finalMessage?.toLowerCase().indexOf(label.toLowerCase()) ?? -1;
    const status =
      finalMessage && labelIndex >= 0
        ? finalMessage.slice(labelIndex + label.length).trim() || fallbackStatus
        : (finalMessage ?? fallbackStatus);
    const duration = activity.duration === undefined ? '' : colorize('gray', ` · ${formatDuration(activity.duration)}`);
    this.writePermanent([
      `  ${colorize('gray', '└')} ${symbolForStatus(activity.status)} ${bold(label)} ${status}${duration}`,
      ''
    ]);
  }

  private writeCloudFormationMilestone(record: Extract<OperationRecord, { type: 'activity-updated' }>) {
    if (!isCloudFormationDetail(record.detail) || !record.detail.recentlyCompleted?.length) return;
    const detail = record.detail;
    const previous = this.cfMilestones.get(record.activityId);
    const total = detail.totalPlanned;
    const threshold = total ? Math.max(1, Math.ceil(total / 10)) : 5;
    const shouldPrint =
      !previous ||
      (total !== undefined && total <= 20) ||
      (total !== undefined && detail.completedCount >= total) ||
      detail.completedCount - previous.completedCount >= threshold ||
      record.timestamp - previous.timestamp >= 30_000;
    if (!shouldPrint) return;
    this.cfMilestones.set(record.activityId, { completedCount: detail.completedCount, timestamp: record.timestamp });
    const resources = detail.recentlyCompleted.map((resource) => resource.name);
    const resourceSummary = `${resources.slice(0, 2).join(', ')}${resources.length > 2 ? ` +${resources.length - 2}` : ''}`;
    const progress = total ? `${detail.completedCount}/${total}` : String(detail.completedCount);
    const resourceNoun = detail.completedCount === 1 ? 'resource' : 'resources';
    this.writePermanent([
      `  ${colorize('gray', glyphs.pending)} ${colorize('cyan', progress)} ${resourceNoun} complete${resourceSummary ? ` — ${resourceSummary}` : ''}`
    ]);
  }

  private finishedActivityLine(activity: OperationActivity): string {
    if (isCloudFormationDetail(activity.detail)) return this.finishedCloudFormationLine(activity, activity.detail);
    const indent = activity.parentActivityId ? '  ' : '';
    const label = displayLabel(activity);
    const duration = activity.duration === undefined ? '' : colorize('gray', ` · ${formatDuration(activity.duration)}`);
    if (label) {
      const result = activity.finalMessage ?? activity.description;
      return `${indent}${symbolForStatus(activity.status)} ${bold(label)} — ${result}${duration}`;
    }
    const outcome =
      activity.finalMessage && activity.finalMessage !== activity.description ? ` — ${activity.finalMessage}` : '';
    return `${indent}${symbolForStatus(activity.status)} ${activity.description}${outcome}${duration}`;
  }

  private finishedCloudFormationLine(activity: OperationActivity, detail: CloudFormationProgressDetail): string {
    const counts = [
      detail.changeCounts.created > 0 ? pastTense('CREATE', detail.changeCounts.created) : undefined,
      detail.changeCounts.updated > 0 ? pastTense('UPDATE', detail.changeCounts.updated) : undefined,
      detail.changeCounts.deleted > 0 ? pastTense('DELETE', detail.changeCounts.deleted) : undefined
    ].filter(Boolean);
    const progress = detail.totalPlanned ? `${detail.completedCount}/${detail.totalPlanned} resources` : undefined;
    const result = [progress, ...counts].filter(Boolean).join(' · ') || activity.finalMessage || activity.description;
    const duration = activity.duration === undefined ? '' : colorize('gray', ` · ${formatDuration(activity.duration)}`);
    return `${symbolForStatus(activity.status)} ${bold(`CloudFormation ${detail.stackAction}`)} — ${result}${duration}`;
  }

  private activeLines(): string[] {
    const columns = Math.max(20, process.stdout.columns || 80);
    const width = columns - 1;
    const state = operationSession.store.getSnapshot();
    const active = state.activityOrder
      .map((id) => state.activities[id])
      .filter((activity) => activity.status === 'running');
    if (active.length === 0 || state.isFinalizing) return [];

    const maxWorkRows = 7;
    const rows: string[] = [];
    let shownActivities = 0;
    for (let index = active.length - 1; index >= 0; index--) {
      const block = this.activeActivityLines(active[index], width);
      if (rows.length > 0 && rows.length + block.length > maxWorkRows) break;
      rows.unshift(...block);
      shownActivities++;
      if (rows.length >= maxWorkRows) break;
    }
    const overflow = active.length - shownActivities;
    if (overflow > 0 && rows.length < maxWorkRows) rows.push(colorize('gray', `  +${overflow} more active`));
    rows.push(colorize('gray', truncatePlain('  ctrl+t dashboard  ·  ctrl+c cancel', width)));
    return rows;
  }

  private activeActivityLines(activity: OperationActivity, width: number): string[] {
    if (isCloudFormationDetail(activity.detail))
      return this.activeCloudFormationLines(activity, activity.detail, width);
    const label = displayLabel(activity);
    const step = activity.additionalMessage ?? activity.description;
    const text = label ? `${label} — ${step}` : step;
    const elapsed = formatDuration(Math.max(0, Date.now() - activity.startTime));
    const available = Math.max(1, width - 2);
    return [
      `${colorize('cyan', glyphs.spinnerFrames[this.animationFrame])} ${bold(truncatePlain(`${text} · ${elapsed}`, available))}`
    ];
  }

  private activeCloudFormationLines(
    activity: OperationActivity,
    detail: CloudFormationProgressDetail,
    width: number
  ): string[] {
    const progress = detail.totalPlanned
      ? `${detail.completedCount}/${detail.totalPlanned}`
      : String(detail.completedCount);
    const elapsed = formatDuration(Math.max(0, Date.now() - activity.startTime));
    const title = `${detail.status === 'cleanup' ? 'CloudFormation cleanup' : `CloudFormation ${detail.stackAction}`} · ${progress} · ${elapsed}`;
    const counts = [
      detail.changeCounts.created > 0 ? `${detail.changeCounts.created} create` : undefined,
      detail.changeCounts.updated > 0 ? `${detail.changeCounts.updated} update` : undefined,
      detail.changeCounts.deleted > 0 ? `${detail.changeCounts.deleted} delete` : undefined
    ]
      .filter(Boolean)
      .join(' · ');
    const lines = [
      `${colorize('cyan', glyphs.spinnerFrames[this.animationFrame])} ${bold(truncatePlain(title, width - 2))}`
    ];
    if (counts) lines.push(`  ${colorize('gray', truncatePlain(counts, width - 2))}`);
    for (const resource of (detail.inProgressDetails ?? []).slice(0, 3)) {
      const resourceLine = `${resource.action} ${resource.name}${resource.resourceType ? ` · ${resource.resourceType}` : ''}`;
      lines.push(`  ${truncatePlain(resourceLine, width - 2)}`);
    }
    const remaining = (detail.inProgressDetails?.length ?? 0) - 3;
    if (remaining > 0) {
      lines.push(`  ${colorize('gray', truncatePlain(`+${remaining} more resources changing`, width - 2))}`);
    }
    return lines;
  }

  private scheduleRedraw() {
    if (!this.started || this.suspended || this.redrawTimer) return;
    this.redrawTimer = setTimeout(() => {
      this.redrawTimer = undefined;
      this.redraw();
    }, 32);
  }

  private redraw() {
    if (!this.started || this.suspended) return;
    this.clearTransient(false);
    const lines = this.activeLines();
    if (lines.length === 0) {
      this.stopAnimationClock();
      this.showCursor();
      return;
    }
    this.startAnimationClock();
    this.hideCursor();
    this.writeRaw(`${lines.join('\n')}\n`);
    this.transientRows = lines.length;
  }

  private writePermanent(lines: string[]) {
    if (lines.length === 0 || this.suspended) return;
    const normalized = [...lines];
    while (normalized[0] === '' && (!this.hasPermanentOutput || this.permanentEndsWithBlank)) normalized.shift();
    if (normalized.length === 0) return;
    this.clearTransient(false);
    this.writeRaw(`${normalized.join('\n')}\n`);
    this.hasPermanentOutput = true;
    this.permanentEndsWithBlank = normalized.at(-1) === '';
    if (this.started) this.redraw();
  }

  private clearTransient(showCursor: boolean) {
    if (this.transientRows > 0) {
      let sequence = '';
      for (let row = 0; row < this.transientRows; row++) sequence += '\x1b[1A\r\x1b[2K';
      this.writeRaw(sequence);
      this.transientRows = 0;
    }
    if (showCursor) this.showCursor();
  }

  private startAnimationClock() {
    if (this.animationClock) return;
    this.animationClock = setInterval(() => {
      if (!this.started || this.suspended) return;
      this.animationFrame = (this.animationFrame + 1) % glyphs.spinnerFrames.length;
      this.redraw();
    }, 80);
    this.animationClock.unref?.();
  }

  private stopAnimationClock() {
    if (!this.animationClock) return;
    clearInterval(this.animationClock);
    this.animationClock = undefined;
  }

  private clearRedrawTimer() {
    if (!this.redrawTimer) return;
    clearTimeout(this.redrawTimer);
    this.redrawTimer = undefined;
  }

  private hideCursor() {
    if (this.cursorHidden) return;
    this.writeRaw('\x1b[?25l');
    this.cursorHidden = true;
  }

  private showCursor() {
    if (!this.cursorHidden) return;
    this.writeRaw('\x1b[?25h');
    this.cursorHidden = false;
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

  private attachResize() {
    if (this.resizeListener) return;
    this.resizeListener = () => this.redraw();
    process.stdout.on('resize', this.resizeListener);
  }

  private detachResize() {
    if (!this.resizeListener) return;
    process.stdout.off('resize', this.resizeListener);
    this.resizeListener = undefined;
  }

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
