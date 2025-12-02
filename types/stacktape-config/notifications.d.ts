type DeploymentNotificationUserIntegration = MsTeamsIntegration | SlackIntegration | EmailIntegration;

interface DeploymentNotificationDefinition {
  integration: DeploymentNotificationUserIntegration;
  /**
   * #### Disables notifications for stages other than those specified in this list.
   */
  forStages: string[];
  /**
   * #### Disables notifications for services other than those specified in this list.
   */
  forServices: string[];
}
