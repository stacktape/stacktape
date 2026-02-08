interface SlackIntegrationProps {
  /**
   * #### The Slack channel or DM ID to send notifications to.
   *
   * ---
   *
   * To find the ID: open the channel, click its name, and look at the bottom of the **About** tab.
   */
  conversationId: string;
  /**
   * #### Bot User OAuth Token for your Slack app. Store as `$Secret()` for security.
   *
   * ---
   *
   * Create a Slack app, add the `chat:write` scope, install it to your workspace, then copy the Bot User OAuth Token.
   */
  accessToken: string;
}

interface SlackIntegration {
  type: 'slack';
  properties?: SlackIntegrationProps;
}

interface MsTeamsIntegrationProps {
  /**
   * #### Incoming Webhook URL for the MS Teams channel. Store as `$Secret()` for security.
   *
   * ---
   *
   * Create an Incoming Webhook connector in your Teams channel settings to get this URL.
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
