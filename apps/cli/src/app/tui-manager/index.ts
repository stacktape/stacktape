import type { DeploymentPhase, LoggableEventType } from '@application-services/event-manager/types';
import type { CliRenderer } from '@opentui/core';
import type { LogLevel } from 'src/config/cli/types';
import { CliError, type HandledError } from '@utils/errors';
import { eventManager } from '@application-services/event-manager';
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
import { getOutputModeProfile, resolveOutputMode, type OutputMode } from './output/mode';
import type { JsonlEventDetail } from './output/jsonl-types';
import type { OutputRecord } from './output/record';
import { OutputRouter } from './output/router';
import { ConsoleInterceptor, JsonlStdioGuard } from './output/stdio-guard';
import { scrollbackFeed } from './progress/feed';
import { renderExitSummaryLines } from './progress/exit-summary';
import { TuiStateSink } from './progress/sink';
import { tuiState } from './progress/state';
import type { PhasePreset, TuiCancelDeployment, TuiState } from './progress/types';
import { PHASE_FOOTER_HEIGHT, SIMPLE_FOOTER_HEIGHT } from './progress/types';
import { PromptSink } from './prompt/sink';
import { UserCancelledError } from './prompt/inline';
import { forceRestoreTerminal, TtyRuntime } from './runtime/lifecycle';
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
 *   tty   -> OpenTUI split-footer app (progress/) + terminal scrollback
 *   plain -> line-oriented stdout (output/plain)
 *   jsonl -> machine-readable records on stdout (output/jsonl)
 *
 * All modes additionally stream structured records to the log collector file
 * through the OutputRouter. The facade owns no rendering logic itself — it
 * composes the output pipeline (output/), the renderer runtime (runtime/), the
 * progress model (progress/), prompts (prompt/) and formatting (format/).
 */
class TuiManager {
  private runtime = new TtyRuntime();
  private outputMode: OutputMode = resolveOutputMode({ forceTty: process.env.FORCE_TTY === '1' });
  private outputRouter: OutputRouter;
  private stateSink = new TuiStateSink();
  private promptSink = new PromptSink((message) => this.log('info', message));
  private consoleInterceptor = new ConsoleInterceptor();
  private jsonlStdioGuard = new JsonlStdioGuard();
  private finalScrollbackEmitted = false;
  private teardownDone = false;
  private _pendingErrorData?: ErrorDisplayData;
  private _errorRenderedToScrollback = false;
  private explicitOutputMode?: OutputMode;
  private _isEnabled = false;
  private _wasEverStarted = false;
  private _devTuiActive = false;
  private logLevel: LogLevel = 'info';

