import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';

type ProgressMessage = {
  text: string;
  details?: Record<string, any>;
  type: 'progress' | 'error' | 'success';
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

  init = async (_deploymentNotifications: DeploymentNotificationDefinition[]) => {
    this.isInitialized = true;
    // Check if we have console API access for server-side routing
    this.#hasConsoleApiAccess = !!stacktapeTrpcApiManager?.apiClient;
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
      await withTimeout({
        promise: stacktapeTrpcApiManager.apiClient.reportEvent({
          type,
          severity,
          project: globalStateManager.targetStack?.projectName,
          stage: globalStateManager.targetStack?.stage,
          region: globalStateManager.region,
          title,
          details,
          invocationId: globalStateManager.invocationId
        }),
        timeoutMs: 10000
      });
    } catch (err) {
      tuiManager.warn(`Failed to report event to console: ${err}`);
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
    let text = `Error performing operation ${globalStateManager.command}`;
    if (globalStateManager.targetStack?.stackName) {
      text += ` on stack ${globalStateManager.targetStack.stackName}`;
    }
    await this.reportEvent({
      type: this.#getErrorEventType(),
      title: text,
      severity: 'ERROR',
      details: { error: errorStack.slice(0, 1000) }
    });
  };

  // Resolve the event type based on the current command and message type
  #resolveEventType = (message: ProgressMessage): string | null => {
    const command = globalStateManager.command;
    if (command === 'deploy' || command === 'codebuild:deploy') {
      if (message.type === 'progress') return 'DEPLOY_STARTED';
      if (message.type === 'success') return 'DEPLOY_SUCCEEDED';
      if (message.type === 'error') return 'DEPLOY_FAILED';
    }
    if (command === 'delete') {
      if (message.type === 'progress') return 'DELETE_STARTED';
      if (message.type === 'success') return 'DELETE_SUCCEEDED';
      if (message.type === 'error') return 'DELETE_FAILED';
    }
    if (command === 'rollback') {
      if (message.type === 'success') return 'ROLLBACK_SUCCEEDED';
      if (message.type === 'error') return 'ROLLBACK_FAILED';
    }
    if (command === 'bucket:sync') {
      if (message.type === 'progress') return 'DEPLOY_STARTED';
      if (message.type === 'success') return 'DEPLOY_SUCCEEDED';
    }
    return null;
  };

  #getErrorEventType = (): string => {
    const command = globalStateManager.command;
    if (command === 'delete') return 'DELETE_FAILED';
    if (command === 'rollback') return 'ROLLBACK_FAILED';
    return 'DEPLOY_FAILED';
  };
}

export const notificationManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new NotificationManager());
