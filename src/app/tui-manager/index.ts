import type { ExpectedError, UnexpectedError } from '@utils/errors';
import type {
  TuiCancelDeployment,
  TuiDeploymentHeader,
  TuiEventStatus,
  TuiLink,
  TuiMessageType,
  TuiSelectOption
} from './types';
import { eventManager } from '@application-services/event-manager';
import { INVOKED_FROM_ENV_VAR_NAME, IS_DEV, linksMap } from '@config';
import { getRelativePath, transformToUnixPath } from '@shared/utils/fs-utils';

import kleur from 'kleur';
import boxen from 'boxen';
import stringWidth from 'string-width';
import terminalLink from 'terminal-link';
import { ConsoleInterceptor } from './console-interceptor';
import type { OpenTuiHandle } from './opentui-renderer';
import { tuiDebug } from './tui-debug-log';
import type { JsonlEventDetail } from './jsonl-types';
import { renderErrorToString, renderStackErrorsToString } from './non-tty-renderer';
import { getOutputModeProfile, resolveOutputMode, type OutputMode } from './output-mode';
import type { OutputRecord } from './output-record';
import { OutputRouter } from './output-router';
import { PromptSink } from './prompt-sink';
import { UserCancelledError } from './prompts';
import { createSpinner, createSpinnerProgressLogger, MultiSpinner, setSpinnerGuidedMode } from './spinners';
import { tuiState } from './state';
import { TuiStateSink } from './tui-state-sink';
import {
  COMMAND_HEADER_BOX_MIN_WIDTH,
  formatCommandHeaderProgressMessage,
  formatCommandHeaderTarget
} from './command-header';
import { formatDuration, stripAnsi } from './utils';

export { UserCancelledError };
export type { Spinner } from './spinners';
export { MultiSpinner } from './spinners';
export { tuiState } from './state';
export type {
  TuiDeploymentHeader,
  TuiEvent,
  TuiLink,
  TuiMessage,
  TuiPhase,
  TuiSelectOption,
  TuiState,
  TuiSummary,
  TuiWarning
} from './types';

export type ErrorDisplayData = {
  errorType: string;
  message: string;
  hints?: string[];
  stackTrace?: string;
  userStackTrace?: string;
  sentryEventId?: string;
  isExpected?: boolean;
};

class TuiManager {
  private openTuiHandle: OpenTuiHandle | null = null;
  private _openTuiInitPromise: Promise<void> | null = null;

  private outputMode: OutputMode = resolveOutputMode({ forceTty: process.env.FORCE_TTY === '1' });
  private outputRouter: OutputRouter;
  private stateSink = new TuiStateSink();
  private promptSink = new PromptSink(this.colorize.bind(this));
  private consoleInterceptor = new ConsoleInterceptor();
  private originalStdoutWrite: typeof process.stdout.write | null = null;
  private originalStderrWrite: typeof process.stderr.write | null = null;
  private stdoutJsonlBuffer = '';
  private stderrJsonlBuffer = '';
  private explicitOutputMode?: OutputMode;
  private _isEnabled = false;
  private _wasEverStarted = false;
  private _devTuiActive = false;
  private _guidedMode = false;
  private logLevel: LogLevel = 'info';

