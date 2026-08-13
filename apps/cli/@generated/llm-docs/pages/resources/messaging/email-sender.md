# Email sender

An `email-sender` gives your workloads a verified Amazon SES identity without making identity lifecycle and IAM your application's problem. Give Stacktape a domain or exact email address, connect a workload, and use the injected values with the AWS SDK.

```yaml
resources:
  mail:
    type: email-sender
    properties:
      identity: example.com

  sendWelcomeEmail:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/send-welcome-email.ts
      connectTo:
        - mail
```

```ts
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({ region: process.env.STP_MAIL_REGION });

export const handler = async () => {
  await ses.send(new SendEmailCommand({
    FromEmailAddress: `hello@${process.env.STP_MAIL_IDENTITY}`,
    Destination: { ToAddresses: ['customer@example.net'] },
    ConfigurationSetName: process.env.STP_MAIL_CONFIGURATION_SET_NAME,
    Content: {
      Simple: {
        Subject: { Data: 'Welcome' },
        Body: { Text: { Data: 'Thanks for joining us.' } }
      }
    }
  }));
};
```

`connectTo` injects `IDENTITY`, `IDENTITY_ARN`, `REGION`, `CONFIGURATION_SET_NAME`, and `FEEDBACK_TOPIC_ARN`. It grants only `ses:SendEmail` and `ses:SendRawEmail` on the exact identity and configuration set. It does not grant SES administration.

## Shared identity lifecycle

A managed identity belongs to the AWS account and region, not to one Stacktape project or stage. Stacktape therefore creates one deterministic, termination-protected shared CloudFormation stack for the canonical identity. `example.com` converges across every project and stage in that account and region; `billing@example.com` remains a distinct identity.

Deleting a project stack does not delete this shared stack. The delete output names retained shared resources so you do not mistake persistence for a leak. Stacktape does not automatically garbage-collect shared email identities in this version.

The shared stack also owns:

- a default configuration set with configuration-set-level suppression for bounces and complaints;
- one standard SNS feedback topic; and
- one configuration-set destination that publishes `BOUNCE` and `COMPLAINT` events to that topic.

The default configuration set and feedback topic are identity-wide. A subscriber sees feedback for every send using that identity and configuration set, including sends from other projects and stages. Treat feedback consumers as shared infrastructure and make processing idempotent.

## Handle bounces and complaints

Use the injected `feedbackTopicArn` as an existing SNS event source:

```yaml
resources:
  mail:
    type: email-sender
    properties:
      identity: example.com

  processEmailFeedback:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/process-email-feedback.ts
      events:
        - type: sns
          properties:
            snsTopicArn: $ResourceParam('mail', 'feedbackTopicArn')
```

## Verification and DNS

For a domain, Stacktape uses 2048-bit Easy DKIM. When it finds a matching public Route 53 hosted zone and verifies that the zone is actually delegated, it creates the three DKIM CNAME records. A hosted zone merely existing in the account is not enough.

With external DNS, deployment succeeds while verification is pending and prints the exact CNAME names and values returned by the SES identity resource. Add those records at your DNS provider. For an exact email address, SES sends a verification link to that mailbox instead; domain-only DKIM settings are not applied.

SES identities and sandbox status are regional. In the SES sandbox you can send only to verified recipients and at sandbox quotas. Stacktape warns and links to the production-access request, but does not block deployment.

## Use an identity managed elsewhere

Set `manageIdentity: false` to use an identity created by another platform. Stacktape verifies that the exact identity exists but never adopts, updates, or broadens it to a parent domain.

```yaml
resources:
  mail:
    type: email-sender
    properties:
      identity: billing@example.com
      manageIdentity: false
      configurationSetName: centrally-managed-mail
```

`configurationSetName` is optional for external identities. When supplied, Stacktape also checks it exists and scopes sending permission to it. External identities do not receive Stacktape's shared feedback topic; configure feedback externally or omit the configuration set when your application does not use one.

## Current boundaries

This resource intentionally does not configure custom MAIL FROM domains, DMARC records, BYODKIM keys, SES templates, bulk sending, inbound email, dedicated IPs, Virtual Deliverability Manager, or multi-region identity replication. Use explicit IAM and CloudFormation resources for those advanced cases today.


### Definition: `EmailSenderProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/email-senders` with definition name `EmailSenderProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `identity` | yes | `string` | - |
| `configurationSetName` | no | `string` | - |
| `manageIdentity` | no | `boolean` | `true` |
