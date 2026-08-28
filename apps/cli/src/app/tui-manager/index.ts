import type { DeploymentPhase, LoggableEventType } from '@application-services/operation-manager';
import type { LogLevel } from 'src/config/cli/types';
import { CliError, type HandledError } from '@utils/errors';
import { operationSession, type OperationRecord, type TtyView } from '@application-services/operation-manager';
import { ARE_NOTIFICATIONS_DISABLED, IS_DEV, NOTIFICATION_MIN_DURATION_MS } from '@config';
import { tuiDebug } from './debug';
import { renderErrorToString, renderStackErrorsToString, type ErrorDisplayData } from './format/errors';
import {
  formatAsciiTable,
  formatCommandHeaderProgressMessage,
  renderCommandHeaderBox,
  renderTitledBox
} from './format/blocks';
import * as fmt from './format/text';
import {
  getOutputModeProfile,
  resolveOutputMode,
  shouldWriteTerminalControlSequences,
  type OutputMode
} from './output/mode';
import type { JsonlEventDetail } from './output/jsonl-types';
import type { OutputRecord } from './output/record';
import { OutputRouter } from './output/router';
import { ConsoleInterceptor, JsonlStdioGuard } from './output/stdio-guard';
import { renderExitSummaryLines } from './progress/exit-summary';
import { TuiStateSink } from './progress/sink';
import { tuiState } from './progress/state';
import type { PhasePreset, TuiCancelDeployment, TuiState } from './progress/types';
import { sessionElapsedMs } from './progress/types';
import { PromptSink } from './prompt/sink';
import { UserCancelledError } from './prompt/inline';
import { forceRestoreTerminal } from './runtime/lifecycle';
import { PresentationController } from './runtime/presentation-controller';
import { interactionCoordinator } from './interaction/coordinator';
import {
  createSpinner,
  createSpinnerProgressLogger,
  MultiSpinner,
  setSpinnerAgentMode,
  setSpinnerTuiMessageSink
} from './spinner';
import type { TuiDeploymentHeader, TuiEventStatus, TuiLink, TuiMessageType, TuiSelectOption } from './types';

export { UserCancelledError };
export type { ErrorDisplayData } from './format/errors';
export type { Spinner } from './spinner';
export { MultiSpinner } from './spinner';
export { tuiState } from './progress/state';

export type { TuiEvent, TuiPhase, TuiState, TuiSummary } from './progress/types';
export type { TuiDeploymentHeader, TuiLink, TuiSelectOption } from './types';

/**
 * The CLI presentation facade. Every part of the application talks to the
 * terminal through this singleton; it routes output to the right surface for
 * the resolved output mode:
 *
 *   tty   -> switchable primary-screen stream and alternate-screen dashboard
 *   plain -> line-oriented stdout (output/plain)
 *   jsonl -> machine-readable records on stdout (output/jsonl)
 *
 * All modes additionally stream structured records to the log collector file
 * through the OutputRouter. The facade owns no rendering logic itself — it
 * composes the output pipeline (output/), the renderer runtime (runtime/), the
 * progress model (progress/), prompts (prompt/) and formatting (format/).
 */
class TuiManager {
  private presentation = new PresentationController();
  private outputMode: OutputMode = resolveOutputMode({ forceTty: process.env.FORCE_TTY === '1' });
  private outputRouter: OutputRouter;
  private stateSink = new TuiStateSink();
  private promptSink = new PromptSink(
    (message) => this.log('info', message),
    (run) => this.presentation.withDashboardPrompt(run)
  );
  private consoleInterceptor = new ConsoleInterceptor();
  private jsonlStdioGuard = new JsonlStdioGuard();
  private teardownDone = false;
  private _pendingErrorData?: ErrorDisplayData;
  private explicitOutputMode?: OutputMode;
  private _isEnabled = false;
  private _wasEverStarted = false;
  private _devTuiActive = false;
  private logLevel: LogLevel = 'info';
  private ttyView: TtyView = 'auto';

