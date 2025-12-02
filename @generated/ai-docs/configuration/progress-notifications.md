# Progress Notifications

Progress notifications send information about important Stacktape operations to a specified destination, such as Slack or Microsoft Teams.

By default, notifications are sent for the `deploy` and `delete` commands. You will be notified when:

*   An operation starts successfully.
*   An operation finishes successfully.
*   An error occurs.

## Slack notifications

To set up Slack notifications, you need to provide:

*   `accessToken`: A Bot User OAuth Token. You can obtain one by following the first two steps in [this Slack guide](https://slack.dev/node-slack-sdk/getting-started).
*   `conversationId`: The ID of a channel, direct message, multi-person direct message, or group. To get the ID of a channel, navigate to the channel, click on its name, and look for the ID at the bottom of the **About** tab.

```yml
progressNotifications:
  - type: slack
    properties:
      conversationId: C#######
      accessToken: xoxb-####################
```

## Microsoft Teams notifications

To set up Microsoft Teams notifications, you need to provide your `webhookUrl`. You can obtain one by following [this guide](https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook#create-incoming-webhook-1).

```yml
progressNotifications:
  - type: ms-teams
    properties:
      webhookUrl: C#######
```