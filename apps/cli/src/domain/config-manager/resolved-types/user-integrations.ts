import type {
  DiscordIntegration,
  EmailIntegration,
  MsTeamsIntegration,
  SlackIntegration,
  WebhookIntegration
} from '@stacktape/config/user-integrations';

export type UserIntegration =
  | MsTeamsIntegration
  | SlackIntegration
  | EmailIntegration
  | DiscordIntegration
  | WebhookIntegration;
export type UserIntegrationType = UserIntegration['type'];
