import type { EmailIntegration, MsTeamsIntegration, SlackIntegration } from '@stacktape/config/user-integrations';

export type DeploymentNotificationUserIntegration = MsTeamsIntegration | SlackIntegration | EmailIntegration;
export interface DeploymentNotificationDefinition {
  integration: DeploymentNotificationUserIntegration;
  /**
   * #### Only send notifications for these stages. If omitted, notifications are sent for all stages.
   */
  forStages: string[];
  /**
   * #### Only send notifications for these services. If omitted, notifications are sent for all services.
   */
  forServices: string[];
}
