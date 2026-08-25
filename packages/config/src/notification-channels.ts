import type { DiscordIntegration, EmailIntegration, MsTeamsIntegration, SlackIntegration, WebhookIntegration } from './user-integrations';

export interface ConsoleChannelIntegrationProps {
  /**
   * #### Name of a notification channel configured in the Stacktape Console.
   *
   * ---
   *
   * Channels are created once per organization in the Console (**Monitoring** → **Channels**) and hold the
   * delivery credentials (Slack tokens, webhook URLs, ...). Referencing a channel by name lets many alarms and
   * uptime checks share one destination without repeating credentials in the config.
   *
   * The referenced channel must exist in your organization — the deployment fails with a clear error if it
   * doesn't. Delivery happens through the Stacktape Console, so events routed to a console channel always
   * appear in the alert history.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiHealth:
   *     type: uptime-check
   *     properties:
   *       url: https://api.example.com/health
   *       notificationChannels:
   *         - type: console-channel
   *           properties:
   *             # stp-focus
   *             channelName: engineering-slack
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UptimeCheck, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiHealth = new UptimeCheck({
   *     url: 'https://api.example.com/health',
   *     notificationChannels: [
   *       {
   *         type: 'console-channel',
   *         properties: {
   *           // stp-focus
   *           channelName: 'engineering-slack'
   *           // stp-end-focus
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { apiHealth } };
   * });
   * ```
   */
  channelName: string;
}


export interface ConsoleChannelIntegration {
  type: 'console-channel';
  properties: ConsoleChannelIntegrationProps;
}


/**
 * #### Where to deliver a notification.
 *
 * ---
 *
 * Either an inline destination with its own credentials (`slack`, `ms-teams`, `discord`, `email`, `webhook`),
 * or a reference to a channel configured once in the Stacktape Console (`console-channel`).
 */
export type NotificationChannel =
  | MsTeamsIntegration
  | SlackIntegration
  | EmailIntegration
  | DiscordIntegration
  | WebhookIntegration
  | ConsoleChannelIntegration;
