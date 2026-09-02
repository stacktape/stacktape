import type { StacktapeCommand } from 'src/config/cli/types';

export type NotificationMessageType = 'progress' | 'error' | 'success';

type OperationNotificationEventType =
  | 'DEPLOY_STARTED'
  | 'DEPLOY_SUCCEEDED'
  | 'DEPLOY_FAILED'
  | 'DELETE_STARTED'
  | 'DELETE_SUCCEEDED'
  | 'DELETE_FAILED'
  | 'ROLLBACK_SUCCEEDED'
  | 'ROLLBACK_FAILED'
  | 'SCRIPT_RUN_SUCCEEDED'
  | 'SCRIPT_RUN_FAILED';

const notificationEventTypesByCommand = {
  deploy: {
    progress: 'DEPLOY_STARTED',
    success: 'DEPLOY_SUCCEEDED',
    error: 'DEPLOY_FAILED'
  },
  delete: {
    progress: 'DELETE_STARTED',
    success: 'DELETE_SUCCEEDED',
    error: 'DELETE_FAILED'
  },
  rollback: {
    success: 'ROLLBACK_SUCCEEDED',
    error: 'ROLLBACK_FAILED'
  },
  'script:run': {
    success: 'SCRIPT_RUN_SUCCEEDED',
    error: 'SCRIPT_RUN_FAILED'
  },
  'deployment-script:run': {
    success: 'SCRIPT_RUN_SUCCEEDED',
    error: 'SCRIPT_RUN_FAILED'
  }
} as const satisfies Partial<
  Record<StacktapeCommand, Partial<Record<NotificationMessageType, OperationNotificationEventType>>>
>;

export const resolveOperationNotificationEventType = ({
  command,
  messageType
}: {
  command: StacktapeCommand;
  messageType: NotificationMessageType;
}): OperationNotificationEventType | null => notificationEventTypesByCommand[command]?.[messageType] || null;