  constructor() {
    this.outputRouter = new OutputRouter(this.outputMode);
    fmt.setTextStylingEnabled(this.isTTY);
    operationSession.journal.subscribe((record) => this.routeOperationRecord(record));
  }

  get isTTY(): boolean {
    return this.outputMode === 'tty';
  }

  get mode(): OutputMode {
    return this.outputMode;
  }

  get enabled(): boolean {
    return this._isEnabled;
  }

  get wasEverStarted(): boolean {
    return this._wasEverStarted;
  }

  get devTuiActive(): boolean {
    return this._devTuiActive;
  }

  setOutputFormat(mode: OutputMode) {
    this.explicitOutputMode = mode;
    this.applyOutputMode();
  }

  init(options: { logLevel?: LogLevel } = {}) {
    this.logLevel = options.logLevel || 'info';
    this.applyOutputMode();
    this.outputRouter.reset();
  }

  private applyOutputMode() {
    this.outputMode = resolveOutputMode({
      explicitMode: this.explicitOutputMode,
      forceTty: process.env.FORCE_TTY === '1'
    });
    this.outputRouter.reconfigure(this.outputMode);
    fmt.setTextStylingEnabled(this.isTTY);
    // Non-TTY output gets line-based spinners instead of \r animation.
    setSpinnerAgentMode(!this.isTTY);
    this.reconfigureConsoleForMode();
  }

  /**
   * Starts a progress session. `auto` uses stream output for log-heavy phases
   * and the dashboard for deployment; Ctrl+T switches and pins either view.
   */
  setTtyView(view: TtyView) {
    this.ttyView = view;
  }

  /** Temporarily releases raw input and alternate-screen ownership to an interactive child process. */
  withTerminalLease<T>(run: () => Promise<T>): Promise<T> {
    if (!this.isTTY || !this._isEnabled) return run();
    return this.presentation.withTerminalLease(run);
  }

  start(options: { phases?: PhasePreset; view?: TtyView } = {}) {
    this._isEnabled = true;
    this._wasEverStarted = true;
    this.teardownDone = false;
    interactionCoordinator.reset();
    operationSession.reset({
      preset: options.phases ?? 'deploy',
      showPhaseHeaders: options.phases !== undefined
    });
    this._pendingErrorData = undefined;
    const profile = getOutputModeProfile(this.outputMode);
    tuiDebug('TUI', 'start()', { mode: this.outputMode, useTtyUi: profile.useTtyUi });

    if (profile.useTtyUi) {
      setSpinnerTuiMessageSink((type, text) => operationSession.message(type, text));
      this.presentation.start({
        preferredView: options.view ?? this.ttyView,
        onQuit: () => {
          void this.stopInternal();
        },
        onCancel: () => {
          void this.stopInternal().then(() => process.emit('SIGINT', 'SIGINT'));
        },
        onRenderError: (error) => {
          interactionCoordinator.rejectAllPending();
          tuiDebug('TUI', 'renderer error', { message: error.message, stack: error.stack });
          try {
            process.stderr.write(`\n[TUI render error] ${error.message}\n`);
          } catch {}
        }
      });
    }
  }

  /**
   * Full teardown shared by every stop path: renderer destroy (bounded waits),
   * pending-prompt rejection, spinner sink release, output-capture restore and
   * progress-store shutdown. Idempotent per start().
   */
  private async teardown() {
    if (this.teardownDone) return;
    this.teardownDone = true;

    // Reject first: prompt ownership is serialized with view transitions, so
    // presentation.stop() must not wait on an answer the user can no longer give.
    this.promptSink.rejectPending();
    await this.presentation.stop();
    setSpinnerTuiMessageSink(null);
    this._isEnabled = false;
    this.jsonlStdioGuard.disable();
    this.consoleInterceptor.stop();

    tuiState.flushPendingNotifications();
    tuiState.destroy();
    tuiDebug('TUI', 'teardown() complete');
  }

