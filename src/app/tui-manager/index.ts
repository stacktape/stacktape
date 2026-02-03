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
import { logCollectorStream } from '@utils/log-collector';
import {
  box as clackBox,
  log as clackLog,
  note as clackNote,
  S_BAR,
  S_BAR_END,
  S_BAR_START,
  updateSettings as clackUpdateSettings
} from '@clack/prompts';
import ci from 'ci-info';
import kleur from 'kleur';
import terminalLink from 'terminal-link';
import { renderErrorToString, renderNextStepsToString, renderStackErrorsToString } from './non-tty-renderer';
import { PromptManager } from './prompts';
import { NonTtyRenderer, TtyRenderer } from './renderer';
import { createSpinner, createSpinnerProgressLogger, MultiSpinner, setSpinnerGuidedMode } from './spinners';
import { tuiState } from './state';
import { formatDuration, stripAnsi } from './utils';

export { UserCancelledError } from './prompts';
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

export type NextStep = {
  text: string;
  command?: string;
  details?: string[];
  links?: string[];
};

export type ErrorDisplayData = {
  errorType: string;
  message: string;
  hints?: string[];
  stackTrace?: string;
  userStackTrace?: string;
  sentryEventId?: string;
  isExpected?: boolean;
};

/**
 * TuiManager handles all terminal output for Stacktape CLI.
 *
 * Architecture:
 * - TTY mode: Uses log-update for dynamic content that updates in place
 * - Non-TTY mode: Uses plain console.info for append-only output
 * - Prompts: Uses @clack/prompts for interactive input
 *
 * No React/Ink dependencies - simple and reliable.
 */
class TuiManager {
  private ttyRenderer: TtyRenderer | null = null;
  private nonTtyRenderer: NonTtyRenderer | null = null;
  private promptManager: PromptManager | null = null;
  private renderInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribe: (() => void) | null = null;

  private isTTY: boolean;
  private _isEnabled = false;
  private _isPaused = false;
  private _wasEverStarted = false;
  private _headerCommitted = false;
  private _devTuiActive = false;
  private _guidedMode = false;
  private logLevel: LogLevel = 'info';

  constructor() {
    this.isTTY = (process.stdout.isTTY || process.env.FORCE_TTY === '1') && !ci.isCI;
  }

  get enabled(): boolean {
    return this._isEnabled;
  }

