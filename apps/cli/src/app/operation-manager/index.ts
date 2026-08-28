import { OperationJournal } from './journal';
import { OperationReporter } from './reporter';
import { OperationProgressReporter } from './progress-reporter';
import { OperationStore } from './store';
import type {
  DeploymentPhase,
  OperationCancellation,
  OperationHeader,
  OperationLink,
  OperationMessageType,
  OperationPhasePreset,
  OperationSummary
} from './types';

class OperationSession {
  readonly journal = new OperationJournal();
  readonly store = new OperationStore(this.journal);
  readonly reporter = new OperationReporter(this.journal, this.store);

  reset(options: { preset?: OperationPhasePreset; showPhaseHeaders?: boolean } = {}) {
    const header = this.store.getSnapshot().header;
    this.journal.reset();
    this.reporter.reset();
    this.journal.append({
      type: 'session-configured',
      preset: options.preset ?? 'deploy',
      showPhaseHeaders: options.showPhaseHeaders ?? true
    });
    if (header) this.setHeader(header);
  }

  setHeader(header: OperationHeader) {
    this.journal.append({ type: 'header-set', header });
  }

  setPhase(phase: DeploymentPhase) {
    this.journal.append({ type: 'phase-entered', phase });
  }

  finishPhase(phase?: DeploymentPhase) {
    this.journal.append({ type: 'phase-finished', phase });
  }

  message(level: OperationMessageType, message: string, source = 'cli') {
    this.journal.append({ type: 'message', level, message, source });
  }

  setPendingCompletion(params: { success: boolean; message: string; links: OperationLink[]; consoleUrl?: string }) {
    this.journal.append({ type: 'completion-pending', summary: params });
  }

  commitPendingCompletion(options?: { hookFailureCount?: number }) {
    const pending = this.store.getSnapshot().pendingCompletion;
    if (!pending) return;
    let summary: OperationSummary = pending;
    if (options?.hookFailureCount) {
      const count = options.hookFailureCount;
      summary = {
        ...pending,
        success: false,
        message: `DEPLOYED WITH ERRORS — ${count} after:deploy hook${count > 1 ? 's' : ''} failed`
      };
    }
    this.journal.append({ type: 'session-completed', summary });
  }

  complete(summary: OperationSummary) {
    this.journal.append({ type: 'session-completed', summary });
  }

  setFinalizing() {
    this.journal.append({ type: 'finalizing' });
  }

  setCancellation(cancellation?: OperationCancellation) {
    this.journal.append({ type: 'cancellation-set', cancellation });
  }

  markRunningAsErrored() {
    this.journal.append({ type: 'running-marked-error' });
  }
}

export const operationSession = new OperationSession();
export const operationReporter = new OperationProgressReporter(operationSession);
export type * from './types';
export { createInitialOperationState, getPhaseOrder, reduceOperationState, replayOperationRecords } from './reducer';
export { OperationJournal } from './journal';
export { OperationReporter } from './reporter';
export { OperationProgressReporter } from './progress-reporter';
export { OperationStore } from './store';
