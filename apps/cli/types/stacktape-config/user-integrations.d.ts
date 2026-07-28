import type {
  DiscordIntegration,
  EmailIntegration,
  MsTeamsIntegration,
  SlackIntegration,
  WebhookIntegration
} from '@stacktape/config/user-integrations';

declare global {
type UserIntegration = MsTeamsIntegration | SlackIntegration | EmailIntegration | DiscordIntegration | WebhookIntegration;
type UserIntegrationType = UserIntegration['type'];
}
