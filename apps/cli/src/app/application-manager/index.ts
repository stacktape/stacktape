import { stacktapeConsoleUrl } from 'src/config/params';
import { pendingOperations } from '../command-lifecycle/pending-operations';
import type { CleanupHookFunction } from './types';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager, UserCancelledError } from '@application-services/tui-manager';
import { IS_TELEMETRY_DISABLED } from '@config';
import { propertyFromObjectOrNull } from '@utils/misc';
import {
  attemptToGetUsefulExpectedError,
  CliError,
  getErrorDetails,
  getReturnableError,
  type HandledError,
  UnexpectedError
} from '@utils/errors';
import { killPythonBridge } from '@utils/file-loaders';
import { reportErrorToPostHog, reportTelemetryEvent } from '@utils/telemetry';
import { deleteTempFolder } from '@utils/temp-files';
import { timeAsync } from '@utils/timings';
import { tuiDebug } from '@application-services/tui-manager/debug';
import { shouldWriteTerminalControlSequences } from '@application-services/tui-manager/output/mode';
import { explainFailure, failureExplanationText } from '@stacktape/console-api/failure-explanations';
import stripAnsi from 'strip-ansi';
import kill from 'tree-kill';

export const normalizeCliError = (value: unknown): HandledError => {
  let error: HandledError;
  if (value instanceof CliError || value instanceof UnexpectedError) {
    error = value;
  } else {
    const originalError = value instanceof Error ? value : new Error(String(value));
    error = attemptToGetUsefulExpectedError(originalError) || new UnexpectedError({ error: originalError });
  }
  if (error instanceof CliError) {
    // Raw AWS, CloudFormation and container text gets its plain explanation first; the message itself stays as it was.
    const explanations = explainFailure(stripAnsi(error.message))
      .map((explanation) => failureExplanationText(explanation, new URL(stacktapeConsoleUrl()).origin))
      .filter((hint) => !error.hints.includes(hint));
    error.hints.unshift(...explanations);
  }
  error.details = getErrorDetails(error);
  return error;
};

/** Shell convention for a process ended by a signal: 128 + the signal number (SIGINT 130, SIGTERM 143). */
const SIGNAL_EXIT_CODES = { SIGHUP: 129, SIGINT: 130, SIGQUIT: 131, SIGTERM: 143 } as const;
export type ExitSignal = keyof typeof SIGNAL_EXIT_CODES;

class ApplicationManager {
  cleanUpHooks: CleanupHookFunction[] = [];
  finalCleanUpHooks: (() => Promise<void>)[] = [];
  isInitialized = false;
  isErrored: boolean;
  // by SIGINT, etc.
  isInterrupted = false;
  /** Set when the process is asked to stop on purpose (`dev stop`); its stop then succeeds instead of being interrupted. */
  private stopRequested = false;
  usesStdinWatch = false;
  private signalHandlers: { signal: string; handler: (...args: any[]) => void }[] = [];

  init = async () => {
    if (!this.isInitialized) {
      process.env.NODE_NO_WARNINGS = '1';
      this.registerProcessListeners();
      this.isInitialized = true;
    }
    this.isErrored = false;
  };

  setUsesStdinWatch = () => {
    this.usesStdinWatch = true;
  };

  registerCleanUpHook = (hook: CleanupHookFunction) => {
    this.cleanUpHooks.push(hook);
  };

  cleanUpAfterSuccess = async () => {
    await this.reportTelemetryEvent({ outcome: 'SUCCESS' });
    await this.cleanUp({ success: true });
    killPythonBridge();
  };

  /**
   * The command did its work, and a hook that runs after it failed. Nothing is undone, so cleanup runs as after a
   * success: a failure cleanup would treat a finished deployment as an interrupted one. The error is printed, and the
   * command still ends as failed.
   */
  failAfterCompletedCommand = async (err: unknown) => {
    const stacktapeError = normalizeCliError(err);
    await this.reportTelemetryEvent({ outcome: stacktapeError.details.code });
    await tuiManager.stop();
    tuiManager.error(stacktapeError);
    await this.cleanUp({ success: true, hookFailure: stacktapeError });
    killPythonBridge();
    return getReturnableError(stacktapeError);
  };

  gracefullyHandleError = async (err: any) => {
    tuiDebug('APP', 'gracefullyHandleError()', { message: err?.message?.slice?.(0, 200) });
    const stacktapeError = normalizeCliError(err);
    // Capture the error before teardown so every presenter can include it in
    // the final operation state.
    tuiManager.setFatalError(stacktapeError);
    await tuiManager.stop();
    this.cancelPendingPromises(stacktapeError);
    tuiManager.error(stacktapeError);
  };

