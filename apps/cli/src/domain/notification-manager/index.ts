import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { resolveOperationNotificationEventType, type NotificationMessageType } from './events';

/**
 * CloudFormation stack states in which the RUNNING SYSTEM needs attention (not merely the deploy
 * command): the Console opens a stack-unhealthy incident for these.
 */
const FAILURE_EVENT_TYPES = new Set(['DEPLOY_FAILED', 'DELETE_FAILED', 'ROLLBACK_FAILED']);

type ProgressMessage = {
  text: string;
  details?: Record<string, any>;
  type: NotificationMessageType;
};

const withTimeout = async <T>({ promise, timeoutMs }: { promise: Promise<T>; timeoutMs: number }) => {
  let timeoutRef: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutRef = setTimeout(() => reject(new Error(`Notification timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }
  }
};

const severityFromMessageType = (type: ProgressMessage['type']): string => {
  switch (type) {
    case 'error':
      return 'ERROR';
    case 'success':
      return 'INFO';
    case 'progress':
      return 'INFO';
    default:
      return 'INFO';
  }
};

export class NotificationManager {
  isInitialized: boolean;
  #hasConsoleApiAccess = false;
  /**
   * Release identity attached to every reported event once the deploy flow learns it: which version
   * this operation produces, the hash of the resolved template, and the stage's explicit
   * classification. The Console stamps these onto incidents and stage settings.
   */
  #releaseContext: {
    deploymentVersion?: string;
    configRevision?: string;
    stageType?: 'production' | 'non-production' | 'unset';
  } = {};

  init = async ({ consoleApiAccess = true }: { consoleApiAccess?: boolean } = {}) => {
    this.isInitialized = true;
    this.#hasConsoleApiAccess = consoleApiAccess;
  };

  setReleaseContext = (context: {
    deploymentVersion?: string;
    configRevision?: string;
    stageType?: 'production' | 'non-production' | 'unset';
  }) => {
    Object.assign(this.#releaseContext, context);
  };

  /** Best-effort CloudFormation status for failure events; never delays reporting by more than 4s. */
  #fetchStackStatus = async (): Promise<string | undefined> => {
    const stackName = globalStateManager.targetStack?.stackName;
    if (!stackName) return undefined;
    try {
      const details = await withTimeout({
        promise: awsSdkManager.cloudFormation.getDetails(stackName),
        timeoutMs: 4000
      });
      return details?.StackStatus;
    } catch {
      return undefined;
    }
  };

  reportEvent = async ({
    type,
    title,
    severity = 'INFO',
    details
  }: {
    type: string;
    title: string;
    severity?: string;
    details?: Record<string, unknown>;
  }) => {
    if (!this.#hasConsoleApiAccess) return;
    try {
      const stackStatus = FAILURE_EVENT_TYPES.has(type) ? await this.#fetchStackStatus() : undefined;
      await withTimeout({
        promise: stacktapeTrpcApiManager.apiClient.reportEvent({
          type,
          severity,
          project: globalStateManager.targetStack?.projectName,
          stage: globalStateManager.targetStack?.stage,
          region: globalStateManager.region,
          title,
          details,
          invocationId: globalStateManager.invocationId,
          ...this.#releaseContext,
          ...(stackStatus ? { stackStatus } : {})
        }),
        timeoutMs: 10000
      });
    } catch (err) {
      // Console reporting is best-effort telemetry — say so, and keep the raw
      // cause to one line instead of dumping a full nested error wall.
      const cause = String((err as Error)?.message ?? err)
        .split('\n')[0]
        .slice(0, 200);
      tuiManager.warn(`Couldn't record this event in the Stacktape Console (the command is not affected): ${cause}`);
    }
  };

  sendDeploymentNotification = async ({ message }: { message: ProgressMessage }) => {
    if (!this.#hasConsoleApiAccess) return;

    const eventType = this.#resolveEventType(message);
    if (!eventType) return;

    await this.reportEvent({
      type: eventType,
      title: message.text,
      severity: severityFromMessageType(message.type),
      details: message.details
    });
  };

  reportError = async (errorStack: string) => {
    const eventType = resolveOperationNotificationEventType({
      command: globalStateManager.command,
      messageType: 'error'
    });
    if (!eventType) return;

    let text = `Error performing operation ${globalStateManager.command}`;
    if (globalStateManager.targetStack?.stackName) {
      text += ` on stack ${globalStateManager.targetStack.stackName}`;
    }
    await this.reportEvent({
      type: eventType,
      title: text,
      severity: 'ERROR',
      details: { error: errorStack.slice(0, 1000) }
    });
  };

  // Resolve the event type based on the current command and message type
  #resolveEventType = (message: ProgressMessage): string | null => {
    return resolveOperationNotificationEventType({
      command: globalStateManager.command,
      messageType: message.type
    });
  };
}

export const notificationManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new NotificationManager());
