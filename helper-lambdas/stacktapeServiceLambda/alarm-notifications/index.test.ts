import { beforeEach, describe, expect, mock, test } from 'bun:test';

const postedMessages: Array<{ channel: string; text: string }> = [];
let reportError: Error | undefined;

mock.module('@slack/web-api', () => ({
  WebClient: class {
    chat = {
      postMessage: async (message: { channel: string; text: string }) => {
        postedMessages.push(message);
      }
    };
  }
}));

mock.module('@aws-sdk/credential-provider-node', () => ({
  defaultProvider: () => async () => ({ accessKeyId: 'test', secretAccessKey: 'test' })
}));

mock.module('@shared/trpc/aws-identity-protected', () => ({
  AwsIdentityProtectedClient: class {
    init = async () => undefined;
    reportAlarmEvent = {
      mutate: async () => {
        if (reportError) throw reportError;
        return 'event-1';
      }
    };
  }
}));

const { default: handleAlarmNotification } = await import('./index');

const createEvent = (includeInHistory: boolean): AlarmNotificationEventRuleInput =>
  ({
    description: 'threshold exceeded',
    time: new Date().toISOString(),
    stateValue: 'ALARM',
    alarmAwsResourceName: 'alarm-1',
    stackName: 'project-dev',
    alarmConfig: {
      name: 'errors',
      includeInHistory,
      trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 1 } },
      notificationTargets: [{ type: 'slack', properties: { conversationId: 'C123', accessToken: 'xoxb-test' } }]
    },
    affectedResource: { displayName: 'api', link: 'https://example.com' },
    comparisonOperator: 'GreaterThanThreshold',
    measuringUnit: 'percent',
    alarmLink: 'https://example.com/alarm',
    statFunction: 'avg'
  }) as AlarmNotificationEventRuleInput;

describe('alarm notification handler', () => {
  beforeEach(() => {
    postedMessages.length = 0;
    reportError = undefined;
    process.env.STACKTAPE_TRPC_API_ENDPOINT = 'https://api.example.com';
    process.env.AWS_REGION = 'eu-west-1';
    process.env.PROJECT_NAME = 'project';
    process.env.STAGE = 'dev';
  });

  test('still delivers notifications when alert history is disabled', async () => {
    await handleAlarmNotification(createEvent(false));
    expect(postedMessages).toHaveLength(1);
    expect(postedMessages[0]?.channel).toBe('C123');
  });

  test('propagates console routing failures so EventBridge can retry', async () => {
    reportError = new Error('console unavailable');
    await expect(handleAlarmNotification(createEvent(true))).rejects.toThrow('console unavailable');
  });
});
