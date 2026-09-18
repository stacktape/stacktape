# SlackAppIntegrationProps API Reference

## TypeScript definition

```typescript
type SlackAppIntegrationProps = {
  /** The Slack channel to notify, in the workspace connected to your organization through the Stacktape Slack app. */
  channel: string;
};
```

## Property: `channel`

- Required: yes
- Type: `string`

The Slack channel to notify, in the workspace connected to your organization through the Stacktape Slack app.

Write the channel name (`#alerts` or `alerts`) or its ID. The name is resolved to the channel ID when you deploy,
so renaming the channel in Slack later does not break delivery. Public channels are joined by the app
automatically; invite the app to a private channel first (`/invite