  get wasEverStarted(): boolean {
    return this._wasEverStarted;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  get devTuiActive(): boolean {
    return this._devTuiActive;
  }

  get guidedMode(): boolean {
    return this._guidedMode;
  }

  /**
   * Enable agent mode - forces non-TTY output for LLM/programmatic consumption.
   * Must be called after init() but before start().
   */
  setAgentMode(enabled: boolean) {
    if (enabled) {
      this.isTTY = false;
      // Reinitialize prompt manager with non-TTY mode
      this.promptManager = new PromptManager(this.colorize.bind(this), false);
    }
  }

  // ─── Lifecycle ───

  init(options: { logLevel?: LogLevel } = {}) {
    this.logLevel = options.logLevel || 'info';
    this.isTTY = (process.stdout.isTTY || process.env.FORCE_TTY === '1') && !ci.isCI;
    this.promptManager = new PromptManager(this.colorize.bind(this), this.isTTY);
    clackUpdateSettings({ withGuide: false });
  }

  /**
   * Start the TUI for deploy/delete commands.
   * Uses log-update for TTY, plain console for non-TTY.
   */
  start() {
    this._isEnabled = true;
    this._wasEverStarted = true;
    this._headerCommitted = false;
    tuiState.reset();

    if (this.isTTY) {
      this.ttyRenderer = new TtyRenderer(this.colorize.bind(this), this.makeBold.bind(this));
      this.ttyRenderer.start();

      // Subscribe to state changes and re-render (skip while paused)
      this.unsubscribe = tuiState.subscribe((state) => {
        if (!this._isPaused && this.ttyRenderer) {
          // Commit header once (uses clackBox, writes directly to stdout)
          if (state.header && !this._headerCommitted) {
            this._headerCommitted = true;
            this.ttyRenderer.commitHeader(state);
          }
          this.ttyRenderer.render(state);
        }
      });

      // Set up render interval for spinner animation
      this.renderInterval = setInterval(() => {
        if (this.ttyRenderer && !this._isPaused) {
          this.ttyRenderer.render(tuiState.getState());
        }
      }, 100);
    } else {
      this.nonTtyRenderer = new NonTtyRenderer();
      this.unsubscribe = tuiState.subscribe((state) => {
        this.nonTtyRenderer?.render(state);
      });
    }
  }

  /**
   * Stop the TUI and clean up.
   */
  async stop() {
    tuiState.setFinalizing();

    // Give time for final render
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (this.renderInterval) {
      clearInterval(this.renderInterval);
      this.renderInterval = null;
    }

    if (this.ttyRenderer) {
      // Final render to commit completed phases
      this.ttyRenderer.render(tuiState.getState());
      // Clear dynamic content and stop spinner
      this.ttyRenderer.stop();
      // Commit summary using clack note
      const state = tuiState.getState();
      if (state.summary) {
        this.ttyRenderer.commitSummary(state);
      }
      this.ttyRenderer = null;
    }

    if (this.nonTtyRenderer) {
      this.nonTtyRenderer.render(tuiState.getState());
      this.nonTtyRenderer.reset();
      this.nonTtyRenderer = null;
    }

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this._isEnabled = false;
    this._isPaused = false;
  }

  /**
   * Pause the TUI (for external prompts).
   */
  pause() {
    if (!this._isEnabled || this._isPaused) return;
    this._isPaused = true;

    if (this.ttyRenderer) {
      this.ttyRenderer.pause(tuiState.getState());
    }
  }

  /**
   * Resume the TUI after pausing.
   */
  resume() {
    if (!this._isEnabled || !this._isPaused) return;
    this._isPaused = false;

    if (this.isTTY && this.ttyRenderer) {
      this.ttyRenderer.resume();
    }
  }

  setDevTuiActive(active: boolean) {
    this._devTuiActive = active;
  }

  /**
   * Start a guided command session with intro header and left border guide.
   * Use this for simple commands that don't need the full deploy/delete TUI.
   * All subsequent logs, prompts, and spinners will render within the guide.
   */
  intro(title: string) {
    if (!this.isTTY) {
      console.info(`\n● ${title}\n`);
      return;
    }
    this._guidedMode = true;
    setSpinnerGuidedMode(true);
    clackUpdateSettings({ withGuide: true });
    // Custom intro with cyan dot indicator
    process.stdout.write(`${this.colorize('cyan', S_BAR_START)}  ${title}\n`);
  }

  /**
   * End a guided command session with outro message.
   * Shows a green checkmark to indicate success.
   * Resets the guide mode.
   */
  outro(message?: string) {
    if (!this.isTTY) {
      if (message) console.info(`\n✓ ${message}\n`);
      return;
    }
    // Custom outro with green checkmark
    const checkmark = this.colorize('green', '✓');
    const outroMessage = message ? `${checkmark} ${message}` : '';
    process.stdout.write(`${this.colorize('gray', S_BAR)}\n${this.colorize('green', S_BAR_END)}  ${outroMessage}\n`);
    this._guidedMode = false;
    setSpinnerGuidedMode(false);
    clackUpdateSettings({ withGuide: false });
  }

  // ─── Spinners ───

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

  // ─── Logging ───

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

  question(message: string) {
    this.log('question', message);
  }

  announcement(message: string, highlight?: boolean) {
    const formattedMessage = highlight ? `★  ${this.makeBold(message)}` : message;
    this.log('announcement', formattedMessage);
  }

  private log(type: TuiMessageType, message: string) {
    // If TUI is running in TTY mode with an active phase, add to state (will be rendered)
    // For simple commands (no phase), print directly to console
    const hasActivePhase = tuiState.getState().currentPhase !== undefined;
    if (this._isEnabled && this.isTTY && !this._isPaused && hasActivePhase) {
      tuiState.addMessage(type, type, message);
      return;
    }

    // Print to console directly for non-TTY, paused TUI, or no active phase
    if (!this._devTuiActive) {
      this.printToConsole(type, message);
    }
    logCollectorStream.write(message);
  }

  private printToConsole(type: TuiMessageType, message: string) {
    if (this.isTTY) {
      switch (type) {
        case 'info':
          clackLog.message(message, { symbol: this.colorize('cyan', '●') });
          break;
        case 'success':
          clackLog.message(message, { symbol: this.colorize('green', '✓') });
          break;
        case 'error':
          clackLog.message(message, { symbol: this.colorize('red', '✖') });
          break;
        case 'warn':
          clackLog.message(message, { symbol: this.colorize('yellow', '▲') });
          break;
        case 'debug':
          clackLog.message(this.colorize('gray', message), { symbol: this.colorize('gray', '○') });
          break;
        case 'hint':
          clackLog.message(this.colorize('blue', message), { symbol: this.colorize('blue', '●') });
          break;
        case 'question':
          clackLog.message(message, { symbol: this.colorize('cyan', '?') });
          break;
        case 'start':
        case 'announcement':
          clackLog.message(message, { symbol: this.colorize('cyan', '▶') });
          break;
        default:
          clackLog.message(message);
      }
    } else {
      const symbols: Record<TuiMessageType, string> = {
        info: '[i]',
        success: '[+]',
        error: '[x]',
        warn: '[!]',
        debug: '[.]',
        hint: '[?]',
        question: '[?]',
        start: '[>]',
        announcement: '[*]'
      };
      console.info(`${symbols[type] || '[*]'} ${message}`);
    }
  }

  // ─── TUI State Management ───

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

  setHeader(header: TuiDeploymentHeader) {
    tuiState.setHeader(header);
  }

  setPhase(phase: DeploymentPhase) {
    tuiState.setCurrentPhase(phase);
  }

  finishPhase() {
    tuiState.finishCurrentPhase();
  }

  startEvent(params: {
    eventType: LoggableEventType;
    description: string;
    phase?: DeploymentPhase;
    parentEventType?: LoggableEventType;
    instanceId?: string;
  }) {
    tuiState.startEvent(params);
  }

  updateEvent(params: {
    eventType: LoggableEventType;
    additionalMessage?: string;
    description?: string;
    parentEventType?: LoggableEventType;
    instanceId?: string;
  }) {
    tuiState.updateEvent(params);
  }

  finishEvent(params: {
    eventType: LoggableEventType;
    finalMessage?: string;
    data?: Record<string, any>;
    parentEventType?: LoggableEventType;
    instanceId?: string;
    status?: TuiEventStatus;
  }) {
    tuiState.finishEvent(params);
  }

  appendEventOutput(params: { eventType: LoggableEventType; lines: string[]; instanceId?: string }) {
    tuiState.appendEventOutput(params);
  }

  setComplete(success: boolean, message: string, links: TuiLink[] = [], consoleUrl?: string) {
    tuiState.setComplete(success, message, links, consoleUrl);
  }

  setPendingCompletion(params: { success: boolean; message: string; links: TuiLink[]; consoleUrl?: string }) {
    tuiState.setPendingCompletion(params);
  }

  commitPendingCompletion() {
    tuiState.commitPendingCompletion();
  }

  // ─── Cancel Deployment ───

  setCancelDeployment(cancelDeployment: TuiCancelDeployment) {
    tuiState.setCancelDeployment(cancelDeployment);
  }

  updateCancelDeployment(updates: Partial<TuiCancelDeployment>) {
    tuiState.updateCancelDeployment(updates);
  }

  clearCancelDeployment() {
    tuiState.clearCancelDeployment();
  }

  // ─── Prompts ───

  async promptSelect(config: { message: string; options: TuiSelectOption[]; defaultValue?: string }): Promise<string> {
    // Pause TUI while prompting
    const wasRunning = this._isEnabled && this.isTTY;
    if (wasRunning) this.pause();

    try {
      if (!this.promptManager) {
        this.promptManager = new PromptManager(this.colorize.bind(this), this.isTTY);
      }
      const result = await this.promptManager.select(config);

      // Log selection only in non-TTY mode (clack already renders it in TTY)
      if (!this.isTTY) {
        const selectedOption = config.options.find((o) => o.value === result);
        console.info(
          `${this.colorize('cyan', 'ℹ')} ${config.message} ${this.colorize('cyan', selectedOption?.label || result)}`
        );
      }

      return result;
    } finally {
      if (wasRunning) this.resume();
    }
  }

  async promptMultiSelect(config: {
    message: string;
    options: TuiSelectOption[];
    defaultValues?: string[];
  }): Promise<string[]> {
    const wasRunning = this._isEnabled && this.isTTY;
    if (wasRunning) this.pause();

    try {
      if (!this.promptManager) {
        this.promptManager = new PromptManager(this.colorize.bind(this), this.isTTY);
      }
      const result = await this.promptManager.multiSelect(config);

      if (!this.isTTY) {
        const selectedLabels = result.map((v) => config.options.find((o) => o.value === v)?.label || v).join(', ');
        console.info(
          `${this.colorize('cyan', 'ℹ')} ${config.message} ${this.colorize('cyan', selectedLabels || '(none)')}`
        );
      }

      return result;
    } finally {
      if (wasRunning) this.resume();
    }
  }

  async promptConfirm(config: { message: string; defaultValue?: boolean }): Promise<boolean> {
    const wasRunning = this._isEnabled && this.isTTY;
    if (wasRunning) this.pause();

    try {
      if (!this.promptManager) {
        this.promptManager = new PromptManager(this.colorize.bind(this), this.isTTY);
      }
      const result = await this.promptManager.confirm(config);

      if (!this.isTTY) {
        const answer = result ? this.colorize('green', 'Yes') : this.colorize('red', 'No');
        console.info(`${this.colorize('cyan', 'ℹ')} ${config.message} ${answer}`);
      }

      return result;
    } finally {
      if (wasRunning) this.resume();
    }
  }

  async promptText(config: {
    message: string;
    placeholder?: string;
    isPassword?: boolean;
    description?: string;
    defaultValue?: string;
  }): Promise<string> {
    const wasRunning = this._isEnabled && this.isTTY;
    if (wasRunning) this.pause();

    try {
      if (!this.promptManager) {
        this.promptManager = new PromptManager(this.colorize.bind(this), this.isTTY);
      }
      const result = await this.promptManager.text(config);

      if (!this.isTTY) {
        const displayValue = config.isPassword ? '*'.repeat(result.length) : result;
        console.info(`${this.colorize('cyan', 'ℹ')} ${config.message} ${this.colorize('cyan', displayValue)}`);
      }

      return result;
    } finally {
      if (wasRunning) this.resume();
    }
  }

  // ─── Formatting Helpers ───

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
    return this.colorize('yellow', `stacktape ${command}`);
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

  // ─── Error Display ───

  error(error: UnexpectedError | ExpectedError) {
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

  displayError(errorData: ErrorDisplayData) {
    tuiState.markAllRunningAsErrored();

    // Final render to commit errored phases before stopping
    if (this.ttyRenderer) {
      this.ttyRenderer.render(tuiState.getState());
      this.ttyRenderer.stop();
      this.ttyRenderer = null;
    }
    if (this.renderInterval) {
      clearInterval(this.renderInterval);
      this.renderInterval = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this._isEnabled = false;
    this._isPaused = false;

    if (this.isTTY) {
      this.displayErrorWithClack(errorData);
    } else {
      const errorString = renderErrorToString(errorData, this.colorize.bind(this), this.makeBold.bind(this));
      console.error(errorString);
    }

    logCollectorStream.write(`[${errorData.errorType}] ${errorData.message}`);
  }

  private displayErrorWithClack(errorData: ErrorDisplayData) {
    const typeLabel = errorData.isExpected === false ? 'Unexpected Error' : this.getErrorLabel(errorData.errorType);

    // Error header without box
    console.error('');
    console.error(this.colorize('red', `[x] ${typeLabel}`));
    console.error('');
    console.error(errorData.message);

    // User stack trace (for config errors - shows where in user's code the error occurred)
    if (errorData.userStackTrace) {
      console.error('');
      console.error(this.makeBold('Stack trace in your code:'));
      console.error(this.colorize('cyan', errorData.userStackTrace));
    }

    // Hints
    const hints = errorData.hints || [];
    if (hints.length > 0) {
      console.error('');
      console.error(this.makeBold('Hints:'));
      for (const hint of hints) {
        console.error(`  ${this.colorize('gray', '→')} ${hint}`);
      }
    }

    // Stack trace (internal)
    if (errorData.stackTrace) {
      console.error('');
      console.error(this.makeBold('Stack trace:'));
      console.error(this.colorize('gray', errorData.stackTrace));
    }

    // Error ID
    if (errorData.sentryEventId) {
      console.error('');
      console.error(this.colorize('gray', `Error ID: ${errorData.sentryEventId}`));
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

  // ─── Special Output ───

  printStacktapeLog(stacktapeLog: { type: string; data: Record<string, any> }) {
    const message = { ...stacktapeLog, timestamp: Date.now() };
    if (process.env[INVOKED_FROM_ENV_VAR_NAME] === 'sdk') {
      process.send?.(message);
    } else if (stacktapeLog.type === 'ERROR') {
      console.error(message);
    } else {
      console.info(message);
    }
    logCollectorStream.write(message);
  }

  printTable({ header, rows }: { header: string[]; rows: string[][] }) {
    this.printAsciiTable(header, rows);
  }

  printLines(lines: string[]) {
    for (const line of lines) {
      console.info(line);
      logCollectorStream.write(line);
    }
  }

  private printAsciiTable(header: string[], rows: string[][]) {
    const widths = header.map((h) => stripAnsi(h).length);
    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        const cellLength = stripAnsi(row[i] || '').length;
        if (cellLength > (widths[i] || 0)) {
          widths[i] = cellLength;
        }
      }
    }

    const horizontalLine = `+${widths.map((w) => '-'.repeat(w + 2)).join('+')}+`;
    const formatRow = (cells: string[]) => {
      const paddedCells = cells.map((cell, i) => {
        const visibleLength = stripAnsi(cell || '').length;
        const padding = (widths[i] || 0) - visibleLength;
        return (cell || '') + ' '.repeat(Math.max(0, padding));
      });
      return `| ${paddedCells.join(' | ')} |`;
    };

    console.info(horizontalLine);
    console.info(formatRow(header));
    console.info(horizontalLine);
    for (const row of rows) {
      console.info(formatRow(row));
    }
    console.info(horizontalLine);

    logCollectorStream.write(horizontalLine);
    logCollectorStream.write(formatRow(header));
    logCollectorStream.write(horizontalLine);
    for (const row of rows) {
      logCollectorStream.write(formatRow(row));
    }
    logCollectorStream.write(horizontalLine);
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

  showNextSteps(steps: NextStep[]) {
    if (this._isEnabled && this.isTTY) {
      this.pause();
    }

    if (this.isTTY) {
      const noteLines: string[] = [];
      steps.forEach((step, index) => {
        let stepLine = `${this.colorize('cyan', `${index + 1}.`)} ${step.text}`;
        if (step.command) stepLine += ` ${step.command}`;
        noteLines.push(stepLine);
        step.details?.forEach((detail) => noteLines.push(`   ${this.colorize('gray', '→')} ${detail}`));
        step.links?.forEach((link) => noteLines.push(`   ${this.colorize('gray', '→')} ${link}`));
      });
      clackNote(noteLines.join('\n'), 'Next steps', { format: (line: string) => line });
    } else {
      const output = renderNextStepsToString(steps, this.colorize.bind(this), this.makeBold.bind(this));
      console.info(output);
    }
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

    clackBox(contentLines.join('\n'), `${this.colorize('green', '✓')} Container ready`, {
      rounded: true,
      width: 'auto',
      titleAlign: 'left',
      contentAlign: 'left'
    });
  }

  printWhoami({
    user,
    organization,
    connectedAwsAccounts,
    projects
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
  }) {
    const lines: string[] = [];

    lines.push(this.makeBold('User'));
    lines.push(`  Name: ${this.colorize('cyan', user.name || 'N/A')}`);
    lines.push(`  Email: ${this.colorize('cyan', user.email || 'N/A')}`);
    lines.push(`  ID: ${this.colorize('gray', user.id)}`);
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
      console.info(this.colorize('gray', 'No projects found.'));
      return;
    }

    for (const project of projects) {
      console.info(this.makeBold(`Project: ${this.colorize('cyan', project.name)}`));

      if (project.stages.length === 0 && project.undeployedStages.length === 0) {
        console.info(`  ${this.colorize('gray', 'No stages')}`);
        console.info('');
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
        this.printTable({ header, rows });
      }

      if (project.undeployedStages.length > 0) {
        console.info(
          `  ${this.colorize('gray', 'Undeployed stages:')} ${project.undeployedStages.map((s) => s.name).join(', ')}`
        );
      }

      console.info('');
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
      console.info(this.colorize('gray', 'No operations found.'));
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

    this.printTable({ header, rows });

    const failedOps = operations.filter((op) => op.success === false && op.description);
    if (failedOps.length > 0) {
      console.info('');
      console.info(this.makeBold('Error Details:'));
      for (const op of failedOps) {
        console.info(`  ${this.colorize('red', `[${op.command}]`)} ${op.projectName}-${op.stage}:`);
        const descLines = (op.description || '').split('\n').slice(0, 5);
        for (const line of descLines) {
          console.info(`    ${this.colorize('gray', line)}`);
        }
        if ((op.description || '').split('\n').length > 5) {
          console.info(`    ${this.colorize('gray', '...(truncated)')}`);
        }
      }
    }
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