  async stop() {
    tuiDebug('TUI', 'stop() called', { isEnabled: this._isEnabled });
    tuiState.setFinalizing();
    // Give the dashboard one final paint before its alternate screen closes.
    const holdMs = this.presentation.isDashboardActive ? 220 : 25;
    await new Promise((resolve) => setTimeout(resolve, holdMs));
    await this.stopInternal();
  }

  private async stopInternal() {
    tuiDebug('TUI', 'stopInternal()');
    const state = tuiState.getSnapshot();
    this.maybeNotifyCompletion(state);
    await this.teardown();
    this.printFallbackSummary(state);
  }

  stopSync() {
    tuiDebug('TUI', 'stopSync() called', { isEnabled: this._isEnabled });
    tuiState.setFinalizing();
    this._isEnabled = false;
    const state = tuiState.getSnapshot();
    this.maybeNotifyCompletion(state);
    this.promptSink.rejectPending();
    this.presentation.stopSync();
    this.printFallbackSummary(state);
  }

  forceRestoreTerminal() {
    if (shouldWriteTerminalControlSequences({ outputMode: this.outputMode, stdoutIsTty: process.stdout.isTTY })) {
      forceRestoreTerminal();
    }
  }

  /** Updates the terminal tab title from the current header (TTY only). */
  private updateTerminalTitle() {
    const header = tuiState.getState().header;
    const renderer = this.presentation.renderer;
    if (!header || !renderer) return;
    try {
      renderer.setTerminalTitle(
        `stacktape ${header.action.toLowerCase()}: ${header.projectName} → ${header.stageName}`
      );
    } catch {}
  }

  /**
   * Fires a terminal-mediated desktop notification when a long-running command
   * finishes while the terminal window is unfocused. Must run before teardown
   * (needs the live renderer). Silently no-ops when disabled, focused, too
   * quick, or unsupported by the terminal.
   */
  private maybeNotifyCompletion(state: TuiState) {
    const renderer = this.presentation.renderer;
    if (ARE_NOTIFICATIONS_DISABLED || this.presentation.windowFocused || !renderer) return;
    const elapsedMs = sessionElapsedMs(state, Date.now());
    if (elapsedMs < NOTIFICATION_MIN_DURATION_MS) return;

    const success = state.summary ? state.summary.success : !state.phases.some((p) => p.status === 'error');
    const header = state.header;
    const target = header ? ` ${header.projectName} → ${header.stageName}` : '';
    const action = header?.action ? header.action.toLowerCase() : 'command';
    const title = success ? 'Stacktape — finished' : 'Stacktape — failed';
    const body = `${action}${target} (${fmt.formatDuration(elapsedMs)})`;
    try {
      renderer.triggerNotification(body, title);
    } catch {}
  }

  /** Plain-text exit summary for non-interactive output and pre-renderer failures. */
  private printFallbackSummary(state: TuiState) {
    if (this.outputMode === 'jsonl') return;
    if (this.outputMode === 'plain') {
      this.printExitSummary(state);
      return;
    }
    if (!this._wasEverStarted) this.printExitSummary(state);
  }

  private printExitSummary(state: TuiState) {
    if (this.outputMode === 'jsonl') return;
    tuiDebug('TUI', 'printExitSummary()');
    // Write directly to stdout to bypass any console interception still active.
    for (const line of renderExitSummaryLines(state)) {
      try {
        process.stdout.write(`${line}\n`);
      } catch {}
    }
  }

  private reconfigureConsoleForMode() {
    const interceptDisabled = process.env.STP_DISABLE_CONSOLE_INTERCEPT === 'true';
    const profile = getOutputModeProfile(this.outputMode);
    if (profile.useJsonlStdout) {
      this.jsonlStdioGuard.enable({
        onViolation: ({ level, source, message }) => {
          this.emitOutputRecord({ type: 'log', level, source, message });
        }
      });
    } else {
      this.jsonlStdioGuard.disable();
    }
    process.env.STP_REDIRECT_STDIO_TO_CONSOLE = profile.interceptConsole && !interceptDisabled ? 'true' : 'false';
    if (profile.interceptConsole && !interceptDisabled) {
      this.consoleInterceptor.start({
        passthrough: this.outputMode === 'plain',
        onMessage: ({ level, source, message }) => {
          this.outputRouter.emit({ type: 'log', level, source, message });
        }
      });
      return;
    }
    this.consoleInterceptor.stop();
  }

