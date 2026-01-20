import type { AlarmUserIntegration } from '../../__release-npm/types';
import { PRODUCTION_STAGE, STAGING_STAGE } from './env.js';

export const getNotificationTargetAccessToken = (environment: string) => {
  switch (environment) {
    case PRODUCTION_STAGE:
      return "$Secret('slack-config.access_token')";
    case STAGING_STAGE:
      return "$Secret('slack-config.access_token')";
    case 'dev':
    default:
      // Give no access token to maybe we can turn this off?
      return '';
  }
};

export const getNotificationTargets = (environment: string): AlarmUserIntegration[] => {
  switch (environment) {
    case PRODUCTION_STAGE:
      return [
        {
          type: 'slack',
          properties: {
            conversationId: "$Secret('slack-config.backend_alerts_channel_id')",
            accessToken: getNotificationTargetAccessToken(environment)
          }
        }
      ];
    case STAGING_STAGE:
      return [];
    // Stop alerting in staging for now
    // {
    //   type: 'slack',
    //   properties: {
    //     conversationId: "$Secret('slack-config.backend_alerts_channel_id')",
    //     accessToken: getNotificationTargetAccessToken(environment),
    //   },
    // },
    case 'dev':
    default:
      return [];
  }
};
