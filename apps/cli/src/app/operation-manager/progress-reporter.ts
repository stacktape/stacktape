import type { OperationReporter } from './reporter';
import type {
  DeploymentPhase,
  LegacyEventContext,
  LegacyProgressEvent,
  LoggableEventType,
  ProgressReporter
} from './types';

type ReporterFlags = { silent: boolean };
type OperationSessionPort = {
  reporter: OperationReporter;
  setPhase(phase: DeploymentPhase): void;
  finishPhase(phase?: DeploymentPhase): void;
};

/** Application-facing progress port used while call sites adopt activity handles. */
export class OperationProgressReporter implements ProgressReporter {
  constructor(
    private session: OperationSessionPort,
    private reporter: OperationReporter = session.reporter,
    private flags: ReporterFlags = { silent: false }
  ) {}

  get eventContext(): LegacyEventContext {
    return this.reporter.eventContext;
  }

  setSilentMode(silent: boolean) {
    this.flags.silent = silent;
  }

  setPhase(phase: DeploymentPhase) {
    if (!this.flags.silent) this.session.setPhase(phase);
  }

  finishPhase() {
    if (!this.flags.silent) this.session.finishPhase();
  }

  startEvent(params: LegacyProgressEvent & { description: string }) {
    if (this.flags.silent) return;
    this.reporter.startEvent({ ...params, detail: params.detail ?? params.data });
  }

  updateEvent(params: LegacyProgressEvent) {
    if (this.flags.silent) return;
    this.reporter.updateEvent({ ...params, detail: params.detail ?? params.data });
  }

  finishEvent(params: LegacyProgressEvent & { finalMessage?: string }) {
    if (this.flags.silent) return;
    this.reporter.finishEvent({ ...params, detail: params.detail ?? params.data });
  }

  appendEventOutput(params: {
    eventType: LoggableEventType;
    lines: string[];
    instanceId?: string;
    stream?: 'stdout' | 'stderr' | 'diagnostic';
  }) {
    if (this.flags.silent) return;
    this.reporter.appendOutput(params);
  }

  createChildLogger({
    instanceId,
    parentEventType
  }: {
    instanceId: string;
    parentEventType: LoggableEventType;
  }): OperationProgressReporter {
    return new OperationProgressReporter(
      this.session,
      this.reporter.createChild({
        instanceId,
        parentEventType,
        parentInstanceId: this.eventContext.instanceId
      }),
      this.flags
    );
  }
}
