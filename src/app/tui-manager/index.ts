import type { ExpectedError, UnexpectedError } from '@utils/errors';
import type { Instance } from 'ink';
import type { ErrorDisplayData, NextStep } from './components';
import type {
  TuiCancelDeployment,
  TuiDeploymentHeader,
  TuiEventStatus,
  TuiLink,
  TuiMessageType,
  TuiPromptConfirm,
  TuiPromptSelect,
  TuiPromptText,
  TuiSelectOption
} from './types';
import { eventManager } from '@application-services/event-manager';
import { INVOKED_FROM_ENV_VAR_NAME, IS_DEV, linksMap } from '@config';
import { getRelativePath, transformToUnixPath } from '@shared/utils/fs-utils';
import { logCollectorStream } from '@utils/log-collector';
import ci from 'ci-info';
import { render } from 'ink';
import kleur from 'kleur';
import React from 'react';
import terminalLink from 'terminal-link';
import { renderErrorToString, renderNextStepsToString, renderStackErrorsToString, Table, TuiApp } from './components';
import { nonTTYRenderer } from './non-tty-renderer';
import { createSpinner, createSpinnerProgressLogger, MultiSpinner } from './spinners';
import { tuiState } from './state';
import { formatDuration, stripAnsi } from './utils';

export { tuiState } from './state';
export type { Spinner } from './spinners';
export { MultiSpinner } from './spinners';
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

/**
 * TuiManager handles all terminal output for Stacktape CLI.
 *
 * It operates in two modes:
 * 1. **TUI mode** (deploy/delete): Full Ink-based UI with phases, events, and progress
 * 2. **Standalone mode** (dev): Simple spinners and console output without Ink
 *
 * Use `tuiManager.start()` to enable TUI mode (for deploy/delete commands).
 * For dev mode, use spinners directly without starting the TUI.
 */
class TuiManager {
  private inkInstance: Instance | null = null;
  private isTTY: boolean;
  private _isEnabled: boolean = false;
  private _isPaused: boolean = false;
  private logFormat: LogFormat = 'fancy';
  private logLevel: LogLevel = 'info';
  private nonTTYUnsubscribe: (() => void) | null = null;
  /**
   * Tracks whether TUI was ever started this session.
   * Used to prevent printProgress() fallback after TUI stops, since events were already displayed.
   */
  private _wasEverStarted: boolean = false;

  constructor() {
    this.isTTY = process.stdout.isTTY && !ci.isCI;
  }

  get enabled(): boolean {
    return this._isEnabled;
  }

  /** Returns true if TUI was started at some point (even if now stopped). */
  get wasEverStarted(): boolean {
    return this._wasEverStarted;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  init(options: { logFormat?: LogFormat; logLevel?: LogLevel } = {}) {
    this.logFormat = options.logFormat || 'fancy';
    this.logLevel = options.logLevel || 'info';
    this.isTTY = process.stdout.isTTY && !ci.isCI && this.logFormat === 'fancy';
  }

  /** Start the TUI (Ink-based UI). Call this for deploy/delete commands. */
  start() {
    if (this.logFormat === 'json' || this.logFormat === 'basic') {
      return;
    }

    this._isEnabled = true;
    this._wasEverStarted = true;
    tuiState.reset();

    if (this.isTTY) {
      console.info('');
      this.inkInstance = render(React.createElement(TuiApp, { isTTY: true }), {
        patchConsole: false
      });
    } else {
      this.nonTTYUnsubscribe = tuiState.subscribe((state) => {
        nonTTYRenderer.render(state);
      });
    }
  }

  /** Stop the TUI and clean up. */
  async stop() {
    tuiState.setFinalizing();

    const instance = this.inkInstance;
    if (instance) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      instance.unmount();
      this.inkInstance = null;
    }
    if (this.nonTTYUnsubscribe) {
      nonTTYRenderer.render(tuiState.getState());
      this.nonTTYUnsubscribe();
      this.nonTTYUnsubscribe = null;
    }
    this._isEnabled = false;
    this._isPaused = false;
    nonTTYRenderer.reset();
  }

