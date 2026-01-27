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
import ci from 'ci-info';
import kleur from 'kleur';
import terminalLink from 'terminal-link';
import { renderErrorToString, renderNextStepsToString, renderStackErrorsToString } from './non-tty-renderer';
import { PromptManager } from './prompts';
import { NonTtyRenderer, TtyRenderer } from './renderer';
import { createSpinner, createSpinnerProgressLogger, MultiSpinner } from './spinners';
import { tuiState } from './state';
import { formatDuration, stripAnsi } from './utils';

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
  private _devTuiActive = false;
  private logFormat: LogFormat = 'fancy';
  private logLevel: LogLevel = 'info';

  constructor() {
    this.isTTY = process.stdout.isTTY && !ci.isCI;
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

  // ─── Lifecycle ───

  init(options: { logFormat?: LogFormat; logLevel?: LogLevel } = {}) {
    this.logFormat = options.logFormat || 'fancy';
    this.logLevel = options.logLevel || 'info';
    this.isTTY = process.stdout.isTTY && !ci.isCI && this.logFormat === 'fancy';
    this.promptManager = new PromptManager(this.colorize.bind(this), this.isTTY);
  }

  /**
   * Start the TUI for deploy/delete commands.
   * Uses log-update for TTY, plain console for non-TTY.
   */
  start() {
    if (this.logFormat === 'json' || this.logFormat === 'basic') {
      return;
    }

    this._isEnabled = true;
    this._wasEverStarted = true;
    tuiState.reset();

    if (this.isTTY) {
      this.ttyRenderer = new TtyRenderer(this.colorize.bind(this), this.makeBold.bind(this));
      this.ttyRenderer.start();

      // Subscribe to state changes and re-render
      this.unsubscribe = tuiState.subscribe((state) => {
        this.ttyRenderer?.render(state);
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
      this.ttyRenderer.render(tuiState.getState());
      this.ttyRenderer.stop();
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
      this.ttyRenderer.stop();
    }
  }

  /**
   * Resume the TUI after pausing.
   */
  resume() {
    if (!this._isEnabled || !this._isPaused) return;
    this._isPaused = false;

    if (this.isTTY && this.ttyRenderer) {
      this.ttyRenderer.start();
    }
  }

  setDevTuiActive(active: boolean) {
    this._devTuiActive = active;
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

  announcement(message: string, highlight?: boolean) {
    const formattedMessage = highlight ? `★  ${this.makeBold(message)}` : message;
    this.log('announcement', formattedMessage);
  }

  private log(type: TuiMessageType, message: string) {
    // If TUI is running in TTY mode, add to state (will be rendered)
    if (this._isEnabled && this.isTTY && !this._isPaused) {
      tuiState.addMessage(type, type, message);
      return;
    }

    // Otherwise print to console directly (unless DevTui is handling output)
    if (!this._devTuiActive) {
      this.printToConsole(type, message);
    }
    logCollectorStream.write(message);
  }

  private printToConsole(type: TuiMessageType, message: string) {
    const symbols: Record<TuiMessageType, { symbol: string; color: string }> = {
      info: { symbol: 'ℹ', color: 'cyan' },
      success: { symbol: '✓', color: 'green' },
      error: { symbol: '✖', color: 'red' },
      warn: { symbol: '⚠', color: 'yellow' },
      debug: { symbol: '⚙', color: 'gray' },
      hint: { symbol: '💡', color: 'blue' },
      start: { symbol: '▶', color: 'magenta' },
      announcement: { symbol: '★', color: 'magenta' }
    };
    const { symbol, color } = symbols[type];
    const coloredSymbol = this.colorize(color, symbol);
    console.info(`${coloredSymbol} ${message}`);
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

      // Log the selection
      const selectedOption = config.options.find((o) => o.value === result);
      console.info(
        `${this.colorize('cyan', 'ℹ')} ${config.message} ${this.colorize('cyan', selectedOption?.label || result)}`
      );

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

      const selectedLabels = result.map((v) => config.options.find((o) => o.value === v)?.label || v).join(', ');
      console.info(
        `${this.colorize('cyan', 'ℹ')} ${config.message} ${this.colorize('cyan', selectedLabels || '(none)')}`
      );

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

      const answer = result ? this.colorize('green', 'Yes') : this.colorize('red', 'No');
      console.info(`${this.colorize('cyan', 'ℹ')} ${config.message} ${answer}`);

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

      const displayValue = config.isPassword ? '*'.repeat(result.length) : result;
      console.info(`${this.colorize('cyan', 'ℹ')} ${config.message} ${this.colorize('cyan', displayValue)}`);

      return result;
    } finally {
      if (wasRunning) this.resume();
    }
  }

  // ─── Formatting Helpers ───

  colorize(color: string, text: string): string {
    if (this.logFormat !== 'fancy') return text;
    return (kleur[color as keyof typeof kleur] as (text: string) => string)?.(text) ?? text;
  }

  makeBold(text: string | number): string {
    if (this.logFormat !== 'fancy') return text.toString();
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
    const underlined = this.logFormat === 'fancy' ? kleur.underline(relativePath) : relativePath;
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
      sentryEventId: sentryEventId || undefined,
      isExpected: error.isExpected
    };

    if (this.logFormat === 'json') {
      this.printStacktapeLog({
        type: 'ERROR',
        data: { errorType, message: errorMessage, reportedErrorId: sentryEventId, stack: prettyStackTrace }
      });
    } else {
      this.displayError(errorData);
    }
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

    const errorString = renderErrorToString(errorData, this.colorize.bind(this), this.makeBold.bind(this));
    console.error(errorString);

    logCollectorStream.write(`[${errorData.errorType}] ${errorData.message}`);
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
    if (this.logFormat === 'json') {
      this.printStacktapeLog({ type: 'TABLE', data: { header, rows } });
      return;
    }
    this.printAsciiTable(header, rows);
  }

  printLines(lines: string[]) {
    if (this.logFormat === 'json') {
      this.printStacktapeLog({ type: 'TEXT', data: { lines } });
      return;
    }

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
    if (this.logFormat === 'json') {
      this.printStacktapeLog({ type: 'NEXT_STEPS', data: { steps } });
      return;
    }

    if (this._isEnabled && this.isTTY) {
      this.pause();
    }
    const output = renderNextStepsToString(steps, this.colorize.bind(this), this.makeBold.bind(this));
    console.info(output);
  }

  printDevContainerReady({ ports, isWatchMode }: { ports: number[]; isWatchMode: boolean }) {
    const boxWidth = 50;
    const horizontalLine = '─'.repeat(boxWidth - 2);
    const topBorder = `┌${horizontalLine}┐`;
    const bottomBorder = `└${horizontalLine}┘`;

    const padLine = (content: string, rawContent: string) => {
      const padding = boxWidth - 4 - rawContent.length;
      return `│ ${content}${' '.repeat(Math.max(0, padding))} │`;
    };

    const title = `${this.colorize('green', '✓')} Container ready`;
    const titleRaw = '✓ Container ready';

    const hint = isWatchMode
      ? 'Watching for file changes'
      : `Type '${this.makeBold('rs + enter')}' to rebuild and restart`;
    const hintRaw = isWatchMode ? 'Watching for file changes' : "Type 'rs + enter' to rebuild and restart";

    const lines = [topBorder, padLine(title, titleRaw)];

    if (ports.length > 0) {
      const portsLabel = 'Ports:';
      lines.push(padLine(portsLabel, portsLabel));
      for (const port of ports) {
        const url = `http://localhost:${port}`;
        const urlColored = this.colorize('cyan', url);
        lines.push(padLine(`  ${urlColored}`, `  ${url}`));
      }
    }

    lines.push(padLine(hint, hintRaw));
    lines.push(bottomBorder);

    console.info(lines.join('\n'));
  }
}

export const tuiManager = new TuiManager();
export { TuiManager };
