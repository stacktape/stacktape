import type { DeploymentPhase } from '@application-services/event-manager/types';
import type { ErrorDisplayData } from '../format/errors';
import { ScrollbackQueue } from '../runtime/scrollback';
import type { TuiDeploymentHeader, TuiMessageType } from '../types';
import type { TuiEvent, TuiPhase, TuiSummary } from './types';

export type ScrollbackItem =
  | { kind: 'header'; header: TuiDeploymentHeader }
  | { kind: 'phase-header'; name: string }
  | { kind: 'event'; event: TuiEvent }
  | { kind: 'output-line'; source?: string; line: string }
  | { kind: 'message'; type: TuiMessageType; text: string }
  | { kind: 'prompt-answer'; message: string; answer: string }
  | { kind: 'error'; error: ErrorDisplayData; header?: TuiDeploymentHeader }
  | {
      kind: 'summary';
      summary: TuiSummary;
      phases: TuiPhase[];
      totalDurationMs: number;
      header?: TuiDeploymentHeader;
    };

class ProgressScrollbackFeed extends ScrollbackQueue<ScrollbackItem> {
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

export const scrollbackFeed = new ProgressScrollbackFeed();