  setDevTuiActive(active: boolean) {
    this._devTuiActive = active;
  }

  intro(title: string) {
    if (!this.isTTY) {
      console.info(`\n[i] ${title}\n`);
      return;
    }
    process.stdout.write(`${title}\n\n`);
  }

  outro(message?: string) {
    if (!this.isTTY) {
      if (message) console.info(`\n✓ ${message}\n`);
      return;
    }
    const checkmark = this.colorize('green', '√');
    const outroMessage = message ? `${checkmark} ${message}` : '';
    process.stdout.write(`${outroMessage}\n\n`);
  }

  createSpinner({ text }: { text: string }) {
    return createSpinner(text, this.colorize.bind(this));
  }

  createMultiSpinner() {
    return new MultiSpinner(this.colorize.bind(this));
  }

  createSpinnerProgressLogger(
    spinner: ReturnType<typeof createSpinner>,
    instanceId: string,
    parentEventType: LoggableEventType = 'PACKAGE_ARTIFACTS'
  ) {
    return createSpinnerProgressLogger(spinner, instanceId, parentEventType);
  }

  info(message: string) {
    this.log('info', message);
  }

  success(message: string) {
    this.log('success', message);
  }

  warn(message: string) {
    this.log('warn', message);
  }

  debug(message: string) {
    if (this.logLevel !== 'debug') return;
    this.log('debug', message);
  }

  hint(message: string) {
    this.log('hint', message);
  }

  announcement(message: string, highlight?: boolean) {
    const formattedMessage = highlight ? `★  ${this.makeBold(message)}` : message;
    this.log('announcement', formattedMessage);
  }

  private emitOutputRecord(record: OutputRecord) {
    this.outputRouter.emit(record);
  }

  private routeOperationRecord(record: OperationRecord) {
    const state = operationSession.store.getSnapshot();
    if (record.type === 'message') {
      this.emitOutputRecord({
        type: 'log',
        level: record.level === 'warn' || record.level === 'error' ? record.level : 'info',
        source: record.source,
        message: record.message
      });
      return;
    }
    if (record.type === 'header-set') {
      this.emitOutputRecord({
        type: 'progress',
        phase: state.currentPhase ?? 'INITIALIZE',
        message: formatCommandHeaderProgressMessage(record.header)
      });
      return;
    }
    if (record.type === 'phase-entered') {
      this.emitOutputRecord({ type: 'progress', phase: record.phase, message: `Entering phase ${record.phase}` });
      return;
    }
    if (record.type === 'activity-output') {
      const activity = state.activities[record.activityId];
      if (!activity) return;
      this.emitOutputRecord({
        type: 'output',
        ...(record.stream === 'diagnostic' ? {} : { stream: record.stream }),
        eventType: activity.eventType,
        instanceId: activity.instanceId,
        parentEventType: activity.parentEventType,
        parentInstanceId: activity.parentInstanceId,
        lines: record.lines
      });
      return;
    }
    if (record.type === 'activity-started') {
      const activity = record.activity;
      this.emitOutputRecord({
        type: 'event',
        phase: activity.phase,
        eventType: activity.eventType,
        status: 'started',
        message: activity.description,
        instanceId: activity.instanceId,
        parentEventType: activity.parentEventType,
        parentInstanceId: activity.parentInstanceId
      });
      return;
    }
    if (record.type === 'activity-updated') {
      const activity = state.activities[record.activityId];
      if (!activity || (!record.additionalMessage && record.detail === undefined)) return;
      this.emitOutputRecord({
        type: 'event',
        phase: activity.phase,
        eventType: activity.eventType,
        status: 'running',
        message: record.additionalMessage ?? activity.description,
        instanceId: activity.instanceId,
        parentEventType: activity.parentEventType,
        parentInstanceId: activity.parentInstanceId,
        detail: record.detail as JsonlEventDetail | undefined
      });
      return;
    }
    if (record.type === 'activity-finished') {
      const activity = state.activities[record.activityId];
      if (!activity) return;
      this.emitOutputRecord({
        type: 'event',
        phase: activity.phase,
        eventType: activity.eventType,
        status: 'completed',
        message: activity.finalMessage ?? activity.description,
        instanceId: activity.instanceId,
        parentEventType: activity.parentEventType,
        parentInstanceId: activity.parentInstanceId,
        detail: record.detail as JsonlEventDetail | undefined
      });
    }
  }

