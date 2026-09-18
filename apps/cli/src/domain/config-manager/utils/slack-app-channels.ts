import type { ApiKeyProtectedClient } from '../../../stacktape-api/api-key-protected';
import { configErrors } from '../errors';

/**
 * `slack-app` notification channels name a channel in the organization's connected Slack workspace. Before the
 * template is synthesized, the deploy resolves every such name to the stable channel ID (the Console joins public
 * channels on the way), and writes the IDs next to the name. Delivery then never depends on the name again, so a
 * rename in Slack cannot break it. Every unresolvable reference is reported in one error.
 */

type SlackAppChannelProperties = {
  channel: string;
  connectionId?: string;
  channelId?: string;
  channelName?: string;
};

type SlackAppChannelObject = { type: 'slack-app'; properties: SlackAppChannelProperties };

const isSlackAppChannel = (value: unknown): value is SlackAppChannelObject => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { type?: unknown; properties?: unknown };
  if (candidate.type !== 'slack-app' || !candidate.properties || typeof candidate.properties !== 'object') return false;
  return typeof (candidate.properties as { channel?: unknown }).channel === 'string';
};

/** Every `slack-app` channel object reachable from the loaded config, in place (the objects are mutated later). */
export const collectSlackAppChannels = (root: unknown): SlackAppChannelObject[] => {
  const found: SlackAppChannelObject[] = [];
  const seen = new Set<object>();
  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (isSlackAppChannel(value)) {
      found.push(value);
      return;
    }
    for (const nested of Array.isArray(value) ? value : Object.values(value)) walk(nested);
  };
  walk(root);
  return found;
};

export const resolveSlackAppChannels = async ({
  rawConfig,
  apiClient
}: {
  rawConfig: unknown;
  apiClient: Pick<ApiKeyProtectedClient, 'resolveSlackChannels'>;
}) => {
  const channels = collectSlackAppChannels(rawConfig).filter((channel) => !channel.properties.channelId);
  if (!channels.length) return { resolved: 0 };
  const references = [...new Set(channels.map((channel) => channel.properties.channel.trim()))];
  const response = await apiClient.resolveSlackChannels({ channels: references });
  if (response.unresolved.length) {
    throw configErrors.slackAppChannelsUnresolved({
      unresolved: response.unresolved,
      workspaceConnected: response.workspace !== null
    });
  }
  const byReference = new Map(response.resolved.map((entry) => [entry.channel, entry]));
  for (const channel of channels) {
    const resolved = byReference.get(channel.properties.channel.trim());
    if (!resolved) {
      throw configErrors.slackAppChannelsUnresolved({
        unresolved: [{ channel: channel.properties.channel, reason: 'The Console returned no resolution for it.' }],
        workspaceConnected: true
      });
    }
    channel.properties.connectionId = resolved.connectionId;
    channel.properties.channelId = resolved.channelId;
    channel.properties.channelName = resolved.channelName;
  }
  return { resolved: channels.length };
};
