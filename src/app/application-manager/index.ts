import type { ExpectedError } from '@utils/errors';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { IS_DEV, IS_TELEMETRY_DISABLED } from '@config';
import { propertyFromObjectOrNull } from '@shared/utils/misc';
import { attemptToGetUsefulExpectedError, getErrorDetails, getReturnableError, UnexpectedError } from '@utils/errors';
import { killPythonBridge } from '@utils/file-loaders';
import { reportErrorToSentry } from '@utils/sentry';
import { reportTelemetryEvent } from '@utils/telemetry';
import { deleteTempFolder } from '@utils/temp-files';
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

  gracefullyHandleError = (err: any) => {
    const stacktapeError = getStacktapeError(err);
    tuiManager.stop();
    this.cancelPendingPromises(stacktapeError);
    tuiManager.error(stacktapeError);
  };

  handleError = async (err: any, skipCleanup = false) => {
    if (this.isInterrupted) {
      return;
    }
    const stacktapeError = getStacktapeError(err);
    tuiManager.stop();
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
    if (this.isInterrupted) {
      return;
    }
    this.isInterrupted = true;
    tuiManager.stop();
    tuiManager.info(`Received ${signal}. Exiting.`);
    if (globalStateManager.invokedFrom === 'cli') {
      await this.reportTelemetryEvent({ outcome: 'USER_INTERRUPTION' });
    }
    if (this.usesStdinWatch) {
      process.stdin.destroy();
    }
    await this.cleanUp({ success: false, interrupted: true });
    process.removeAllListeners();
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
    const shouldCleanTemp = !args.preserveTempFiles && command !== 'package-workloads';
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
    if (this.isErrored || this.isInterrupted) {
      return;
    }
    if (IS_DEV) {
      tuiManager.warn(`[dev-only] ${type}: ${err.stack}`);
    }
    this.isErrored = true;
    this.cancelPendingPromises(err);
  };

  private registerProcessListeners = () => {
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    process.on('uncaughtException', (err) => {
      this.handleUnhandledError({
        err,
        type: 'UNCAUGHT EXCEPTION'
      });
    });
    process.on('unhandledRejection', (err) => {
      this.handleUnhandledError({
        err: err instanceof Error ? err : new Error(`Unknown error: ${JSON.stringify(err)}`),
        type: 'UNHANDLED PROMISE REJECTION'
      });
    });
    process.on('SIGINT', () => this.handleExitSignal('SIGINT')); // catch ctrl-c
    process.on('SIGTERM', () => this.handleExitSignal('SIGTERM')); // catch kill
    process.on('SIGHUP', () => this.handleExitSignal('SIGHUP')); // when console is closed. on windows this forces node process to exit within 10 seconds even if you have handler so better hurry up
    process.on('SIGQUIT', () => this.handleExitSignal('SIGQUIT'));
  };
}

export const applicationManager = new ApplicationManager();
