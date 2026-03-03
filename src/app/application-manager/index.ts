import type { ExpectedError } from '@utils/errors';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager, UserCancelledError } from '@application-services/tui-manager';
import { IS_DEV, IS_TELEMETRY_DISABLED } from '@config';
import { propertyFromObjectOrNull } from '@shared/utils/misc';
import { attemptToGetUsefulExpectedError, getErrorDetails, getReturnableError, UnexpectedError } from '@utils/errors';
import { killPythonBridge } from '@utils/file-loaders';
import { reportErrorToSentry } from '@utils/sentry';
import { reportTelemetryEvent } from '@utils/telemetry';
import { deleteTempFolder } from '@utils/temp-files';
import { tuiDebug } from '@application-services/tui-manager/tui-debug-log';
import kill from 'tree-kill';

const getStacktapeError = (err: any) => {
  if (err.isNewApproachError) {
    err.details = getErrorDetails(err);
  }
  if (err.isExpected || err.details) {
    return err as ExpectedError | UnexpectedError;
  }
  const usefulExpectedError = attemptToGetUsefulExpectedError(err);
  if (usefulExpectedError) {
    return usefulExpectedError as ExpectedError;
  }
  return new UnexpectedError({ error: err });
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
    const stacktapeError = getStacktapeError(err);
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
    const stacktapeError = getStacktapeError(err);
    // Await stop() so the alternate screen is fully exited before displaying the error.
    // Previously this was fire-and-forget, causing errors to render on the alt screen.
    await tuiManager.stop();
    this.cancelPendingPromises(stacktapeError);
    await this.reportTelemetryEvent({ outcome: stacktapeError.details.code });
    if (!IS_DEV && !stacktapeError.isExpected && !IS_TELEMETRY_DISABLED) {
      const sentryEventId = await reportErrorToSentry(stacktapeError);
      stacktapeError.details.sentryEventId = sentryEventId;
    }
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
    if (globalStateManager.invokedFrom === 'cli') {
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

    // Only write terminal restore sequences if the dev TUI was NOT active.
    // When the dev TUI is active, devTuiManager.stop() (called from the cleanup hook)
    // already handled alternate screen exit, mouse mode disable, and cursor restoration.
    // Writing them again would produce garbage escape output on the normal screen.
    if (!wasDevTuiActive) {
      try {
        process.stdout.write('\x1B[?1000l\x1B[?1002l\x1B[?1003l\x1B[?1006l\x1B[?1015l\x1B[?1049l\x1B[?25h');
      } catch {}
      try {
        if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
      } catch {}
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
        invokedFrom: propertyFromObjectOrNull(globalStateManager, 'invokedFrom'),
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
    const shouldCleanTemp =
      !args.preserveTempFiles && command !== 'package-workloads' && !(this.usesStdinWatch && success);
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
      this.handleError(new UnexpectedError({ error: new Error(cleanupErrorMessages.join('\n')) }), true);
    }
    return promiseResults;
  };

  private cancelPendingPromises = (err: Error) => {
    Object.values(this.pendingCancellablePromises).forEach(({ rejectFn }) => {
      rejectFn(err);
    });
  };

  private handleUnhandledError = ({
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

    // Destroy the TUI so the alternate screen is exited and the error is visible.
    // stopSync is fire-and-forget (can't await in sync context), so the async
    // handle.destroy() won't complete before we write the error below. We must
    // write escape sequences synchronously to force-exit the alternate screen.
    tuiManager.stopSync();

    if (tuiManager.wasEverStarted || tuiManager.devTuiActive) {
      try {
        process.stdout.write(
          '\x1B[?1000l\x1B[?1002l\x1B[?1003l\x1B[?1006l\x1B[?1015l' + // disable mouse modes
            '\x1B[?1049l' + // exit alternate screen
            '\x1B[?25h' + // show cursor
            '\x1B[0 q' // reset cursor shape
        );
      } catch {}
      try {
        if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
      } catch {}
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
      this.handleUnhandledError({ err, type: 'UNCAUGHT EXCEPTION' });
    };
    const onUnhandledRejection = (err: unknown) => {
      this.handleUnhandledError({
        err: err instanceof Error ? err : new Error(`Unknown error: ${JSON.stringify(err)}`),
        type: 'UNHANDLED PROMISE REJECTION'
      });
    };
    const onSigint = () => this.handleExitSignal('SIGINT');
    const onSigterm = () => this.handleExitSignal('SIGTERM');
    const onSighup = () => this.handleExitSignal('SIGHUP');
    const onSigquit = () => this.handleExitSignal('SIGQUIT');
    const onExit = () => {
      // Restore cursor visibility in case a spinner hid it and the process crashed
      try {
        process.stdout.write('\x1B[?25h');
      } catch {}
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