  handleError = async (err: any, skipCleanup = false) => {
    tuiDebug('APP', 'handleError()', {
      message: err?.message?.slice?.(0, 200),
      isInterrupted: this.isInterrupted,
      skipCleanup
    });
    if (this.isInterrupted) {
      return;
    }
    if (err instanceof UserCancelledError) {
      return this.handleExitSignal('SIGINT');
    }
    const stacktapeError = normalizeCliError(err);
    this.cancelPendingPromises(stacktapeError);
    await this.reportTelemetryEvent({ outcome: stacktapeError.details.code });
    if (!(stacktapeError instanceof CliError) && !IS_TELEMETRY_DISABLED) {
      const errorTrackingId = await timeAsync('telemetry:report-error', () =>
        reportErrorToPostHog({
          error: stacktapeError,
          command: globalStateManager.command,
          invocationId: globalStateManager.invocationId,
          mechanism: 'command_handler'
        })
      );
      stacktapeError.details.errorTrackingId = errorTrackingId;
    }
    // Capture only after error reporting so the TTY snapshot includes its searchable error ID.
    tuiManager.setFatalError(stacktapeError);
    await tuiManager.stop();
    tuiManager.error(stacktapeError);
    if (!skipCleanup) {
      await this.cleanUp({ success: false, err });
    }
    const returnableError = getReturnableError(stacktapeError);
    // onError hooks are not supported yet; CommandLifecycle is the extension point for them.

    return returnableError;
  };

  /**
   * Stops the process on purpose, as `dev stop` does: the same cleanup as an interruption, but it ends with exit code 0
   * and a successful result.
   */
  requestStop = () => {
    this.stopRequested = true;
    // On Windows, process.kill(pid, 'SIGINT') doesn't emit the SIGINT event properly, so the handlers are run directly.
    process.emit('SIGINT');
  };

  /** The final result of a command that was interrupted, or stopped on request. */
  interruptionResult = () =>
    this.stopRequested
      ? { ok: true, code: 'STOPPED', message: 'Stopped on request' }
      : { ok: false, code: 'USER_INTERRUPTION', message: 'Operation interrupted by user' };

  handleExitSignal = async (signal: ExitSignal) => {
    tuiDebug('APP', 'handleExitSignal()', { signal, alreadyInterrupted: this.isInterrupted });
    if (this.isInterrupted) {
      return;
    }
    this.isInterrupted = true;
    const stopped = this.stopRequested;
    // An interrupted command did not finish, so it must not report shell success. Set first: any path that ends the
    // process while cleanup still runs exits with it too.
    const exitCode = stopped ? 0 : SIGNAL_EXIT_CODES[signal];
    process.exitCode = exitCode;
    const wasDevTuiActive = tuiManager.devTuiActive;

    if (!wasDevTuiActive) {
      await tuiManager.stop();
      tuiManager.info(stopped ? 'Stopping on request.' : `Received ${signal}. Exiting.`);
    }
    if (globalStateManager.isInitialized) {
      // This exit ends the CLI's whole process tree below, a detached telemetry sender included, so the report is sent
      // from this process.
      await this.reportTelemetryEvent({ outcome: stopped ? 'SUCCESS' : 'USER_INTERRUPTION', waitForDelivery: true });
    }
    if (this.usesStdinWatch) {
      try {
        if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
      } catch {}
      try {
        process.stdin.destroy();
      } catch {}
    }

    // Run cleanup hooks. For dev command, the cleanup hook tears down the dev TUI
    // (exits alternate screen, restores cursor) and then prints cleanup progress.
    await this.cleanUp({ success: false, interrupted: true });

    // Only restore terminal state if the dev TUI was NOT active. When the dev TUI
    // is active, devTuiManager.stop() (called from the cleanup hook) already
    // handled mouse mode disable and cursor restoration — doing it again would
    // produce garbage escape output.
    if (!wasDevTuiActive) {
      tuiManager.forceRestoreTerminal();
    }

    tuiManager.emitJsonlResult(this.interruptionResult());

    if (globalStateManager.command === 'dev') {
      // Drain stdout before exiting so cleanup messages are fully flushed
      await new Promise<void>((resolve) => {
        if (process.stdout.writableLength === 0) return resolve();
        process.stdout.once('drain', resolve);
        // Safety timeout: don't hang forever if drain never fires
        setTimeout(resolve, 500);
      });
      this.removeOwnProcessListeners();
      process.exit(exitCode);
      return;
    }
    return kill(process.pid, () => {
      // tree-kill signals this process as well as its descendants. Keep our handlers installed until its callback
      // runs, otherwise the default SIGTERM handler ends the process before cleanup has finished.
      this.removeOwnProcessListeners();
      process.exit(exitCode);
    });
  };

  private reportTelemetryEvent = ({ outcome, waitForDelivery }: { outcome: string; waitForDelivery?: boolean }) => {
    if (!IS_TELEMETRY_DISABLED) {
      return timeAsync('telemetry:report', () =>
        reportTelemetryEvent({
          outcome,
          args: propertyFromObjectOrNull(globalStateManager, 'args'),
          command: propertyFromObjectOrNull(globalStateManager, 'command'),
          invocationId: propertyFromObjectOrNull(globalStateManager, 'invocationId'),
          waitForDelivery
        })
      );
    }
  };