  constructor() {
    this.outputRouter = new OutputRouter(this.outputMode);
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

  get guidedMode(): boolean {
    return this._guidedMode;
  }

  /** @deprecated Use setOutputFormat() instead. Kept for backward compatibility. */
  setAgentMode(enabled: boolean) {
    if (enabled) {
      this.setOutputFormat('jsonl');
    }
  }

  setOutputFormat(mode: OutputMode) {
    this.explicitOutputMode = mode;
    this.outputMode = resolveOutputMode({
      explicitMode: this.explicitOutputMode,
      forceTty: process.env.FORCE_TTY === '1'
    });
    this.outputRouter.reconfigure(this.outputMode);
    this.reconfigureConsoleForMode();
  }

  init(options: { logLevel?: LogLevel } = {}) {
    this.logLevel = options.logLevel || 'info';
    this.outputMode = resolveOutputMode({
      explicitMode: this.explicitOutputMode,
      forceTty: process.env.FORCE_TTY === '1'
    });
    this.outputRouter.reconfigure(this.outputMode);
    this.reconfigureConsoleForMode();
    this.outputRouter.reset();
  }

  start() {
    this._isEnabled = true;
    this._wasEverStarted = true;
    this.stateSink.reset();
    const profile = getOutputModeProfile(this.outputMode);
    tuiDebug('TUI', 'start()', { mode: this.outputMode, useTtyUi: profile.useTtyUi });

    if (profile.useJsonlStdout) {
      return;
    }

    if (profile.usePlainStdout) {
      return;
    }

    if (profile.useTtyUi) {
      this.startOpenTui();
    }
  }

  private startOpenTui() {
    this._openTuiDestroyed = false;
    tuiDebug('TUI', 'startOpenTui() begin');
    this._openTuiInitPromise = import('./opentui-renderer')
      .then(async ({ createOpenTuiApp }) => {
        tuiDebug('TUI', 'startOpenTui() imports resolved');
        const { DeployDashboard } = await import('./components/deploy/deploy-dashboard');
        const onQuit = () => {
          tuiDebug('TUI', 'onQuit callback fired');
          setTimeout(() => this.stopAndPrintSummary(), 0);
        };
        const onCancel = () => {
          tuiDebug('TUI', 'onCancel callback fired');
          setTimeout(async () => {
            await this.destroyOpenTui();
            process.emit('SIGINT', 'SIGINT');
          }, 0);
        };
        const onRenderError = (error: Error) => {
          tuiDebug('TUI', 'onRenderError callback fired', { message: error.message, stack: error.stack });
          this.destroyOpenTui();
          try {
            process.stderr.write(`\n[TUI render error] ${error.message}\n`);
            if (error.stack) {
              process.stderr.write(`${error.stack}\n`);
            }
          } catch {}
        };
        const component = () => DeployDashboard({ onQuit, onCancel, onRenderError });
        // Guard: if TUI was disabled while imports were resolving, bail out
        if (!this._isEnabled || this._openTuiDestroyed) {
          tuiDebug('TUI', 'startOpenTui() bail — disabled during import', {
            isEnabled: this._isEnabled,
            destroyed: this._openTuiDestroyed
          });
          return;
        }
        const handle = await createOpenTuiApp(component);
        tuiDebug('TUI', 'startOpenTui() renderer created');
        // Guard: if TUI was destroyed while renderer was being created (alternate screen
        // already entered), immediately tear it down to avoid orphaned alternate screen
        if (this._openTuiDestroyed || !this._isEnabled) {
          tuiDebug('TUI', 'startOpenTui() post-create bail — destroying handle', {
            isEnabled: this._isEnabled,
            destroyed: this._openTuiDestroyed
          });
          try {
            handle.destroy();
          } catch {}
          return;
        }
        this.openTuiHandle = handle;
        tuiDebug('TUI', 'startOpenTui() complete — handle assigned');
      })
      .catch((err) => {
        tuiDebug('TUI', 'startOpenTui() CATCH', { message: err?.message, stack: err?.stack });
        // Dynamic import or renderer creation failed — mark TUI as disabled
        this._isEnabled = false;
        try {
          process.stderr.write('\x1B[?1049l\x1B[?25h');
          process.stderr.write(`\n[TUI init error] ${err?.message || err}\n`);
        } catch {}
      })
      .finally(() => {
        tuiDebug('TUI', 'startOpenTui() finally — clearing init promise');
        this._openTuiInitPromise = null;
      });
  }

  private async stopAndPrintSummary() {
    tuiDebug('TUI', 'stopAndPrintSummary()', { hasSummary: !!tuiState.getSnapshot().summary });
    const state = tuiState.getSnapshot();
    await this.destroyOpenTui();

    if (state.summary) {
      this.printPlainSummary(state);
    }
  }

  private _openTuiDestroyed = false;

  private async destroyOpenTui() {
    const caller = new Error('trace').stack?.split('\n')[2]?.trim() || 'unknown';
    tuiDebug('TUI', 'destroyOpenTui()', {
      alreadyDestroyed: this._openTuiDestroyed,
      hasHandle: !!this.openTuiHandle,
      hasInitPromise: !!this._openTuiInitPromise,
      caller
    });
    if (this._openTuiDestroyed) return;
    this._openTuiDestroyed = true;

    let handleDestroyed = false;
    if (this.openTuiHandle) {
      tuiDebug('TUI', 'destroyOpenTui() — destroying handle');
      try {
        // handle.destroy() is async: it calls renderer.destroy() then waits for
        // renderer.idle() (with a 500ms timeout). This ensures finalizeDestroy()
        // completes even if a render cycle was in progress, so the alternate screen
        // is properly exited before we write the plain-text summary.
        await this.openTuiHandle.destroy();
        handleDestroyed = true;
      } catch {}
      this.openTuiHandle = null;
    }

    // If renderer init is still in-flight, wait (with timeout) for it to resolve
    // and then destroy. The post-creation guard in startOpenTui will handle this
    // via _openTuiDestroyed flag, but we also do a deferred cleanup as a safety net.
    // We MUST await this (not fire-and-forget) to prevent the deferred cleanup from
    // writing alt-screen-exit escapes AFTER the caller has already written error output.
    if (this._openTuiInitPromise) {
      tuiDebug('TUI', 'destroyOpenTui() — init still in-flight, awaiting with timeout');
      try {
        await Promise.race([this._openTuiInitPromise, new Promise<void>((resolve) => setTimeout(resolve, 3000))]);
      } catch {}
      // After init resolves, the post-creation guard in startOpenTui() should have
      // bailed out due to _openTuiDestroyed=true. But if a handle slipped through,
      // destroy it now.
      if (this.openTuiHandle) {
        tuiDebug('TUI', 'destroyOpenTui() deferred — destroying late handle');
        try {
          await this.openTuiHandle.destroy();
          handleDestroyed = true;
        } catch {}
        this.openTuiHandle = null;
      }
    }

    // Safety: exit alternate screen + restore cursor, but ONLY if the renderer handle
    // was NOT successfully destroyed (handle.destroy() already exits the alternate screen
    // and restores cursor). Writing \x1B[?1049l again after a successful destroy can move
    // the cursor to the wrong position on Windows terminals, causing the first lines of
    // subsequent output to be overwritten/invisible.
    if (this._wasEverStarted && !handleDestroyed) {
      try {
        process.stdout.write('\x1B[?1049l\x1B[?25h');
      } catch {}
    }

    this._isEnabled = false;
    this.disableJsonlStdoutGuard();
    this.disableJsonlStderrGuard();
    this.consoleInterceptor.stop();

    tuiState.flushPendingNotifications();
    tuiState.destroy();
    tuiDebug('TUI', 'destroyOpenTui() complete');
  }

  private printPlainSummary(state: ReturnType<typeof tuiState.getSnapshot>) {
    const { summary, header, phases, startTime } = state;
    tuiDebug('TUI', 'printPlainSummary()', { hasSummary: !!summary, success: summary?.success, mode: this.outputMode });
    if (!summary) return;
    // In JSONL mode, the result is emitted as structured JSON by emitJsonlResult().
    // Plain-text summary must not leak into the JSONL output stream.
    if (this.outputMode === 'jsonl') return;

    const elapsed = formatDuration(Date.now() - startTime);
    const icon = summary.success ? kleur.green('✓') : kleur.red('✗');
    const headerText = header ? `${header.projectName} → ${header.stageName} (${header.region})` : '';

    // Write directly to stdout to bypass any console interception that may still be active
    // (or was incorrectly restored). console.info goes through the interceptor chain which
    // can silently swallow output if the TUI was destroyed mid-stream.
    const write = (msg: string) => {
      try {
        process.stdout.write(`${msg}\n`);
      } catch {}
    };

    write('');
    write(`${icon} ${kleur.bold(summary.message)}`);
    if (headerText) write(kleur.gray(headerText));

    const phaseSummary = phases
      .filter((p) => p.status === 'success' || p.status === 'error')
      .map((p) => {
        const pIcon = p.status === 'success' ? kleur.green('✓') : kleur.red('✗');
        const dur = p.duration ? kleur.gray(` ${formatDuration(p.duration)}`) : '';
        return `  ${pIcon} ${p.name}${dur}`;
      });

    if (phaseSummary.length > 0) {
      write(kleur.gray('─'.repeat(54)));
      for (const line of phaseSummary) {
        write(line);
      }
    }

    if (summary.links.length > 0) {
      write(kleur.gray('─'.repeat(54)));
      for (const link of summary.links) {
        // fallback: (text) => text prevents terminal-link from appending the URL
        // a second time when OSC 8 hyperlinks are not supported by the terminal.
        write(
          `  ${kleur.cyan('•')} ${link.label}: ${kleur.blue(terminalLink(link.url, link.url, { fallback: (text: string) => text }))}`
        );
      }
    }

    if (summary.consoleUrl) {
      write(
        `  ${kleur.cyan('•')} Stack details: ${kleur.blue(terminalLink(summary.consoleUrl, summary.consoleUrl, { fallback: (text: string) => text }))}`
      );
    }

    write(kleur.gray(`  Total: ${elapsed}`));

    const eventsWithOutput = phases.flatMap((p) => p.events.filter((e) => e.outputLines && e.outputLines.length > 0));
    for (const event of eventsWithOutput) {
      write(kleur.gray('─'.repeat(54)));
      const label = event.description || event.eventType;
      write(`  ${kleur.cyan('▸')} ${kleur.bold(label)}`);
      for (const line of event.outputLines!) {
        if (line.trim()) write(`    ${line}`);
      }
    }

    write('');
    tuiDebug('TUI', 'printPlainSummary() complete');
  }

  async stop() {
    const caller = new Error('trace').stack?.split('\n')[2]?.trim() || 'unknown';
    tuiDebug('TUI', 'stop() called', {
      isEnabled: this._isEnabled,
      hasInitPromise: !!this._openTuiInitPromise,
      caller
    });
    tuiState.setFinalizing();
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Wait for in-flight renderer creation to complete before destroying,
    // so we can properly clean up the renderer instead of leaving an orphaned alternate screen.
    // Use a timeout to prevent hanging forever if dynamic imports are stuck.
    if (this._openTuiInitPromise) {
      tuiDebug('TUI', 'stop() — awaiting init promise (with 3s timeout)');
      await Promise.race([this._openTuiInitPromise, new Promise<void>((resolve) => setTimeout(resolve, 3000))]).catch(
        () => {}
      );
    }
    await this.stopInternal();
  }

  stopSync() {
    const caller = new Error('trace').stack?.split('\n')[2]?.trim() || 'unknown';
    tuiDebug('TUI', 'stopSync() called', { isEnabled: this._isEnabled, caller });
    tuiState.setFinalizing();
    this._isEnabled = false;
    const state = tuiState.getSnapshot();
    // stopSync is inherently synchronous — we fire-and-forget the async destroy
    // but still forcibly exit alternate screen (belt-and-suspenders in destroyOpenTui)
    this.destroyOpenTui();

    if (state.summary) {
      this.printPlainSummary(state);
    }
  }

  private async stopInternal() {
    tuiDebug('TUI', 'stopInternal()');
    const state = tuiState.getSnapshot();
    await this.destroyOpenTui();

    if (state.summary) {
      this.printPlainSummary(state);
    }
  }

  private reconfigureConsoleForMode() {
    const interceptDisabled = process.env.STP_DISABLE_CONSOLE_INTERCEPT === 'true';
    const profile = getOutputModeProfile(this.outputMode);
    if (profile.useJsonlStdout) {
      this.enableJsonlStdoutGuard();
      this.enableJsonlStderrGuard();
    } else {
      this.disableJsonlStdoutGuard();
      this.disableJsonlStderrGuard();
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

  private isValidJsonlRecordLine(line: string) {
    try {
      const parsed = JSON.parse(line) as { type?: unknown };
      if (!parsed || typeof parsed !== 'object') return false;
      return parsed.type === 'event' || parsed.type === 'log' || parsed.type === 'output' || parsed.type === 'result';
    } catch {
      return false;
    }
  }

  private emitStdoutJsonlViolation(line: string) {
    const message = stripAnsi(line).trim();
    if (!message) return;
    // Avoid double-wrapping: if the raw line is itself a valid JSONL record
    // (e.g. from a re-entrancy edge case or buffer flush), pass it through
    // instead of wrapping it in another log event.
    if (this.isValidJsonlRecordLine(line.trim())) {
      this.originalStdoutWrite?.(`${line.trim()}\n`);
      return;
    }
    this.emitOutputRecord({ type: 'log', level: 'warn', source: 'stdout-raw', message });
  }

  private enableJsonlStdoutGuard() {
    if (this.originalStdoutWrite) {
      return;
    }

    this.originalStdoutWrite = process.stdout.write.bind(process.stdout) as typeof process.stdout.write;
    this.stdoutJsonlBuffer = '';

    process.stdout.write = ((chunk: any, encoding?: BufferEncoding | ((error?: Error | null) => void), cb?: any) => {
      const callback = typeof encoding === 'function' ? encoding : typeof cb === 'function' ? cb : undefined;
      const resolvedEncoding = typeof encoding === 'string' ? encoding : undefined;
      const textChunk = Buffer.isBuffer(chunk) ? chunk.toString(resolvedEncoding || 'utf8') : String(chunk ?? '');

      this.stdoutJsonlBuffer += textChunk;
      const lines = this.stdoutJsonlBuffer.split('\n');
      this.stdoutJsonlBuffer = lines.pop() || '';

      for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) {
          continue;
        }
        if (this.isValidJsonlRecordLine(trimmed)) {
          this.originalStdoutWrite?.(`${trimmed}\n`);
          continue;
        }
        this.emitStdoutJsonlViolation(rawLine);
      }

      callback?.();
      return true;
    }) as typeof process.stdout.write;
  }

  private disableJsonlStdoutGuard() {
    if (!this.originalStdoutWrite) {
      return;
    }

    if (this.stdoutJsonlBuffer.trim()) {
      this.emitStdoutJsonlViolation(this.stdoutJsonlBuffer);
    }
    this.stdoutJsonlBuffer = '';

    process.stdout.write = this.originalStdoutWrite;
    this.originalStdoutWrite = null;
  }

  private emitStderrJsonlLine(line: string) {
    const message = line.trim();
    if (!message) return;
    this.emitOutputRecord({ type: 'log', level: 'error', source: 'stderr', message });
  }

  private enableJsonlStderrGuard() {
    if (this.originalStderrWrite) {
      return;
    }

    this.originalStderrWrite = process.stderr.write.bind(process.stderr) as typeof process.stderr.write;
    this.stderrJsonlBuffer = '';

    process.stderr.write = ((chunk: any, encoding?: BufferEncoding | ((error?: Error | null) => void), cb?: any) => {
      const callback = typeof encoding === 'function' ? encoding : typeof cb === 'function' ? cb : undefined;
      const resolvedEncoding = typeof encoding === 'string' ? encoding : undefined;
      const textChunk = Buffer.isBuffer(chunk) ? chunk.toString(resolvedEncoding || 'utf8') : String(chunk ?? '');

      this.stderrJsonlBuffer += textChunk;
      const lines = this.stderrJsonlBuffer.split('\n');
      this.stderrJsonlBuffer = lines.pop() || '';

      for (const line of lines) {
        this.emitStderrJsonlLine(line);
      }

      callback?.();
      return true;
    }) as typeof process.stderr.write;
  }

  private disableJsonlStderrGuard() {
    if (!this.originalStderrWrite) {
      return;
    }

    if (this.stderrJsonlBuffer.trim()) {
      this.emitStderrJsonlLine(this.stderrJsonlBuffer);
    }
    this.stderrJsonlBuffer = '';

    process.stderr.write = this.originalStderrWrite;
    this.originalStderrWrite = null;
  }

  setDevTuiActive(active: boolean) {
    this._devTuiActive = active;
  }

  intro(title: string) {
    if (!this.isTTY) {
      console.info(`\n[i] ${title}\n`);
      return;
    }
    this._guidedMode = true;
    setSpinnerGuidedMode(true);
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
    this._guidedMode = false;
    setSpinnerGuidedMode(false);
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
      this.stateSink.addMessage(type, message);
      return;
    }

    if (!this._devTuiActive || !this._isEnabled) {
      this.printToConsole(type, message);
    }
  }

