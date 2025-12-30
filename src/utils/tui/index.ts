import type { Instance } from 'ink';
import type { ExpectedError, UnexpectedError } from '@utils/errors';
import type { TuiDeploymentHeader, TuiEventStatus, TuiLink, TuiMessageType } from './types';
import { eventManager } from '@application-services/event-manager';
import { IS_DEV, INVOKED_FROM_ENV_VAR_NAME, linksMap } from '@config';
import { getRelativePath, transformToUnixPath } from '@shared/utils/fs-utils';
import { splitStringIntoLines } from '@shared/utils/misc';
import { logCollectorStream } from '@utils/log-collector';
import ci from 'ci-info';
import { render } from 'ink';
import kleur from 'kleur';
import React from 'react';
import terminalLink from 'terminal-link';
import { Table, TuiApp } from './components';
import { nonTTYRenderer } from './non-tty-renderer';
import { tuiState } from './state';
import { formatDuration, stripAnsi } from './utils';

export { tuiState } from './state';
export type { TuiDeploymentHeader, TuiEvent, TuiLink, TuiMessage, TuiPhase, TuiState, TuiSummary, TuiWarning } from './types';

class TuiManager {
  private inkInstance: Instance | null = null;
  private isTTY: boolean;
  private _isEnabled: boolean = false;
  private logFormat: LogFormat = 'fancy';
  private logLevel: LogLevel = 'info';

  constructor() {
    this.isTTY = process.stdout.isTTY && !ci.isCI;
  }