  /** Temporarily pause the TUI (e.g., for external prompts). */
  pause() {
    if (!this._isEnabled || this._isPaused) return;
    this._isPaused = true;

    if (this.inkInstance) {
      this.inkInstance.unmount();
      this.inkInstance = null;
    }
  }

  /** Resume the TUI after pausing. */
  resume() {
    if (!this._isEnabled || !this._isPaused) return;
    this._isPaused = false;

    if (this.isTTY) {
      this.inkInstance = render(React.createElement(TuiApp, { isTTY: true }), {
        patchConsole: false
      });
    }
  }

  // ============================================================
  // Spinners (for dev mode / standalone operations)
  // ============================================================

  /**
   * Create a single spinner for tracking one async operation.
   * Use this in dev mode or for standalone progress indication.
   *
   * @example
   * const spinner = tuiManager.spinner('Loading data');
   * spinner.update('50% complete');
   * spinner.success({ details: 'Loaded 100 items' });
   */
  createSpinner({ text }: { text: string }) {
    return createSpinner(text, this.colorize.bind(this));
  }

  /**
   * Create a multi-spinner for tracking multiple parallel operations.
   * Each spinner renders on its own line without cursor conflicts.
   *
   * @example
   * const multi = tuiManager.multiSpinner();
   * const s1 = multi.add('task1', 'Loading config');
   * const s2 = multi.add('task2', 'Fetching data');
   * s1.success();
   * s2.success({ details: 'Done' });
   */
  createMultiSpinner() {
    return new MultiSpinner(this.colorize.bind(this));
  }

  /**
   * Create a ProgressLogger that forwards events to a spinner.
   * Use this to adapt packaging operations to use spinners.
   */
  createSpinnerProgressLogger(
    spinner: ReturnType<typeof createSpinner>,
    instanceId: string,
    parentEventType: LoggableEventType = 'PACKAGE_ARTIFACTS'
  ) {
    return createSpinnerProgressLogger(spinner, instanceId, parentEventType);
  }

