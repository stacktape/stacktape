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

interface DiscordIntegrationProps {
  /**
   * #### Discord Webhook URL for the channel. Store as `$Secret()` for security.
   *
   * ---
   *
   * Create a webhook in your Discord channel settings (Edit Channel → Integrations → Webhooks).
   */
  webhookUrl: string;
}

interface DiscordIntegration {
  type: 'discord';
  properties?: DiscordIntegrationProps;
}

interface WebhookIntegrationProps {
  /**
   * #### The URL to send webhook POST requests to.
   */
  url: string;
  /**
   * #### Optional signing secret for HMAC-SHA256 payload verification.
   *
   * ---
   *
   * If provided, each request includes an `X-Stacktape-Signature` header.
   */
  secret?: string;
  /**
   * #### Optional custom headers to include in each request.
   */
  headers?: Record<string, string>;
}

interface WebhookIntegration {
  type: 'webhook';
  properties?: WebhookIntegrationProps;
}

type UserIntegration = MsTeamsIntegration | SlackIntegration | EmailIntegration | DiscordIntegration | WebhookIntegration;

type UserIntegrationType = UserIntegration['type'];