  constructor() {
    this.outputRouter = new OutputRouter(this.outputMode);
    fmt.setTextStylingEnabled(this.isTTY);
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
   * Starts a progress session. With `phases` set, the phase bar and per-phase
   * scrollback headers are shown using that preset; without it the session
   * runs in simple mode (events stream without phase structure).
   */
  start(options: { phases?: PhasePreset } = {}) {
    this._isEnabled = true;
    this._wasEverStarted = true;
    this.teardownDone = false;
    // Commands may set their header before start() (demo, dev-stack deploy) —
    // the session reset must not wipe it.
    const preservedHeader = tuiState.getState().header;
    this.stateSink.reset();
    if (options.phases) {
      tuiState.setPhasePreset(options.phases);
    } else {
      tuiState.setShowPhaseHeaders(false);
    }
    if (preservedHeader) {
      tuiState.setHeader(preservedHeader);
    }
    scrollbackFeed.reset();
    this.finalScrollbackEmitted = false;
    this._pendingErrorData = undefined;
    this._errorRenderedToScrollback = false;
    const profile = getOutputModeProfile(this.outputMode);
    tuiDebug('TUI', 'start()', { mode: this.outputMode, useTtyUi: profile.useTtyUi });

    if (profile.useTtyUi) {
      scrollbackFeed.enable();
      setSpinnerTuiMessageSink((type, text) => this.stateSink.addMessage(type, text));
      this.startProgressApp(options.phases ? PHASE_FOOTER_HEIGHT : SIMPLE_FOOTER_HEIGHT);
    }
  }

  private startProgressApp(footerHeight: number) {
    let attachConsumer: ((renderer: CliRenderer) => () => void) | null = null;

    this.runtime.start(
      async () => {
        const [{ createOpenTuiApp }, { ProgressDashboard }, { attachScrollbackConsumer }, { ScrollbackItemView }] =
          await Promise.all([
            import('./runtime/opentui'),
            import('./progress/views/dashboard'),
            import('./runtime/scrollback-consumer'),
            import('./progress/views/scrollback-items')
          ]);

        attachConsumer = (renderer) => attachScrollbackConsumer(renderer, scrollbackFeed, ScrollbackItemView);

        const onQuit = () => {
          tuiDebug('TUI', 'onQuit callback fired');
          setTimeout(() => this.stopInternal(), 0);
        };
        const onCancel = () => {
          tuiDebug('TUI', 'onCancel callback fired');
          setTimeout(async () => {
            await this.stopInternal();
            process.emit('SIGINT', 'SIGINT');
          }, 0);
        };
        const onRenderError = (error: Error) => {
          tuiDebug('TUI', 'onRenderError callback fired', { message: error.message, stack: error.stack });
          void this.teardown();
          try {
            process.stderr.write(`\n[TUI render error] ${error.message}\n`);
            if (error.stack) {
              process.stderr.write(`${error.stack}\n`);
            }
          } catch {}
        };

        return createOpenTuiApp(() => ProgressDashboard({ onQuit, onCancel, onRenderError }), {
          screenMode: 'split-footer',
          footerHeight
        });
      },
      {
        onReady: (renderer) => {
          const detach = attachConsumer?.(renderer);
          this.updateTerminalTitle();
          return detach ?? undefined;
        },
        onStartError: (err) => {
          // Dynamic import or renderer creation failed — mark the TUI as
          // disabled and unblock any prompt queued for the never-mounted footer.
          this._isEnabled = false;
          this.promptSink.rejectPending();
          try {
            process.stderr.write('\x1B[?25h');
            process.stderr.write(`\n[TUI init error] ${err?.message || err}\n`);
          } catch {}
        }
      }
    );
  }

  /**
   * Full teardown shared by every stop path: renderer destroy (bounded waits),
   * pending-prompt rejection, spinner sink release, output-capture restore and
   * progress-store shutdown. Idempotent per start().
   */
  private async teardown() {
    if (this.teardownDone) return;
    this.teardownDone = true;

    const { rendererDestroyed } = await this.runtime.stop();

    // Safety: restore cursor, but ONLY if the renderer was NOT destroyed
    // cleanly (destroy() already restores terminal state; re-emitting restore
    // sequences afterwards moves the cursor on Windows terminals).
    if (this._wasEverStarted && !rendererDestroyed) {
      try {
        process.stdout.write('\x1B[?25h');
      } catch {}
    }

    // A prompt awaiting an answer in the footer can never resolve once the
    // renderer is gone — reject it so the awaiting command aborts cleanly.
    this.promptSink.rejectPending();
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
    // Give the footer one last paint so the final state (all phases checked)
    // is briefly visible before the receipt is written and the footer unmounts.
    const holdMs = this.runtime.isActive ? 350 : 100;
    await new Promise((resolve) => setTimeout(resolve, holdMs));
    await this.stopInternal();
  }

  private async stopInternal() {
    tuiDebug('TUI', 'stopInternal()');
    const state = tuiState.getSnapshot();
    this.emitFinalScrollback(state);
    this.maybeNotifyCompletion(state);
    await this.teardown();
    this.printFallbackSummary(state);
  }

  stopSync() {
    tuiDebug('TUI', 'stopSync() called', { isEnabled: this._isEnabled });
    tuiState.setFinalizing();
    this._isEnabled = false;
    const state = tuiState.getSnapshot();
    this.emitFinalScrollback(state);
    this.maybeNotifyCompletion(state);
    // stopSync is inherently synchronous — fire-and-forget the async teardown.
    void this.teardown();
    this.printFallbackSummary(state);
  }

  forceRestoreTerminal() {
    forceRestoreTerminal();
  }

  /** Updates the terminal tab title from the current header (TTY only). */
  private updateTerminalTitle() {
    const header = tuiState.getState().header;
    const renderer = this.runtime.renderer;
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
    const renderer = this.runtime.renderer;
    if (ARE_NOTIFICATIONS_DISABLED || this.runtime.windowFocused || !renderer) return;
    const elapsedMs = Date.now() - state.startTime;
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

  /**
   * Streams the final outcome into terminal scrollback (split-footer mode).
   * Finished work was already streamed as it happened, so this only appends
   * the closing summary / cancellation / failure line.
   */
  private emitFinalScrollback(state: TuiState) {
    if (!scrollbackFeed.enabled || this.finalScrollbackEmitted) return;
    this.finalScrollbackEmitted = true;

    const { summary, phases, startTime, cancelDeployment, header } = state;
    const elapsed = fmt.formatDuration(Date.now() - startTime);

    if (summary) {
      scrollbackFeed.push({ kind: 'summary', summary, phases, totalDurationMs: Date.now() - startTime, header });
      return;
    }

    // A fatal error → stream the styled error block (covers the failure; the
    // plain-text stderr fallback in displayError is then skipped).
    if (this._pendingErrorData) {
      scrollbackFeed.push({ kind: 'error', error: this._pendingErrorData, header });
      this._errorRenderedToScrollback = true;
      this._pendingErrorData = undefined;
      return;
    }

    const action =
      header?.action === 'DELETING'
        ? 'Deletion'
        : header?.action === 'COMPILING TEMPLATE'
          ? 'Template compilation'
          : 'Deployment';
    const hasErroredPhase = phases.some((p) => p.status === 'error');
    const hasRunningPhase = phases.some((p) => p.status === 'running');

    if (hasErroredPhase || (hasRunningPhase && !cancelDeployment)) {
      scrollbackFeed.push({ kind: 'message', type: 'error', text: `${action} failed (${elapsed})` });
    } else if (cancelDeployment || hasRunningPhase) {
      const text = cancelDeployment?.isCancelling
        ? `${action} cancelled — rolling back (${elapsed})`
        : `${action} cancelled (${elapsed})`;
      scrollbackFeed.push({ kind: 'message', type: 'warn', text });
    }
  }

  /**
   * Plain-text exit summary for paths where nothing streamed to scrollback:
   * plain output mode, or TTY mode where the renderer never mounted (early
   * crash). In the normal TTY flow scrollback already holds the full record.
   */
  private printFallbackSummary(state: TuiState) {
    if (this.outputMode === 'jsonl') return;
    if (this.outputMode === 'plain') {
      this.printExitSummary(state);
      return;
    }
    const pending = scrollbackFeed.drainPending();
    if (pending.length > 0) {
      this.printExitSummary(state);
    }
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
    const level: 'info' | 'warn' | 'error' = type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'info';

    this.emitOutputRecord({ type: 'log', level, source: 'cli', message });

    if (this.outputMode === 'plain' || this.outputMode === 'jsonl') return;

    const hasActivePhase = this.stateSink.getState().currentPhase !== undefined;
    if (this._isEnabled && this.isTTY && hasActivePhase) {
      this.stateSink.addMessage(type, fmt.stripAnsi(message).trim());
      return;
    }

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
    this.emitOutputRecord({
      type: 'progress',
      phase: 'INITIALIZE',
      message: formatCommandHeaderProgressMessage(header)
    });
  }

  showCommandHeader(header: TuiDeploymentHeader, options: { renderStandalone?: boolean } = {}) {
    this.setHeader(header);
    if (!options.renderStandalone) return;
    if (this._isEnabled || !this.isTTY || this.outputMode !== 'tty') return;

    console.info(renderCommandHeaderBox(header).join('\n'));
  }

  setPhase(phase: DeploymentPhase) {
    this.emitOutputRecord({ type: 'progress', phase, message: `Entering phase ${phase}` });
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
    const { phase } = this.stateSink.startEvent(params);
    this.emitOutputRecord({
      type: 'event',
      phase,
      eventType: params.eventType,
      status: 'started',
      message: params.description,
      instanceId: params.instanceId,
      parentEventType: params.parentEventType,
      parentInstanceId: params.parentInstanceId
    });
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
    const updated = this.stateSink.updateEvent(params);
    if (!updated) return;
    this.emitOutputRecord({
      type: 'event',
      phase: updated.phase,
      eventType: params.eventType,
      status: 'running',
      message: updated.message,
      instanceId: params.instanceId,
      parentEventType: params.parentEventType,
      parentInstanceId: params.parentInstanceId,
      detail: params.detail
    });
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
    const finished = this.stateSink.finishEvent(params);
    this.emitOutputRecord({
      type: 'event',
      phase: finished.phase,
      eventType: params.eventType,
      status: 'completed',
      message: finished.message,
      instanceId: params.instanceId,
      parentEventType: params.parentEventType,
      parentInstanceId: params.parentInstanceId,
      detail: params.detail
    });
  }

  appendEventOutput(params: {
    eventType: LoggableEventType;
    lines: string[];
    instanceId?: string;
    parentEventType?: LoggableEventType;
    parentInstanceId?: string;
  }) {
    this.emitOutputRecord({
      type: 'output',
      eventType: params.eventType,
      instanceId: params.instanceId,
      parentEventType: params.parentEventType,
      parentInstanceId: params.parentInstanceId,
      lines: params.lines
    });
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
    const { prettyStackTrace, errorType, sentryEventId } = error.details;
    const isExpected = error instanceof CliError;

    const errorMessage =
      !IS_DEV && !isExpected
        ? `An unexpected error occurred. Last captured event: ${eventManager.lastEvent?.eventType || '-'}.`
        : error.message;

    const hints: string[] = isExpected ? [...error.hints] : [];
    if (sentryEventId) {
      hints.push(`This error has been anonymously reported to our error monitoring service with id ${sentryEventId}.`);
    }
    hints.push(`To get help, reach out to our team at support@stacktape.com`);

    return {
      errorType,
      message: errorMessage,
      hints: this.logLevel !== 'error' ? hints : undefined,
      stackTrace: prettyStackTrace || undefined,
      userStackTrace: isExpected ? error.userStackTrace : undefined,
      errorDetails: isExpected ? error.errorDetails : undefined,
      sentryEventId: sentryEventId || undefined,
      isExpected
    };
  }

  /**
   * Captures a fatal error so it is streamed into scrollback as a styled block
   * while the renderer is still mounted. Call BEFORE stop()/teardown. The later
   * displayError() then knows the error is already shown and skips the plain
   * stderr fallback. No-op in non-TTY modes (stderr/jsonl handles those).
   */
  setFatalError(error: HandledError) {
    if (!scrollbackFeed.enabled) return;
    this._pendingErrorData = this.toErrorDisplayData(error);
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

    // In TTY mode the error was already streamed into scrollback as a styled
    // block by emitFinalScrollback() (while the renderer was alive), so don't
    // also dump it to stderr.
    if (this._errorRenderedToScrollback) {
      this._errorRenderedToScrollback = false;
      return;
    }

    const errorString = renderErrorToString(errorData, this.colorize.bind(this), this.makeBold.bind(this));
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