  private cleanUp = async ({
    success,
    interrupted = false,
    err,
    hookFailure
  }: {
    success: boolean;
    interrupted?: boolean;
    err?: Error;
    hookFailure?: Error;
  }) => {
    const { command, args } = globalStateManager;
    globalStateManager.stopCredentialRefresh();
    const shouldCleanTemp = !args.preserveTempFiles && command !== 'package' && !(this.usesStdinWatch && success);
    const promiseResults = await timeAsync(
      'cleanup:run',
      () =>
        Promise.allSettled([
          ...this.cleanUpHooks.map((hook) => hook({ success, interrupted, err, hookFailure })),
          shouldCleanTemp && deleteTempFolder()
        ]),
      { hooks: this.cleanUpHooks.length, deleteTemp: Boolean(shouldCleanTemp) }
    );
    for (const hook of this.finalCleanUpHooks) {
      try {
        await hook();
      } catch (error) {
        promiseResults.push({ status: 'rejected', reason: error });
      }
    }
    const cleanupErrorMessages: string[] = [];
    promiseResults.forEach((result) => {
      if (result.status === 'rejected') {
        cleanupErrorMessages.push(result.reason);
      }
    });
    if (cleanupErrorMessages.length) {
      this.handleError(new Error(cleanupErrorMessages.join('\n')), true);
    }
    return promiseResults;
  };

  private cancelPendingPromises = (err: Error) => {
    pendingOperations.cancelAll(err);
  };

  private handleUnhandledError = async ({
    err,
    type
  }: {
    err: Error;
    type: 'UNCAUGHT EXCEPTION' | 'UNHANDLED PROMISE REJECTION';
  }) => {
    tuiDebug('APP', 'handleUnhandledError()', {
      type,
      message: err?.message?.slice?.(0, 200),
      isErrored: this.isErrored,
      isInterrupted: this.isInterrupted
    });
    if (this.isErrored || this.isInterrupted) {
      return;
    }
    if (err instanceof UserCancelledError) {
      this.handleExitSignal('SIGINT');
      return;
    }
    this.isErrored = true;
    this.cancelPendingPromises(err);

    const errorTrackingId = await reportErrorToPostHog({
      error: err,
      command: globalStateManager.command,
      invocationId: globalStateManager.invocationId,
      mechanism: type === 'UNCAUGHT EXCEPTION' ? 'uncaught_exception' : 'unhandled_rejection'
    });

    // stopSync's renderer destroy is fire-and-forget (this is a sync context),
    // so restore the terminal synchronously before writing the fatal error.
    tuiManager.stopSync();

    if (tuiManager.wasEverStarted || tuiManager.devTuiActive) {
      tuiManager.forceRestoreTerminal();
    }

    try {
      const label = type === 'UNCAUGHT EXCEPTION' ? 'Uncaught exception' : 'Unhandled promise rejection';
      process.stderr.write(`\n[${label}] ${err.message || err}\n`);
      if (err.stack) {
        process.stderr.write(`${err.stack}\n`);
      }
      if (errorTrackingId) {
        process.stderr.write(`Error ID: ${errorTrackingId}\n`);
      }
    } catch {}
  };

  private removeOwnProcessListeners = () => {
    for (const { signal, handler } of this.signalHandlers) {
      process.removeListener(signal, handler);
    }
    this.signalHandlers = [];
  };

  private registerProcessListeners = () => {
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');

    const onUncaughtException = (err: Error) => {
      void this.handleUnhandledError({ err, type: 'UNCAUGHT EXCEPTION' });
    };
    const onUnhandledRejection = (err: unknown) => {
      void this.handleUnhandledError({
        err: err instanceof Error ? err : new Error(`Unknown error: ${JSON.stringify(err)}`),
        type: 'UNHANDLED PROMISE REJECTION'
      });
    };
    const onSigint = () => this.handleExitSignal('SIGINT');
    const onSigterm = () => this.handleExitSignal('SIGTERM');
    const onSighup = () => this.handleExitSignal('SIGHUP');
    const onSigquit = () => this.handleExitSignal('SIGQUIT');
    const onExit = () => {
      // Only an interactive renderer may have hidden the cursor. Machine output
      // must remain valid JSONL through the final byte written by the process.
      if (shouldWriteTerminalControlSequences({ outputMode: tuiManager.mode, stdoutIsTty: process.stdout.isTTY })) {
        try {
          process.stdout.write('\x1B[?25h');
        } catch {}
      }
    };

    process.on('uncaughtException', onUncaughtException);
    process.on('unhandledRejection', onUnhandledRejection);
    process.on('SIGINT', onSigint); // catch ctrl-c
    process.on('SIGTERM', onSigterm); // catch kill
    process.on('SIGHUP', onSighup); // when console is closed. on windows this forces node process to exit within 10 seconds even if you have handler so better hurry up
    process.on('SIGQUIT', onSigquit);
    process.on('exit', onExit);

    this.signalHandlers = [
      { signal: 'uncaughtException', handler: onUncaughtException },
      { signal: 'unhandledRejection', handler: onUnhandledRejection },
      { signal: 'SIGINT', handler: onSigint },
      { signal: 'SIGTERM', handler: onSigterm },
      { signal: 'SIGHUP', handler: onSighup },
      { signal: 'SIGQUIT', handler: onSigquit },
      { signal: 'exit', handler: onExit }
    ];
  };
}

export const applicationManager = new ApplicationManager();
