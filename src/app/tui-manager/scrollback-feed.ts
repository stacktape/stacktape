import type { ErrorDisplayData } from './error-rendering';
import type { TuiDeploymentHeader, TuiEvent, TuiMessageType, TuiPhase, TuiSummary } from './types';

/**
 * Ordered feed of items destined for terminal scrollback while a split-footer
 * TUI is mounted. Finished work streams here exactly once and becomes the
 * permanent terminal record — there is no separate "exit summary" re-render.
 *
 * Items pushed before the renderer mounts are queued and drained when the
 * consumer attaches. Items still queued at exit (renderer never mounted or died
 * early) are handled by the plain-text fallback printer.
 */
export class ScrollbackQueue<TItem> {
  private queue: TItem[] = [];
  private consumer: ((item: TItem) => void) | null = null;
  private _enabled = false;

  constructor(private maxQueued = 2000) {}

  get enabled() {
    return this._enabled;
  }

  get hasConsumer() {
    return this.consumer !== null;
  }

  enable() {
    this._enabled = true;
  }

  reset() {
    this._enabled = false;
    this.queue = [];
    this.consumer = null;
  }

  push(item: TItem) {
    if (!this._enabled) return;
    if (this.consumer) {
      this.consumer(item);
      return;
    }
    this.queue.push(item);
    if (this.queue.length > this.maxQueued) {
      this.queue.shift();
    }
  }

  /** Attaches the renderer-side consumer and drains anything queued before mount. */
  setConsumer(consumer: (item: TItem) => void): () => void {
    this.consumer = consumer;
    const pending = this.queue;
    this.queue = [];
    for (const item of pending) {
      consumer(item);
    }
    return () => {
      if (this.consumer === consumer) this.consumer = null;
    };
  }

  /** Items that never reached a consumer. Draining clears the queue. */
  drainPending(): TItem[] {
    const pending = this.queue;
    this.queue = [];
    return pending;
  }
}

export type ScrollbackItem =
  | { kind: 'header'; header: TuiDeploymentHeader }
  | { kind: 'phase-header'; name: string }
  | { kind: 'event'; event: TuiEvent }
  | { kind: 'output-line'; source?: string; line: string }
  | { kind: 'message'; type: TuiMessageType; text: string }
  | { kind: 'prompt-answer'; message: string; answer: string }
  | { kind: 'error'; error: ErrorDisplayData }
  | { kind: 'summary'; summary: TuiSummary; phases: TuiPhase[]; totalDurationMs: number };

class DeployScrollbackFeed extends ScrollbackQueue<ScrollbackItem> {
  private lastPhaseHeader: DeploymentPhase | null = null;

  reset() {
    super.reset();
    this.lastPhaseHeader = null;
  }

  /** Emits a phase section header once per phase, before its first event. */
  pushPhaseHeaderIfNeeded(phase: DeploymentPhase, name: string) {
    if (!this.enabled || this.lastPhaseHeader === phase) return;
    this.lastPhaseHeader = phase;
    this.push({ kind: 'phase-header', name });
  }
}

export const scrollbackFeed = new DeployScrollbackFeed();
