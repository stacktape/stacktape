import type { ExpectedError, UnexpectedError } from '@utils/errors';
import type { CliRenderer } from '@opentui/core';
import type { Root } from '@opentui/react';
import type { ErrorDisplayData, NextStep } from './components';
import type {
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
import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import kleur from 'kleur';
import React from 'react';
import terminalLink from 'terminal-link';
import { renderErrorToString, renderNextStepsToString, renderStackErrorsToString, renderTableToString, TuiApp } from './components';
import { nonTTYRenderer } from './non-tty-renderer';
import { tuiState } from './state';
import { formatDuration, stripAnsi } from './utils';

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

class TuiManager {
  private openTuiRenderer: CliRenderer | null = null;
  private openTuiRoot: Root | null = null;
  private openTuiMountPromise: Promise<void> | null = null;
  private isTTY: boolean;
  private _isEnabled: boolean = false;
  private _isPaused: boolean = false;
  private logFormat: LogFormat = 'fancy';
  private logLevel: LogLevel = 'info';
  private nonTTYUnsubscribe: (() => void) | null = null;

  constructor() {
    this.isTTY = process.stdout.isTTY && !ci.isCI;
  }

  get enabled(): boolean {
    return this._isEnabled;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  init(options: { logFormat?: LogFormat; logLevel?: LogLevel } = {}) {
    this.logFormat = options.logFormat || 'fancy';
    this.logLevel = options.logLevel || 'info';
    this.isTTY = process.stdout.isTTY && !ci.isCI && this.logFormat === 'fancy';
  }

  start() {
    if (this.logFormat === 'json' || this.logFormat === 'basic') {
      return;
    }

    this._isEnabled = true;
    tuiState.reset();

    if (this.isTTY) {
      void this.mountOpenTui();
    } else {
      this.startNonTtyRenderer();
    }
  }

  /**
   * Temporarily pause the TUI to allow external tools (like prompts) to use the terminal.
   * Call resume() when done with external terminal operations.
   */
  pause() {
    if (!this._isEnabled || this._isPaused) return;
    this._isPaused = true;

    if (this.openTuiRenderer) {
      void this.unmountOpenTui();
    }
  }

  /**
   * Resume the TUI after it was paused.
   */
  resume() {
    if (!this._isEnabled || !this._isPaused) return;
    this._isPaused = false;

    if (this.isTTY) {
      void this.mountOpenTui();
    }
  }

  private startNonTtyRenderer = () => {
    if (this.nonTTYUnsubscribe) return;
    this.nonTTYUnsubscribe = tuiState.subscribe((state) => {
      nonTTYRenderer.render(state);
    });
    nonTTYRenderer.render(tuiState.getState());
  };

  private mountOpenTui = async () => {
    if (this.openTuiMountPromise) {
      return this.openTuiMountPromise;
    }

    const mountPromise = (async () => {
      try {
        if (this.openTuiRenderer) return;
        process.env.OTUI_OVERRIDE_STDOUT = 'false';
        process.env.OTUI_USE_CONSOLE = 'false';

        const renderer = await createCliRenderer({
          useConsole: false,
          useAlternateScreen: false,
          useMouse: false
        });

        if (!this._isEnabled || this._isPaused || !this.isTTY) {
          renderer.destroy();
          return;
        }

        this.openTuiRenderer = renderer;
        this.openTuiRoot = createRoot(renderer);
        this.openTuiRoot.render(React.createElement(TuiApp, { isTTY: true }));
      } catch (error) {
        console.error(error);
        this.isTTY = false;
        this.startNonTtyRenderer();
      }
    })();

    this.openTuiMountPromise = mountPromise;
    try {
      await mountPromise;
    } finally {
      if (!this.openTuiRenderer) {
        this.openTuiMountPromise = null;
      }
    }

    return mountPromise;
  };

  private unmountOpenTui = async () => {
    if (this.openTuiMountPromise) {
      await this.openTuiMountPromise;
    }

    if (this.openTuiRoot) {
      this.openTuiRoot.unmount();
      this.openTuiRoot = null;
    }

    if (this.openTuiRenderer) {
      this.openTuiRenderer.destroy();
      this.openTuiRenderer = null;
    }

    this.openTuiMountPromise = null;
  };

  /**
   * Show a select prompt using OpenTUI-based Select component.
   * In non-interactive mode, uses defaultValue if provided, otherwise throws.
   */
  async promptSelect(config: { message: string; options: TuiSelectOption[]; defaultValue?: string }): Promise<string> {
    // For non-interactive mode, use default value or throw
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

    // Use OpenTUI-based Select component
    const result = await new Promise<string>((resolve) => {
      const resolveAndClear = (value: string) => {
        tuiState.clearActivePrompt();
        // Defer resolve to next tick to ensure React unmounts the old component first
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

    // Show selected value
    const selectedOption = config.options.find((o) => o.value === result);
    this.info(`${config.message} ${this.colorize('cyan', selectedOption?.label || result)}`);

    return result;
  }

  /**
   * Show a confirm prompt using OpenTUI-based confirm component.
   * In non-interactive mode, uses defaultValue if provided, otherwise throws.
   */
  async promptConfirm(config: { message: string; defaultValue?: boolean }): Promise<boolean> {
    // For non-interactive mode, use default value or throw
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
        // Defer resolve to next tick to ensure React unmounts the old component first
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

    // Show confirmation result
    const answer = result ? this.colorize('green', 'Yes') : this.colorize('red', 'No');
    this.info(`${config.message} ${answer}`);

    return result;
  }

  /**
   * Show a text input prompt using OpenTUI-based text input component.
   * In non-interactive mode, uses defaultValue if provided, otherwise throws.
   */
  async promptText(config: {
    message: string;
    placeholder?: string;
    isPassword?: boolean;
    /** Description shown in gray next to the question */
    description?: string;
    defaultValue?: string;
  }): Promise<string> {
    // For non-interactive mode, use default value or throw
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

    // Use OpenTUI-based text input component
    const result = await new Promise<string>((resolve) => {
      const resolveAndClear = (value: string) => {
        tuiState.clearActivePrompt();
        // Defer resolve to next tick to ensure React unmounts the old component first
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

    // Show entered value (masked for passwords)
    const displayValue = config.isPassword ? '*'.repeat(result.length) : result;
    this.info(`${config.message} ${this.colorize('cyan', displayValue)}`);

    return result;
  }

  async stop() {
    if (this.openTuiMountPromise) {
      await this.openTuiMountPromise;
    }
    if (this.openTuiRenderer) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await this.unmountOpenTui();
    if (this.nonTTYUnsubscribe) {
      this.nonTTYUnsubscribe();
      this.nonTTYUnsubscribe = null;
    }
    this._isEnabled = false;
    this._isPaused = false;
    nonTTYRenderer.reset();
  }

  /**
   * Configure TUI for delete command with simplified phases (Initialize, Delete).
   * Call this before setHeader for delete operations.
   */
  configureForDelete() {
    tuiState.configureForDelete();
  }

  /**
   * Configure phases for codebuild:deploy command.
   * Call this before setHeader for codebuild deploy operations.
   */
  configureForCodebuildDeploy() {
    tuiState.configureForCodebuildDeploy();
  }

  /**
   * Enable/disable streaming mode. When enabled, hides dynamic TUI rendering
   * to allow console.log output (e.g., cloudwatch log streaming).
   */
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

  warn(message: string) {
    this.writeWarn('warn', message);
  }

  setComplete(success: boolean, message: string, links: TuiLink[] = [], consoleUrl?: string) {
    tuiState.setComplete(success, message, links, consoleUrl);
  }

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

  // ============================================================
  // Named Message Methods
  // ============================================================

  /**
   * Write a message with a semantic name identifier.
   * The name will be used later to create specialized React components.
   */
  write(name: string, message: string, data?: Record<string, any>) {
    this.writeMessage(name, 'info', message, data);
  }

  writeInfo(name: string, message: string, data?: Record<string, any>) {
    this.writeMessage(name, 'info', message, data);
  }

  writeSuccess(name: string, message: string, data?: Record<string, any>) {
    this.writeMessage(name, 'success', message, data);
  }

  writeError(name: string, message: string, data?: Record<string, any>) {
    this.writeMessage(name, 'error', message, data);
  }

  writeWarn(name: string, message: string, data?: Record<string, any>) {
    this.writeMessage(name, 'warn', message, data);
  }

  writeDebug(name: string, message: string, data?: Record<string, any>) {
    if (this.logLevel !== 'debug') return;
    this.writeMessage(name, 'debug', message, data);
  }

  writeHint(name: string, message: string, data?: Record<string, any>) {
    this.writeMessage(name, 'hint', message, data);
  }

  writeStart(name: string, message: string, data?: Record<string, any>) {
    this.writeMessage(name, 'start', message, data);
  }

  writeAnnouncement(name: string, message: string, data?: Record<string, any>) {
    this.writeMessage(name, 'announcement', message, data);
  }

  private writeMessage(name: string, type: TuiMessageType, message: string, data?: Record<string, any>) {
    // When paused or not using the TUI, print directly to console
    if (this._isPaused || !this.isTTY || !this._isEnabled) {
      this.printMessageToConsole(type, message);
      logCollectorStream.write(message);
      return;
    }
    tuiState.addMessage(name, type, message, data);
  }

  private printMessageToConsole(type: TuiMessageType, message: string) {
    const symbols: Record<TuiMessageType, { symbol: string; color: string }> = {
      info: { symbol: 'i', color: 'cyan' },
      success: { symbol: '+', color: 'green' },
      error: { symbol: 'x', color: 'red' },
      warn: { symbol: '!', color: 'yellow' },
      debug: { symbol: 'd', color: 'gray' },
      hint: { symbol: '?', color: 'blue' },
      start: { symbol: '>', color: 'magenta' },
      announcement: { symbol: '*', color: 'magenta' }
    };
    const { symbol, color } = symbols[type];
    const coloredSymbol = this.colorize(color, symbol);
    console.info(`${coloredSymbol} ${message}`);
  }

  // Simple logging methods that delegate to write* methods
  info(message: string) {
    this.writeInfo('info', message);
  }

  debug(message: string) {
    if (this.logLevel !== 'debug') return;
    this.writeDebug('debug', message);
  }

  success(message: string) {
    this.writeSuccess('success', message);
  }

  hint(message: string) {
    this.writeHint('hint', message);
  }

  announcement(message: string, highlight?: boolean) {
    const formattedMessage = highlight ? `*  ${this.makeBold(message)}` : message;
    this.writeAnnouncement('announcement', formattedMessage);
  }

  // ============================================================
  // Formatting Helpers
  // ============================================================

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
    // Apply whitespace padding to each line if needed
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
  // Error Handling
  // ============================================================

  /**
   * Print a structured error with optional hints and stack trace.
   * Handles both ExpectedError and UnexpectedError types.
   * Uses the ErrorDisplay React component for TTY mode.
   */
  error(error: UnexpectedError | ExpectedError) {
    const { hint } = error as ExpectedError;
    const { prettyStackTrace, errorType, sentryEventId } = error.details;

    const errorMessage =
      !IS_DEV && !error.isExpected
        ? `An unexpected error occurred. Last captured event: ${eventManager.lastEvent?.eventType || '-'}.`
        : error.message;

    // Prepare hints array
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

  /**
   * Display an error. Errors are terminal events, so this stops the TUI
   * and renders directly to console.
   */
  displayError(errorData: ErrorDisplayData) {
    // Mark all running events as errored to show red X in the UI
    tuiState.markAllRunningAsErrored();

    // Stop the TUI if running - errors are terminal events
    if (this.openTuiRoot) {
      this.openTuiRoot.unmount();
      this.openTuiRoot = null;
    }
    if (this.openTuiRenderer) {
      this.openTuiRenderer.destroy();
      this.openTuiRenderer = null;
    }
    this.openTuiMountPromise = null;
    this._isEnabled = false;
    this._isPaused = false;

    // Always render to console for errors (not through TUI)
    const errorString = renderErrorToString(errorData, this.colorize.bind(this), this.makeBold.bind(this));
    console.error(errorString);

    // Log to collector
    logCollectorStream.write(`[${errorData.errorType}] ${errorData.message}`);
  }

  /**
   * Print a structured log message (used for SDK mode and JSON logging).
   */
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

  // ============================================================
  // Table Output
  // ============================================================

  /**
   * Print a table with headers and rows.
   * For TTY mode, renders a styled table string.
   * For non-TTY mode, renders ASCII table.
   */
  printTable({ header, rows }: { header: string[]; rows: string[][] }) {
    if (this.logFormat === 'json') {
      this.printStacktapeLog({ type: 'TABLE', data: { header, rows } });
      return;
    }

    if (this.isTTY && this.logFormat === 'fancy') {
      if (this._isEnabled && this.isTTY) {
        this.pause();
      }
      const tableOutput = renderTableToString({ header: header.map((cell) => this.makeBold(cell)), rows });
      console.info(tableOutput);
      logCollectorStream.write(tableOutput);
    } else {
      // Render ASCII table for non-TTY
      this.printAsciiTable(header, rows);
    }
  }

  /**
   * Render an ASCII table for non-TTY output
   */
  private printAsciiTable(header: string[], rows: string[][]) {
    // Calculate column widths
    const widths = header.map((h) => stripAnsi(h).length);
    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        const cellLength = stripAnsi(row[i] || '').length;
        if (cellLength > (widths[i] || 0)) {
          widths[i] = cellLength;
        }
      }
    }

    // Build table
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

    // Also log to collector
    logCollectorStream.write(horizontalLine);
    logCollectorStream.write(formatRow(header));
    logCollectorStream.write(horizontalLine);
    for (const row of rows) {
      logCollectorStream.write(formatRow(row));
    }
    logCollectorStream.write(horizontalLine);
  }

  /**
   * Print stack list in a formatted table.
   * Mirrors the printer.printListStack functionality.
   */
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

  // ============================================================
  // Next Steps Output
  // ============================================================

  /**
   * Print next steps in a formatted list.
   * Uses console.info to avoid clearing previous terminal output.
   */
  showNextSteps(steps: NextStep[]) {
    if (this.logFormat === 'json') {
      this.printStacktapeLog({ type: 'NEXT_STEPS', data: { steps } });
      return;
    }

    // Always use console.info to avoid clearing previous output
    // (creating a new TUI instance would overwrite previous terminal content)
    if (this._isEnabled && this.isTTY) {
      this.pause();
    }
    const output = renderNextStepsToString(steps, this.colorize.bind(this), this.makeBold.bind(this));
    console.info(output);
  }
}

export const tuiManager = new TuiManager();
export { TuiManager };