  emitCollectorLog({
    level,
    source,
    message,
    data
  }: {
    level: 'info' | 'warn' | 'error';
    source: string;
    message: string;
    data?: Record<string, unknown>;
  }) {
    this.outputRouter.emitCollectorLog({ level, source, message, data });
  }

  private log(type: TuiMessageType, message: string) {
    operationSession.message(type, message);

    if (this.outputMode === 'plain' || this.outputMode === 'jsonl') return;

    if (this._isEnabled && this.isTTY) return;

    if (!this._devTuiActive || !this._isEnabled) {
      this.printToConsole(type, message);
    }
  }

  private printToConsole(type: TuiMessageType, message: string) {
    if (this.isTTY) {
      const symbols: Record<TuiMessageType, string> = {
        info: this.colorize('cyan', 'i'),
        success: this.colorize('green', '✓'),
        error: this.colorize('red', '✗'),
        warn: this.colorize('yellow', '!'),
        debug: this.colorize('gray', '·'),
        hint: this.colorize('blue', 'i'),
        start: this.colorize('cyan', '›'),
        announcement: this.colorize('cyan', '›')
      };
      const rendered = type === 'debug' ? this.colorize('gray', message) : message;
      const line = `${symbols[type] || this.colorize('cyan', 'i')} ${rendered}`;
      console.info(`${line}\n`);
      return;
    }

    const symbols: Record<TuiMessageType, string> = {
      info: '[i]',
      success: '[+]',
      error: '[x]',
      warn: '[!]',
      debug: '[.]',
      hint: '[?]',
      start: '[>]',
      announcement: '[*]'
    };
    console.info(`${symbols[type] || '[*]'} ${message}\n`);
  }

  /** Switches the phase preset mid-session (codebuild/ec2 deploy runners). */
  setPhasePreset(preset: PhasePreset) {
    tuiState.setPhasePreset(preset);
  }

  private setHeader(header: TuiDeploymentHeader) {
    const wasUpdated = this.stateSink.setHeader(header);
    if (!wasUpdated) return;

    this.updateTerminalTitle();
  }

  showCommandHeader(header: TuiDeploymentHeader, options: { renderStandalone?: boolean } = {}) {
    this.setHeader(header);
    if (!options.renderStandalone) return;
    if (this._isEnabled || !this.isTTY || this.outputMode !== 'tty') return;

    console.info(renderCommandHeaderBox(header).join('\n'));
  }

  setPhase(phase: DeploymentPhase) {
    this.stateSink.setPhase(phase);
  }

  finishPhase() {
    this.stateSink.finishPhase();
  }

  startEvent(params: {
    eventType: LoggableEventType;
    description: string;
    phase?: DeploymentPhase;
    parentEventType?: LoggableEventType;
    parentInstanceId?: string;
    instanceId?: string;
  }) {
    this.stateSink.startEvent(params);
  }

  updateEvent(params: {
    eventType: LoggableEventType;
    additionalMessage?: string;
    detail?: JsonlEventDetail;
    description?: string;
    parentEventType?: LoggableEventType;
    parentInstanceId?: string;
    instanceId?: string;
  }) {
    this.stateSink.updateEvent(params);
  }