  get enabled(): boolean {
    return this._isEnabled;
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
      this.inkInstance = render(React.createElement(TuiApp, { isTTY: true }), {
        patchConsole: false // Prevent console patching that can cause flickering
      });
      tuiState.subscribe(() => {
        // Ink automatically re-renders on state changes
      });
    } else {
      tuiState.subscribe((state) => {
        nonTTYRenderer.render(state);
      });
    }
  }

  async stop() {
    if (this.inkInstance) {
      // Wait a moment to ensure the final state (including summary) is rendered
      await new Promise((resolve) => setTimeout(resolve, 100));
      this.inkInstance.unmount();
      this.inkInstance = null;
    }
    this._isEnabled = false;
    nonTTYRenderer.reset();
  }

  setHeader(header: TuiDeploymentHeader) {
    if (!this._isEnabled) return;
    tuiState.setHeader(header);
  }

  setPhase(phase: DeploymentPhase) {
    if (!this._isEnabled) return;
    tuiState.setCurrentPhase(phase);
  }

  finishPhase() {
    if (!this._isEnabled) return;
    tuiState.finishCurrentPhase();
  }

  startEvent(params: {
    eventType: LoggableEventType;
    description: string;
    phase?: DeploymentPhase;
    parentEventType?: LoggableEventType;
    instanceId?: string;
  }) {
    if (!this._isEnabled) return;
    tuiState.startEvent(params);
  }

  updateEvent(params: {
    eventType: LoggableEventType;
    additionalMessage?: string;
    parentEventType?: LoggableEventType;
    instanceId?: string;
  }) {
    if (!this._isEnabled) return;
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
    if (!this._isEnabled) return;
    tuiState.finishEvent(params);
  }

  warn(message: string) {
    if (!this._isEnabled) {
      this.fallbackLog('WARN', message, 'yellow');
      return;
    }
    tuiState.addWarning(message);
  }

  setComplete(success: boolean, message: string, links: TuiLink[] = [], consoleUrl?: string) {
    if (!this._isEnabled) return;
    tuiState.setComplete(success, message, links, consoleUrl);
  }

  // Fallback methods for non-TUI logging (debug, info, etc.)
  private fallbackLog(type: string, message: string, color?: string) {
    if (this.logFormat === 'json') {
      console.info(JSON.stringify({ type, message, timestamp: Date.now() }));
      return;
    }

    const colorize = (text: string) => {
      if (!color || this.logFormat !== 'fancy') return text;
      return (kleur[color as keyof typeof kleur] as (text: string) => string)?.(text) ?? text;
    };

    const prefix = `[${colorize(type)}]`;
    console.info(`${prefix} ${message}`);
    logCollectorStream.write(`${prefix} ${message}`);
  }

  info(message: string) {
    this.fallbackLog('INFO', message, 'cyan');
  }

  debug(message: string) {
    if (this.logLevel !== 'debug') return;
    this.fallbackLog('DEBUG', message, 'gray');
  }

  success(message: string) {
    this.fallbackLog('SUCCESS', message, 'green');
  }

  hint(message: string) {
    this.fallbackLog('HINT', message, 'blue');
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
    // Add to state for React rendering
    tuiState.addMessage(name, type, message, data);

    // Also do fallback logging for non-TUI modes
    if (!this._isEnabled) {
      const typeToColor: Record<TuiMessageType, string> = {
        info: 'cyan',
        success: 'green',
        error: 'red',
        warn: 'yellow',
        debug: 'gray',
        hint: 'blue',
        start: 'magenta',
        announcement: 'magenta'
      };
      this.fallbackLog(type.toUpperCase(), message, typeToColor[type]);
    }
  }

  // ============================================================
  // Formatting Helpers
  // ============================================================

  getLink(link: keyof typeof linksMap, placeholder: string): string {
    const url = linksMap[link];
    return this.colorize('cyan', terminalLink(placeholder, url.endsWith('/') ? `${url} ` : `${url}/ `));
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

  prettyResourceParamName(param: string): string {
    return this.makeBold(this.colorize('gray', param));
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

  /**
   * Format complex stack errors with hints for display.
   */
  formatComplexStackErrors(
    processedErrors: { errorMessage: string; hints?: string[] }[],
    whitespacePadding = 0
  ): string {
    const outputLines: string[] = [];
    processedErrors.forEach(({ errorMessage, hints }, index) => {
      const errorMessageLines = splitStringIntoLines(errorMessage, 160, 40);
      outputLines.push(
        `${' '.repeat(whitespacePadding)}${this.colorize('red', `Error ${index + 1}: `)}${errorMessageLines.shift()}`
      );
      errorMessageLines.forEach((line) => {
        outputLines.push(`${' '.repeat(whitespacePadding)}   ${line.trim()}`);
      });
      (hints || []).forEach((hintString) => {
        outputLines.push(`${' '.repeat(whitespacePadding + 2)}[${this.colorize('blue', 'HINT')}]: ${hintString}`);
      });
    });
    return outputLines.join('\n');
  }

  // ============================================================
  // Error Handling
  // ============================================================

  /**
   * Print a structured error with optional hints and stack trace.
   * Handles both ExpectedError and UnexpectedError types.
   */
  error(error: UnexpectedError | ExpectedError) {
    const { hint } = error as ExpectedError;
    const { prettyStackTrace, errorType, sentryEventId } = error.details;

    const errorMessage =
      !IS_DEV && !error.isExpected
        ? `An unexpected error occurred. Last captured event: ${eventManager.lastEvent?.eventType || '-'}.`
        : error.isExpected
          ? `${this.colorize('red', errorType.replace('_ERROR', ''))}: ${error.message}`
          : error.message;

    if (this.logFormat === 'json') {
      this.printStacktapeLog({
        type: 'ERROR',
        data: { errorType, message: errorMessage, reportedErrorId: sentryEventId, stack: prettyStackTrace }
      });
    } else {
      const fullMessage = `${errorMessage}${prettyStackTrace ? `\n${prettyStackTrace}` : ''}`;
      const prefix = `[${this.colorize('red', errorType === 'UNEXPECTED_ERROR' ? 'UNEXPECTED_ERROR' : 'ERROR')}]`;
      console.error(`${prefix} ${fullMessage}`);
      logCollectorStream.write(`${prefix} ${fullMessage}`);
    }

    if (sentryEventId) {
      this.hint(
        `This error has been anonymously reported to our error monitoring service with id ${sentryEventId}.\n` +
          `You can create an issue with more details at ${this.getLink('newIssue', 'New issue')}. Please include error id in your issue.`
      );
    }

    const canPrintHint = this.logLevel !== 'error';
    if (hint && canPrintHint) {
      const hints = Array.isArray(hint) ? hint : [hint];
      for (const hintMsg of hints) {
        this.hint(hintMsg);
      }
    }

    this.hint(`To get help, you can join our ${this.makeBold('Discord')} community: https://discord.gg/gSvzRWe3YD`);
  }

  /**
   * Print a structured log message (used for SDK mode and JSON logging).
   */
  private printStacktapeLog(stacktapeLog: { type: string; data: Record<string, any> }) {
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
   * For TTY mode, renders a styled React component.
   * For non-TTY mode, renders ASCII table.
   */
  printTable({ header, rows }: { header: string[]; rows: string[][] }) {
    if (this.logFormat === 'json') {
      this.printStacktapeLog({ type: 'TABLE', data: { header, rows } });
      return;
    }

    if (this.isTTY && this.logFormat === 'fancy') {
      // Render React Table component using Ink
      const instance = render(React.createElement(Table, { header, rows }));
      instance.unmount();
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
    const horizontalLine = '+' + widths.map((w) => '-'.repeat(w + 2)).join('+') + '+';
    const formatRow = (cells: string[]) => {
      const paddedCells = cells.map((cell, i) => {
        const visibleLength = stripAnsi(cell || '').length;
        const padding = (widths[i] || 0) - visibleLength;
        return (cell || '') + ' '.repeat(Math.max(0, padding));
      });
      return '| ' + paddedCells.join(' | ') + ' |';
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
}

export const tuiManager = new TuiManager();
