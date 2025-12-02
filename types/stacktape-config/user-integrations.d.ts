interface SlackIntegrationProps {
  /**
   * #### The ID of the channel, direct message, multi-person direct message, or group.
   *
   * ---
   *
   * To get the conversation ID for a channel, navigate to the channel and click on its name.
   * The ID is located at the bottom of the **About** tab.
   */
  conversationId: string;
  /**
   * #### The Bot User OAuth Token.
   *
   * ---
   *
   * You can get an access token by following the first two steps in [this Slack guide](https://slack.dev/node-slack-sdk/getting-started).
   */
  accessToken: string;
}

interface SlackIntegration {
  type: 'slack';
  properties?: SlackIntegrationProps;
}

interface MsTeamsIntegrationProps {
  /**
   * #### The URL that allows Stacktape to send a notification to the associated channel.
   *
   * ---
   *
   * You can get this URL by following [this guide](https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook#create-incoming-webhook-1).
   */
  webhookUrl: string;
}

interface MsTeamsIntegration {
  type: 'ms-teams';
  properties?: MsTeamsIntegrationProps;
}

interface EmailIntegration {
  type: 'email';
  properties: EmailIntegrationProps;
}

interface EmailIntegrationProps {
  /**
   * #### The email address of the sender.
   */
  sender: string;
  /**
   * #### The email address of the recipient.
   */
  recipient: string;
}

type UserIntegration = MsTeamsIntegration | SlackIntegration | EmailIntegration;

type UserIntegrationType = UserIntegration['type'];