  finishEvent(params: {
    eventType: LoggableEventType;
    finalMessage?: string;
    detail?: JsonlEventDetail;
    parentEventType?: LoggableEventType;
    parentInstanceId?: string;
    instanceId?: string;
    status?: TuiEventStatus;
  }) {
    this.stateSink.finishEvent(params);
  }

  appendEventOutput(params: {
    eventType: LoggableEventType;
    lines: string[];
    instanceId?: string;
    parentEventType?: LoggableEventType;
    parentInstanceId?: string;
  }) {
    this.stateSink.appendEventOutput(params);
  }

  setPendingCompletion(params: { success: boolean; message: string; links: TuiLink[]; consoleUrl?: string }) {
    tuiState.setPendingCompletion(params);
  }

  commitPendingCompletion(options?: { hookFailureCount?: number }) {
    tuiState.commitPendingCompletion(options);
  }

  setCancelDeployment(cancelDeployment: TuiCancelDeployment) {
    tuiState.setCancelDeployment(cancelDeployment);
  }

  updateCancelDeployment(updates: Partial<TuiCancelDeployment>) {
    tuiState.updateCancelDeployment(updates);
  }

  clearCancelDeployment() {
    tuiState.clearCancelDeployment();
  }

  async promptSelect(config: { message: string; options: TuiSelectOption[]; defaultValue?: string }): Promise<string> {
    return this.promptSink.select({ config, isEnabled: this._isEnabled, isTTY: this.isTTY });
  }

  async promptMultiSelect(config: {
    message: string;
    options: TuiSelectOption[];
    defaultValues?: string[];
  }): Promise<string[]> {
    return this.promptSink.multiSelect({ config, isEnabled: this._isEnabled, isTTY: this.isTTY });
  }

  async promptConfirm(config: { message: string; defaultValue?: boolean }): Promise<boolean> {
    return this.promptSink.confirm({ config, isEnabled: this._isEnabled, isTTY: this.isTTY });
  }

  async promptText(config: {
    message: string;
    placeholder?: string;
    isPassword?: boolean;
    description?: string;
    defaultValue?: string;
  }): Promise<string> {
    return this.promptSink.text({ config, isEnabled: this._isEnabled, isTTY: this.isTTY });
  }

  colorize(color: string, text: string): string {
    return fmt.colorize(color, text);
  }

  makeBold(text: string | number): string {
    return fmt.bold(text);
  }

  terminalLink(url: string, placeholder: string): string {
    return fmt.styledLink(url, placeholder);
  }

  getTime(durationInMs: number): string {
    return fmt.prettyDuration(durationInMs);
  }

  getLink(link: Parameters<typeof fmt.namedLink>[0], placeholder: string): string {
    return fmt.namedLink(link, placeholder);
  }

  prettyCommand(command: string): string {
    return fmt.prettyCommand(command);
  }

  prettyOption(option: string): string {
    return fmt.prettyOption(option);
  }

  prettyResourceName(resourceName: string): string {
    return fmt.prettyResourceName(resourceName);
  }

  prettyStackName(stackName: string): string {
    return fmt.prettyStackName(stackName);
  }

  prettyConfigProperty(property: string): string {
    return fmt.prettyConfigProperty(property);
  }

  prettyResourceType(type: string): string {
    return fmt.prettyResourceType(type);
  }

  prettyFilePath(filePath: string): string {
    return fmt.prettyFilePath(filePath);
  }

  formatComplexStackErrors(
    processedErrors: { errorMessage: string; hints?: string[] }[],
    whitespacePadding = 0
  ): string {
    const rendered = renderStackErrorsToString(processedErrors, this.colorize.bind(this));
    if (whitespacePadding > 0) {
      const padding = ' '.repeat(whitespacePadding);
      return rendered
        .split('\n')
        .map((line) => padding + line)
        .join('\n');
    }
    return rendered;
  }

