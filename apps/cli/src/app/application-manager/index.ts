import type { CleanupHookFunction } from '@application-services/event-manager/types';
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
import { tuiDebug } from '@application-services/tui-manager/debug';
import { shouldWriteTerminalControlSequences } from '@application-services/tui-manager/output/mode';
import kill from 'tree-kill';

export const normalizeCliError = (value: unknown): HandledError => {
  let error: HandledError;
  if (value instanceof CliError || value instanceof UnexpectedError) {
    error = value;
  } else {
    const originalError = value instanceof Error ? value : new Error(String(value));
    error = attemptToGetUsefulExpectedError(originalError) || new UnexpectedError({ error: originalError });
  }
  error.details = getErrorDetails(error);
  return error;
};

export class ApplicationManager {
  cleanUpHooks: CleanupHookFunction[] = [];
  isInitialized = false;
  pendingCancellablePromises: {
    [id: string]: { promise?: Promise<any>; rejectFn: (...args: any[]) => any; name: string };
  } = {};

  isErrored: boolean;
  // by SIGINT, etc.
  isInterrupted = false;
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

  gracefullyHandleError = async (err: any) => {
    tuiDebug('APP', 'gracefullyHandleError()', { message: err?.message?.slice?.(0, 200) });
    const stacktapeError = normalizeCliError(err);
    // Capture the error before teardown so it streams into scrollback as a styled
    // block while the renderer is still alive.
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
      const errorTrackingId = await reportErrorToPostHog({
        error: stacktapeError,
        command: globalStateManager.command,
        invocationId: globalStateManager.invocationId,
        mechanism: 'command_handler'
      });
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
    // right now we do not support onError hooks, but we can easily extend hooks to support them
    // await eventManager.processHooks({
    //   captureType: 'FINISH',
    //   error: returnableError
    // });

    return returnableError;
  };

  handleExitSignal = async (signal: 'SIGINT' | 'SIGTERM' | 'SIGQUIT' | 'SIGHUP') => {
    tuiDebug('APP', 'handleExitSignal()', { signal, alreadyInterrupted: this.isInterrupted });
    if (this.isInterrupted) {
      return;
    }
    this.isInterrupted = true;
    const wasDevTuiActive = tuiManager.devTuiActive;

    if (!wasDevTuiActive) {
      await tuiManager.stop();
      tuiManager.info(`Received ${signal}. Exiting.`);
    }
    if (globalStateManager.isInitialized) {
      await this.reportTelemetryEvent({ outcome: 'USER_INTERRUPTION' });
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

    this.removeOwnProcessListeners();
    process.exitCode = 0;

    if (globalStateManager.command === 'dev') {
      // Drain stdout before exiting so cleanup messages are fully flushed
      await new Promise<void>((resolve) => {
        if (process.stdout.writableLength === 0) return resolve();
        process.stdout.once('drain', resolve);
        // Safety timeout: don't hang forever if drain never fires
        setTimeout(resolve, 500);
      });
      process.exit(0);
      return;
    }
    return kill(process.pid, () => {
      process.exit(0);
    });
  };

  private reportTelemetryEvent = ({ outcome }: { outcome: string }) => {
    if (!IS_TELEMETRY_DISABLED) {
      return reportTelemetryEvent({
        outcome,
        args: propertyFromObjectOrNull(globalStateManager, 'args'),
        command: propertyFromObjectOrNull(globalStateManager, 'command'),
        invocationId: propertyFromObjectOrNull(globalStateManager, 'invocationId')
      });
    }
  };

  private cleanUp = async ({
    success,
    interrupted = false,
    err
  }: {
    success: boolean;
    interrupted?: boolean;
    err?: Error;
  }) => {
    const { command, args } = globalStateManager;
    globalStateManager.stopCredentialRefresh();
    const shouldCleanTemp = !args.preserveTempFiles && command !== 'package' && !(this.usesStdinWatch && success);
    const promiseResults = await Promise.allSettled([
      ...this.cleanUpHooks.map((hook) => hook({ success, interrupted, err })),
      shouldCleanTemp && deleteTempFolder()
    ]);
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
    Object.values(this.pendingCancellablePromises).forEach(({ rejectFn }) => {
      rejectFn(err);
    });
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

    await reportErrorToPostHog({
      error: err,
      command: globalStateManager.command,
      invocationId: globalStateManager.invocationId,
      mechanism: type === 'UNCAUGHT EXCEPTION' ? 'uncaught_exception' : 'unhandled_rejection'
    });

    // Stop the TUI and stream the final outcome into scrollback. stopSync's
    // renderer destroy is fire-and-forget (this is a sync context), so restore
    // the terminal synchronously as a fallback. With the split-footer renderer
    // the error below lands in scrollback, where a late footer frame can no
    // longer paint over it.
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