  private printToConsole(type: TuiMessageType, message: string) {
    if (this.isTTY) {
      const symbols: Record<TuiMessageType, string> = {
        info: this.colorize('cyan', 'ℹ'),
        success: this.colorize('green', '✓'),
        error: this.colorize('red', '✖'),
        warn: this.colorize('yellow', '▲'),
        debug: this.colorize('gray', '·'),
        hint: this.colorize('blue', 'ℹ'),
        start: this.colorize('cyan', '▶'),
        announcement: this.colorize('cyan', '▶')
      };
      const rendered = type === 'debug' ? this.colorize('gray', message) : message;
      const line = `${symbols[type] || this.colorize('cyan', 'ℹ')} ${rendered}`;
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

  configureForDelete() {
    tuiState.configureForDelete();
  }

  configureForCodebuildDeploy() {
    tuiState.configureForCodebuildDeploy();
  }

  setStreamingMode(enabled: boolean) {
    tuiState.setStreamingMode(enabled);
  }

  setShowPhaseHeaders(show: boolean) {
    tuiState.setShowPhaseHeaders(show);
  }

  private setHeader(header: TuiDeploymentHeader) {
    const wasUpdated = this.stateSink.setHeader(header);
    if (!wasUpdated) return;

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

    const rendered = this.renderCommandHeaderBox(header);
    console.info(rendered.join('\n'));
  }

  private renderCommandHeaderBox(header: TuiDeploymentHeader): string[] {
    const actionLine = this.makeBold(this.colorize('cyan', header.action));
    const targetLine = `${header.projectName} ${this.colorize('gray', '→')} ${header.stageName} ${this.colorize('gray', `(${header.region})`)}`;
    const plainTarget = formatCommandHeaderTarget(header);
    const totalWidth = Math.max(COMMAND_HEADER_BOX_MIN_WIDTH, this.getVisibleWidth(plainTarget) + 4);
    const innerWidth = totalWidth - 2;
    const textWidth = innerWidth - 2;

    const top = `╭${'─'.repeat(innerWidth)}╮`;
    const actionPadding = Math.max(0, textWidth - this.getVisibleWidth(actionLine));
    const targetPadding = Math.max(0, textWidth - this.getVisibleWidth(targetLine));
    const actionRow = `│ ${actionLine}${' '.repeat(actionPadding)} │`;
    const targetRow = `│ ${targetLine}${' '.repeat(targetPadding)} │`;
    const bottom = `╰${'─'.repeat(innerWidth)}╯`;

    return [top, actionRow, targetRow, bottom];
  }

  setSimpleMode(enabled: boolean) {
    tuiState.setShowPhaseHeaders(!enabled);
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

  setComplete(success: boolean, message: string, links: TuiLink[] = [], consoleUrl?: string) {
    tuiState.setComplete(success, message, links, consoleUrl);
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
    if (!this.isTTY) return text;
    return (kleur[color as keyof typeof kleur] as (text: string) => string)?.(text) ?? text;
  }

  makeBold(text: string | number): string {
    if (!this.isTTY) return text.toString();
    return kleur.bold(text);
  }

  terminalLink(url: string, placeholder: string): string {
    return this.colorize('blue', terminalLink(placeholder, url));
  }

  getTime(durationInMs: number): string {
    return this.colorize('yellow', formatDuration(durationInMs));
  }

  getLink(link: keyof typeof linksMap, placeholder: string): string {
    const url = linksMap[link];
    return this.colorize('cyan', terminalLink(placeholder, url.endsWith('/') ? `${url.slice(0, -1)} ` : url));
  }

  prettyCommand(command: string): string {
    const normalizedCommand = command.trim().replace(/^stacktape\s+/, '');
    const commandParts = normalizedCommand.match(/"[^"]*"|'[^']*'|`[^`]*`|\S+/g) || [];
    const [commandName, ...args] = commandParts;

    if (!commandName) {
      return this.colorize('yellow', 'stacktape');
    }

    const formattedArgs = args.map((arg) => {
      if (!arg.startsWith('-')) return arg;

      if (!arg.includes('=')) {
        return this.colorize('gray', arg);
      }

      const [option, ...valueParts] = arg.split('=');
      const value = valueParts.join('=');
      const formattedOption = this.colorize('gray', option);
      return `${formattedOption}=${value}`;
    });

    return [this.colorize('yellow', 'stacktape'), commandName, ...formattedArgs].join(' ');
  }

  prettyOption(option: string): string {
    return this.makeBold(this.colorize('gray', `--${option}`));
  }

  prettyResourceName(resourceName: string): string {
    return this.makeBold(resourceName);
  }

  prettyStackName(stackName: string): string {
    return this.makeBold(stackName);
  }

  prettyConfigProperty(property: string): string {
    return this.makeBold(this.colorize('gray', property));
  }

  prettyResourceType(type: string): string {
    return this.makeBold(this.colorize('blue', type));
  }

  prettyFilePath(filePath: string): string {
    const relativePath = transformToUnixPath(getRelativePath(filePath));
    const underlined = this.isTTY ? kleur.underline(relativePath) : relativePath;
    return underlined.startsWith('./') ? underlined : `./${underlined}`;
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
  error(error: UnexpectedError | ExpectedError): void;
  error(input: string | UnexpectedError | ExpectedError) {
    if (typeof input === 'string') {
      this.log('error', input);
      return;
    }

    const error = input;
    const { hint } = error as ExpectedError;
    const { prettyStackTrace, errorType, sentryEventId } = error.details;

    const errorMessage =
      !IS_DEV && !error.isExpected
        ? `An unexpected error occurred. Last captured event: ${eventManager.lastEvent?.eventType || '-'}.`
        : error.message;

    const hints: string[] = [];
    if (hint) {
      hints.push(...(Array.isArray(hint) ? hint : [hint]));
    }
    if (sentryEventId) {
      hints.push(`This error has been anonymously reported to our error monitoring service with id ${sentryEventId}.`);
    }
    hints.push(`To get help, reach out to our team at support@stacktape.com`);

    const errorData: ErrorDisplayData = {
      errorType: errorType.replace('_ERROR', ''),
      message: errorMessage,
      hints: this.logLevel !== 'error' ? hints : undefined,
      stackTrace: prettyStackTrace || undefined,
      userStackTrace: (error as ExpectedError).userStackTrace || (error as any).userStackTrace || undefined,
      sentryEventId: sentryEventId || undefined,
      isExpected: error.isExpected
    };

    this.displayError(errorData);
  }

  async displayError(errorData: ErrorDisplayData) {
    tuiDebug('TUI', 'displayError()', { errorType: errorData.errorType, message: errorData.message?.slice(0, 200) });
    this.stateSink.markAllRunningAsErrored();
    // destroyOpenTui() handles alternate screen exit internally. If the handle was
    // destroyed successfully, the alternate screen is already exited. No additional
    // escape sequences needed — writing \x1B[?1049l again can move the cursor to
    // the wrong position on Windows terminals.
    await this.destroyOpenTui();

    this.emitOutputRecord({
      type: 'log',
      level: 'error',
      source: 'cli',
      message: `[${errorData.errorType}] ${errorData.message}`,
      ...(errorData.hints ? { data: { hints: errorData.hints } } : {})
    });

    if (this.outputMode === 'jsonl') {
      return;
    }

    if (this.isTTY) {
      this.displayErrorWithClack(errorData);
    } else {
      const errorString = renderErrorToString(errorData, this.colorize.bind(this), this.makeBold.bind(this));
      console.error(errorString);
    }
  }

  private displayErrorWithClack(errorData: ErrorDisplayData) {
    // Use process.stderr.write directly to bypass any console interception that
    // might still be active (e.g. if destroyOpenTui was a no-op due to the
    // idempotent guard). This ensures the error is always written to stderr.
    const write = (msg: string) => {
      try {
        process.stderr.write(`${msg}\n`);
      } catch {}
    };

    const typeLabel = errorData.isExpected === false ? 'Unexpected Error' : this.getErrorLabel(errorData.errorType);

    write('');
    write(this.colorize('red', `[x] ${typeLabel}`));
    write('');
    write(errorData.message);

    if (errorData.userStackTrace) {
      write('');
      write(this.makeBold('Stack trace in your code:'));
      write(this.colorize('cyan', errorData.userStackTrace));
    }

    const hints = errorData.hints || [];
    if (hints.length > 0) {
      write('');
      write(this.makeBold('Hints:'));
      for (const hint of hints) {
        write(`  ${this.colorize('gray', '→')} ${hint}`);
      }
    }

    if (errorData.stackTrace) {
      write('');
      write(this.makeBold('Stack trace:'));
      write(this.colorize('gray', errorData.stackTrace));
    }

    if (errorData.sentryEventId) {
      write('');
      write(this.colorize('gray', `Error ID: ${errorData.sentryEventId}`));
    }
  }

  private getErrorLabel(errorType: string): string {
    const labels: Record<string, string> = {
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
    return labels[errorType] || `${errorType.replace(/_/g, ' ')} Error`;
  }

  printStacktapeLog(stacktapeLog: { type: string; data: Record<string, any> }) {
    const message = { ...stacktapeLog, timestamp: Date.now() };
    if (process.env[INVOKED_FROM_ENV_VAR_NAME] === 'sdk') {
      process.send?.(message);
    } else if (stacktapeLog.type === 'ERROR') {
      console.error(message);
    } else {
      console.info(message);
    }
    const level: 'info' | 'warn' | 'error' = stacktapeLog.type === 'ERROR' ? 'error' : 'info';
    this.emitOutputRecord({ type: 'log', level, source: 'stacktape-log', message: JSON.stringify(message) });
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

  printTable({ header, rows }: { header: string[]; rows: string[][] }) {
    this.printAsciiTable(header, rows);
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

  private formatAsciiTable(header: string[], rows: string[][]): string[] {
    const widths = header.map((h) => this.getVisibleWidth(h));
    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        const cellLength = this.getVisibleWidth(row[i] || '');
        if (cellLength > (widths[i] || 0)) {
          widths[i] = cellLength;
        }
      }
    }

    const horizontalLine = `+${widths.map((w) => '-'.repeat(w + 2)).join('+')}+`;
    const formatRow = (cells: string[]) => {
      const paddedCells = cells.map((cell, i) => {
        const visibleLength = this.getVisibleWidth(cell || '');
        const padding = (widths[i] || 0) - visibleLength;
        return (cell || '') + ' '.repeat(Math.max(0, padding));
      });
      return `| ${paddedCells.join(' | ')} |`;
    };

    return [horizontalLine, formatRow(header), horizontalLine, ...rows.map(formatRow), horizontalLine];
  }

  private printAsciiTable(header: string[], rows: string[][]) {
    this.writeInfoLines(this.formatAsciiTable(header, rows));
  }

  private renderSimpleBox({
    title,
    lines,
    minWidth = 0
  }: {
    title: string;
    lines: string[];
    minWidth?: number;
  }): string[] {
    const content = (lines.length > 0 ? lines : ['']).join('\n');
    const visibleLines = lines.length > 0 ? lines : [''];
    const titleWidth = this.getVisibleWidth(title);
    const widestLine = Math.max(0, ...visibleLines.map((line) => this.getVisibleWidth(line)));
    const naturalWidth = Math.max(titleWidth, widestLine) + 4;
    const terminalWidth = this.isTTY ? Math.max(20, (process.stdout.columns || 120) - 1) : naturalWidth;
    const width = Math.min(Math.max(minWidth, naturalWidth), terminalWidth);
    const rendered = boxen(content, {
      title: this.makeBold(title),
      titleAlignment: 'left',
      borderStyle: 'round',
      borderColor: 'cyan',
      padding: { top: 0, right: 1, bottom: 0, left: 1 },
      width,
      ...(this.isTTY ? {} : { dimBorder: false })
    });

    return rendered.split('\n');
  }

  private printTitledNote(title: string, lines: string[]) {
    const rendered = this.renderSimpleBox({ title, lines });
    this.writeInfoLines([...rendered, '']);
  }

  private getVisibleWidth(value: string): number {
    return stringWidth(stripAnsi(value));
  }

  printBox({ title, lines }: { title: string; lines: string[] }) {
    this.printTitledNote(title, lines);
  }

  printListStack(listStacksResult: any[]) {
    const header = [
      'Stack name',
      'Stage',
      'Status',
      'Last updated',
      'Created',
      'Monthly spend',
      'Deployed by Stacktape'
    ];

    const unspecifiedValue = this.colorize('gray', 'N/A');

    const sortedStacks = [
      ...listStacksResult
        .filter(({ isStacktapeStack }) => isStacktapeStack)
        .sort(({ stackName: name1 }, { stackName: name2 }) => name1.localeCompare(name2)),
      ...listStacksResult
        .filter(({ isStacktapeStack }) => !isStacktapeStack)
        .sort(({ stackName: name1 }, { stackName: name2 }) => name1.localeCompare(name2))
    ];

    const rows = sortedStacks.map((stackInfo) => [
      stackInfo.stackName,
      stackInfo.stage ? this.colorize('cyan', stackInfo.stage) : unspecifiedValue,
      stackInfo.stackStatus,
      stackInfo.lastUpdateTime
        ? this.colorize('blue', new Date(stackInfo.lastUpdateTime).toLocaleString())
        : unspecifiedValue,
      stackInfo.creationTime
        ? this.colorize('blue', new Date(stackInfo.creationTime).toLocaleString())
        : unspecifiedValue,
      stackInfo.actualSpend ? this.colorize('cyan', stackInfo.actualSpend) : unspecifiedValue,
      stackInfo.isStacktapeStack ? this.colorize('green', 'TRUE') : 'FALSE'
    ]);

    this.printTable({ header, rows });
  }

  printDevContainerReady({ ports, isWatchMode }: { ports: number[]; isWatchMode: boolean }) {
    const contentLines: string[] = [];

    if (ports.length > 0) {
      contentLines.push('Ports:');
      for (const port of ports) {
        contentLines.push(`  ${this.colorize('cyan', `http://localhost:${port}`)}`);
      }
    }

    const hint = isWatchMode
      ? 'Watching for file changes'
      : `Type '${this.makeBold('rs + enter')}' to rebuild and restart`;
    contentLines.push(hint);

    this.printTitledNote(`${this.colorize('green', '✓')} Container ready`, contentLines);
  }

  printWhoami({
    user,
    organization,
    connectedAwsAccounts,
    projects,
    role,
    isProjectScoped,
    permissions
  }: {
    user: { id: string; name?: string; email?: string; [key: string]: any };
    organization: { id: string; name: string; [key: string]: any };
    connectedAwsAccounts: Array<{
      id: string;
      name?: string;
      awsAccountId?: string;
      state?: string;
      [key: string]: any;
    }>;
    projects: Array<{ id: string; name: string; [key: string]: any }>;
    role?: string;
    isProjectScoped?: boolean;
    permissions?: string[];
  }) {
    const lines: string[] = [];

    lines.push(this.makeBold('User'));
    lines.push(`  Name: ${this.colorize('cyan', user.name || 'N/A')}`);
    lines.push(`  Email: ${this.colorize('cyan', user.email || 'N/A')}`);
    lines.push(`  ID: ${this.colorize('gray', user.id)}`);
    if (role) {
      lines.push(`  Role: ${this.colorize('yellow', role)}`);
    }
    if (isProjectScoped) {
      lines.push(`  Scope: ${this.colorize('yellow', 'project-scoped (limited to assigned projects)')}`);
    }
    lines.push('');

    lines.push(this.makeBold('Organization'));
    lines.push(`  Name: ${this.colorize('cyan', organization.name)}`);
    lines.push(`  ID: ${this.colorize('gray', organization.id)}`);
    lines.push('');

    lines.push(this.makeBold('Connected AWS Accounts'));
    if (connectedAwsAccounts.length === 0) {
      lines.push(`  ${this.colorize('gray', 'No connected accounts')}`);
    } else {
      for (const acc of connectedAwsAccounts) {
        const stateColor = acc.state === 'ACTIVE' ? 'green' : 'yellow';
        lines.push(
          `  - ${this.colorize('cyan', acc.name || 'unnamed')} (${acc.awsAccountId || 'N/A'}) - ${this.colorize(stateColor, acc.state || 'UNKNOWN')}`
        );
      }
    }
    lines.push('');

    lines.push(this.makeBold('Accessible Projects'));
    if (projects.length === 0) {
      lines.push(`  ${this.colorize('gray', 'No projects')}`);
    } else {
      for (const project of projects) {
        lines.push(`  - ${this.colorize('cyan', project.name)}`);
      }
    }

    if (permissions && permissions.length > 0) {
      lines.push('');
      lines.push(this.makeBold('Permissions'));
      for (const perm of permissions) {
        lines.push(`  - ${this.colorize('gray', perm)}`);
      }
    }

    this.printLines(lines);
  }

  printProjects({
    projects
  }: {
    projects: Array<{
      id: string;
      name: string;
      stages: Array<{
        stage: string;
        status: string;
        deploymentIsInProgress: boolean;
        isErrored: boolean;
        lastUpdateTime: number;
        thisMonthCosts: { currencyCode: string; total: number };
        previousMonthCosts: { currencyCode: string; total: number };
      }>;
      undeployedStages: Array<{ name?: string; [key: string]: any }>;
    }>;
  }) {
    if (projects.length === 0) {
      this.writeInfoLine(this.colorize('gray', 'No projects found.'));
      return;
    }

    for (const project of projects) {
      const lines: string[] = [this.makeBold(`Project: ${this.colorize('cyan', project.name)}`)];

      if (project.stages.length === 0 && project.undeployedStages.length === 0) {
        lines.push(`  ${this.colorize('gray', 'No stages')}`, '');
        this.writeInfoLines(lines);
        continue;
      }

      if (project.stages.length > 0) {
        const header = ['Stage', 'Status', 'Last Updated', 'This Month', 'Prev Month'];
        const rows = project.stages.map((s) => {
          let statusDisplay = s.status;
          if (s.deploymentIsInProgress) {
            statusDisplay = this.colorize('yellow', 'IN_PROGRESS');
          } else if (s.isErrored) {
            statusDisplay = this.colorize('red', 'ERRORED');
          } else if (s.status?.includes('COMPLETE')) {
            statusDisplay = this.colorize('green', s.status);
          }

          const formatCost = (cost: { currencyCode: string; total: number }) =>
            cost.total > 0 ? `${cost.total.toFixed(2)} ${cost.currencyCode}` : this.colorize('gray', '$0.00');

          return [
            this.colorize('cyan', s.stage),
            statusDisplay,
            s.lastUpdateTime ? new Date(s.lastUpdateTime).toLocaleString() : 'N/A',
            formatCost(s.thisMonthCosts),
            formatCost(s.previousMonthCosts)
          ];
        });
        lines.push(...this.formatAsciiTable(header, rows));
      }

      if (project.undeployedStages.length > 0) {
        lines.push(
          `  ${this.colorize('gray', 'Undeployed stages:')} ${project.undeployedStages.map((s) => s.name).join(', ')}`
        );
      }

      lines.push('');
      this.writeInfoLines(lines);
    }
  }

  printOperations({
    operations
  }: {
    operations: Array<{
      id: string;
      command?: string | null;
      projectName?: string | null;
      stackName?: string | null;
      stage?: string | null;
      region?: string | null;
      createdAt?: Date | string;
      startTime?: Date | string | null;
      endTime?: Date | string | null;
      success?: boolean | null;
      inProgress?: boolean | null;
      description?: string | null;
    }>;
  }) {
    if (operations.length === 0) {
      this.writeInfoLine(this.colorize('gray', 'No operations found.'));
      return;
    }

    const header = ['Command', 'Project', 'Stage', 'Region', 'Status', 'Time'];

    const rows = operations.map((op) => {
      let status: string;
      if (op.inProgress) {
        status = this.colorize('yellow', 'IN_PROGRESS');
      } else if (op.success === true) {
        status = this.colorize('green', 'SUCCESS');
      } else if (op.success === false) {
        status = this.colorize('red', 'FAILED');
      } else {
        status = this.colorize('gray', 'UNKNOWN');
      }

      const time = op.createdAt ? new Date(op.createdAt).toLocaleString() : 'N/A';

      return [
        op.command || 'N/A',
        op.projectName || 'N/A',
        op.stage ? this.colorize('cyan', op.stage) : 'N/A',
        op.region || 'N/A',
        status,
        time
      ];
    });

    const allLines = this.formatAsciiTable(header, rows);

    const failedOps = operations.filter((op) => op.success === false && op.description);
    if (failedOps.length > 0) {
      allLines.push('', this.makeBold('Error Details:'));
      for (const op of failedOps) {
        allLines.push(`  ${this.colorize('red', `[${op.command}]`)} ${op.projectName}-${op.stage}:`);
        const descLines = (op.description || '').split('\n').slice(0, 5);
        for (const line of descLines) {
          allLines.push(`    ${this.colorize('gray', line)}`);
        }
        if ((op.description || '').split('\n').length > 5) {
          allLines.push(`    ${this.colorize('gray', '...(truncated)')}`);
        }
      }
    }

    this.writeInfoLines(allLines);
  }

  printStackDetails({
    stackName,
    region,
    details
  }: {
    stackName: string;
    region: string;
    details: {
      stackOutput?: { [key: string]: string };
      stackInfoMap?: any;
      resources?: any[];
      description?: string | null;
    };
  }) {
    const lines: string[] = [];

    lines.push(this.makeBold(`Stack: ${this.colorize('cyan', stackName)}`));
    lines.push(`Region: ${this.colorize('cyan', region)}`);
    if (details.description) {
      lines.push(`Description: ${details.description}`);
    }
    lines.push('');

    if (details.stackOutput && Object.keys(details.stackOutput).length > 0) {
      lines.push(this.makeBold('Stack Outputs:'));
      for (const [key, value] of Object.entries(details.stackOutput)) {
        if (key.startsWith('stp')) continue;
        lines.push(`  ${this.colorize('cyan', key)}: ${value}`);
      }
      lines.push('');
    }

    if (details.stackInfoMap) {
      lines.push(this.makeBold('Resources (from stackInfoMap):'));
      const infoMap = details.stackInfoMap;
      for (const [resourceName, resourceInfo] of Object.entries(infoMap)) {
        if (typeof resourceInfo === 'object' && resourceInfo !== null) {
          lines.push(`  ${this.colorize('cyan', resourceName)}:`);
          const info = resourceInfo as Record<string, any>;
          for (const [propName, propValue] of Object.entries(info)) {
            if (typeof propValue === 'string' || typeof propValue === 'number') {
              lines.push(`    ${propName}: ${propValue}`);
            }
          }
        }
      }
      lines.push('');
    }

    if (details.resources && details.resources.length > 0) {
      lines.push(this.makeBold('CloudFormation Resources:'));
      const resourcesSummary = details.resources.slice(0, 20);
      for (const res of resourcesSummary) {
        const status = res.ResourceStatus || 'N/A';
        const statusColor = status.includes('COMPLETE') ? 'green' : status.includes('FAILED') ? 'red' : 'yellow';
        lines.push(
          `  ${res.LogicalResourceId || 'N/A'} (${res.ResourceType || 'N/A'}) - ${this.colorize(statusColor, status)}`
        );
      }
      if (details.resources.length > 20) {
        lines.push(`  ${this.colorize('gray', `...and ${details.resources.length - 20} more resources`)}`);
      }
    }

    this.printLines(lines);
  }
}

export const tuiManager = new TuiManager();
export { TuiManager };