  error(message: string): void;
  error(error: HandledError): void;
  error(input: string | HandledError) {
    if (typeof input === 'string') {
      this.log('error', input);
      return;
    }

    this.displayError(this.toErrorDisplayData(input));
  }

  private toErrorDisplayData(error: HandledError): ErrorDisplayData {
    const { prettyStackTrace, errorType, errorTrackingId } = error.details;
    const isExpected = error instanceof CliError;

    const errorMessage =
      !IS_DEV && !isExpected
        ? `An unexpected error occurred. Last captured event: ${operationSession.reporter.lastActivity?.eventType || '-'}.`
        : error.message;

    const hints: string[] = isExpected ? [...error.hints] : [];
    if (errorTrackingId) {
      hints.push(
        `This error has been anonymously reported to our error monitoring service with id ${errorTrackingId}.`
      );
    }
    hints.push(`To get help, reach out to our team at support@stacktape.com`);

    return {
      errorType,
      message: errorMessage,
      hints: this.logLevel !== 'error' ? hints : undefined,
      stackTrace: prettyStackTrace || undefined,
      userStackTrace: isExpected ? error.userStackTrace : undefined,
      errorDetails: isExpected ? error.errorDetails : undefined,
      errorTrackingId: errorTrackingId || undefined,
      isExpected
    };
  }

  /** Captures a fatal error and marks in-flight work failed before renderer teardown. */
  setFatalError(error: HandledError) {
    this._pendingErrorData = this.toErrorDisplayData(error);
    operationSession.markRunningAsErrored();
  }

  async displayError(errorData: ErrorDisplayData) {
    tuiDebug('TUI', 'displayError()', { errorType: errorData.errorType, message: errorData.message?.slice(0, 200) });
    this.stateSink.markAllRunningAsErrored();
    await this.teardown();

    // Write error to JSONL log collector (file) and, in jsonl mode, to stdout.
    if (this.outputMode === 'jsonl') {
      this.emitOutputRecord({
        type: 'log',
        level: 'error',
        source: 'cli',
        message: `[${errorData.errorType}] ${errorData.message}`,
        ...(errorData.hints ? { data: { hints: errorData.hints } } : {})
      });
      return;
    }

    this.outputRouter.emitCollectorLog({
      level: 'error',
      source: 'cli',
      message: `[${errorData.errorType}] ${errorData.message}`,
      ...(errorData.hints ? { data: { hints: errorData.hints } } : {})
    });

    const effectiveError = this._pendingErrorData ?? errorData;
    this._pendingErrorData = undefined;
    const errorString = renderErrorToString(effectiveError, this.colorize.bind(this), this.makeBold.bind(this));
    try {
      process.stderr.write(`${errorString}\n`);
    } catch {}
  }

  emitJsonlResult({
    ok,
    code,
    message,
    data
  }: {
    ok: boolean;
    code: string;
    message: string;
    data?: Record<string, any>;
  }) {
    this.emitOutputRecord({ type: 'result', ok, code, message, data });
  }

  private writeInfoLine(line: string) {
    if (this.outputMode === 'jsonl') {
      this.emitOutputRecord({ type: 'log', level: 'info', source: 'cli', message: line });
      return;
    }
    console.info(line);
  }

  private writeInfoLines(lines: string[]) {
    if (this.outputMode === 'jsonl') {
      this.emitOutputRecord({ type: 'log', level: 'info', source: 'cli', message: lines.join('\n') });
      return;
    }
    console.info(lines.join('\n'));
  }

  printLines(lines: string[]) {
    this.writeInfoLines(lines);
  }

  printTable({ header, rows }: { header: string[]; rows: string[][] }) {
    this.writeInfoLines(formatAsciiTable(header, rows));
  }

  printBox({ title, lines }: { title: string; lines: string[] }) {
    this.writeInfoLines([...renderTitledBox({ title, lines }), '']);
  }
}

export const tuiManager = new TuiManager();
export { TuiManager };