  // ============================================================
  // Simple Logging (works in both TUI and standalone mode)
  // ============================================================

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
    if (this._isPaused || !this.isTTY || !this._isEnabled) {
      this.printToConsole(type, message);
      logCollectorStream.write(message);
      return;
    }
    tuiState.addMessage(type, type, message);
  }

  private printToConsole(type: TuiMessageType, message: string) {
    const symbols: Record<TuiMessageType, { symbol: string; color: string }> = {
      info: { symbol: 'i', color: 'cyan' },
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

  // ============================================================
  // TUI State Management (for deploy/delete commands)
  // ============================================================

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

  // ============================================================
  // Cancel Deployment Banner
  // ============================================================

  /**
   * Show a cancel deployment banner that the user can trigger with 'c' key.
   * Used when a deployment failure is detected (e.g., ECS task failed to start).
   */
  setCancelDeployment(cancelDeployment: TuiCancelDeployment) {
    tuiState.setCancelDeployment(cancelDeployment);
  }

  /**
   * Update the cancel deployment state (e.g., to show cancelling in progress).
   */
  updateCancelDeployment(updates: Partial<TuiCancelDeployment>) {
    tuiState.updateCancelDeployment(updates);
  }

  /**
   * Clear the cancel deployment banner.
   */
  clearCancelDeployment() {
    tuiState.clearCancelDeployment();
  }

  // ============================================================
  // Prompts (interactive input)
  // ============================================================

  async promptSelect(config: { message: string; options: TuiSelectOption[]; defaultValue?: string }): Promise<string> {
    if (!this.isTTY || this.logFormat !== 'fancy' || !this._isEnabled) {
      if (config.defaultValue !== undefined) {
        const selectedOption = config.options.find((o) => o.value === config.defaultValue);
        this.info(`${config.message} ${this.colorize('cyan', selectedOption?.label || config.defaultValue)} (default)`);
        return config.defaultValue;
      }
      throw new Error(
        `Interactive prompt "${config.message}" is not supported in non-interactive mode. Please provide the value via command-line arguments.`
      );
    }

    const result = await new Promise<string>((resolve) => {
      const resolveAndClear = (value: string) => {
        tuiState.clearActivePrompt();
        setTimeout(() => resolve(value), 0);
      };
      const prompt: TuiPromptSelect = {
        type: 'select',
        message: config.message,
        options: config.options,
        resolve: resolveAndClear
      };
      tuiState.setActivePrompt(prompt);
    });

    const selectedOption = config.options.find((o) => o.value === result);
    this.info(`${config.message} ${this.colorize('cyan', selectedOption?.label || result)}`);

    return result;
  }

  async promptConfirm(config: { message: string; defaultValue?: boolean }): Promise<boolean> {
    if (!this.isTTY || this.logFormat !== 'fancy' || !this._isEnabled) {
      if (config.defaultValue !== undefined) {
        const answer = config.defaultValue ? this.colorize('green', 'Yes') : this.colorize('red', 'No');
        this.info(`${config.message} ${answer} (default)`);
        return config.defaultValue;
      }
      throw new Error(
        `Interactive prompt "${config.message}" is not supported in non-interactive mode. Please provide the value via command-line arguments.`
      );
    }

    const result = await new Promise<boolean>((resolve) => {
      let settled = false;

      const resolveOnce = (value: boolean) => {
        if (settled) return;
        settled = true;
        tuiState.clearActivePrompt();
        setTimeout(() => resolve(value), 0);
      };

      const prompt: TuiPromptConfirm = {
        type: 'confirm',
        message: config.message,
        defaultValue: config.defaultValue,
        resolve: resolveOnce
      };
      tuiState.setActivePrompt(prompt);
    });

    const answer = result ? this.colorize('green', 'Yes') : this.colorize('red', 'No');
    this.info(`${config.message} ${answer}`);

    return result;
  }

  async promptText(config: {
    message: string;
    placeholder?: string;
    isPassword?: boolean;
    description?: string;
    defaultValue?: string;
  }): Promise<string> {
    if (!this.isTTY || this.logFormat !== 'fancy' || !this._isEnabled) {
      if (config.defaultValue !== undefined) {
        const displayValue = config.isPassword ? '*'.repeat(config.defaultValue.length) : config.defaultValue;
        this.info(`${config.message} ${this.colorize('cyan', displayValue)} (default)`);
        return config.defaultValue;
      }
      throw new Error(
        `Interactive prompt "${config.message}" is not supported in non-interactive mode. Please provide the value via command-line arguments.`
      );
    }

    const result = await new Promise<string>((resolve) => {
      const resolveAndClear = (value: string) => {
        tuiState.clearActivePrompt();
        setTimeout(() => resolve(value), 0);
      };
      const prompt: TuiPromptText = {
        type: 'text',
        message: config.message,
        placeholder: config.placeholder,
        isPassword: config.isPassword,
        description: config.description,
        defaultValue: config.defaultValue,
        resolve: resolveAndClear
      };
      tuiState.setActivePrompt(prompt);
    });

    const displayValue = config.isPassword ? '*'.repeat(result.length) : result;
    this.info(`${config.message} ${this.colorize('cyan', displayValue)}`);

    return result;
  }

  // ============================================================
  // Formatting Helpers
  // ============================================================

  colorize(color: string, text: string): string {
    if (this.logFormat !== 'fancy') return text;
    return (kleur[color as keyof typeof kleur] as (text: string) => string)?.(text) ?? text;
  }

  makeBold(text: string): string {
    if (this.logFormat !== 'fancy') return text;
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

  // ============================================================
  // Error Display
  // ============================================================

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

    if (this.inkInstance) {
      this.inkInstance.unmount();
      this.inkInstance = null;
    }
    this._isEnabled = false;
    this._isPaused = false;

    const errorString = renderErrorToString(errorData, this.colorize.bind(this), this.makeBold.bind(this));
    console.error(errorString);

    logCollectorStream.write(`[${errorData.errorType}] ${errorData.message}`);
  }

  // ============================================================
  // Special Output (tables, next steps, etc.)
  // ============================================================

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

    if (this.isTTY && this.logFormat === 'fancy') {
      const instance = render(React.createElement(Table, { header, rows }), { patchConsole: false });
      instance.unmount();
    } else {
      this.printAsciiTable(header, rows);
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

  printListStack(listStacksResult: StackListReturnValue) {
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
