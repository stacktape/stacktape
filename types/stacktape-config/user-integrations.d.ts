interface SlackIntegrationProps {
  /**
   * #### The Slack channel or DM ID to send notifications to.
   *
   * ---
   *
   * To find the ID: open the channel, click its name, and look at the bottom of the **About** tab.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   workerFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/worker.ts
   *       memory: 512
   *       timeout: 30
   *       alarms:
   *         - trigger:
   *             type: lambda-error-rate
   *             properties:
   *               thresholdPercent: 5
   *           description: Worker error rate is too high
   *           notificationTargets:
   *             - type: slack
   *               properties:
   *                 # stp-focus
   *                 conversationId: C0123456789
   *                 # stp-end-focus
   *                 accessToken: $Secret('slack-bot-token')
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const workerFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/worker.ts' }
   *     },
   *     memory: 512,
   *     timeout: 30,
   *     alarms: [
   *       {
   *         trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 5 } },
   *         description: 'Worker error rate is too high',
   *         notificationTargets: [
   *           {
   *             type: 'slack',
   *             properties: {
   *               // stp-focus
   *               conversationId: 'C0123456789',
   *               // stp-end-focus
   *               accessToken: $Secret('slack-bot-token')
   *             }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *   return { resources: { workerFunction } };
   * });
   * ```
   */
  conversationId: string;
  /**
   * #### Bot User OAuth Token for your Slack app. Store as `$Secret()` for security.
   *
   * ---
   *
   * Create a Slack app, add the `chat:write` scope, install it to your workspace, then copy the Bot User OAuth Token.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   workerFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/worker.ts
   *       memory: 512
   *       timeout: 30
   *       alarms:
   *         - trigger:
   *             type: lambda-error-rate
   *             properties:
   *               thresholdPercent: 5
   *           description: Worker error rate is too high
   *           notificationTargets:
   *             - type: slack
   *               properties:
   *                 conversationId: C0123456789
   *                 # stp-focus
   *                 accessToken: $Secret('slack-bot-token')
   *                 # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const workerFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/worker.ts' }
   *     },
   *     memory: 512,
   *     timeout: 30,
   *     alarms: [
   *       {
   *         trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 5 } },
   *         description: 'Worker error rate is too high',
   *         notificationTargets: [
   *           {
   *             type: 'slack',
   *             properties: {
   *               conversationId: 'C0123456789',
   *               // stp-focus
   *               accessToken: $Secret('slack-bot-token')
   *               // stp-end-focus
   *             }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *   return { resources: { workerFunction } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       memory: 1024
   *       timeout: 15
   *       alarms:
   *         - trigger:
   *             type: lambda-duration
   *             properties:
   *               thresholdMilliseconds: 5000
   *           description: API function is running slow
   *           notificationTargets:
   *             - type: ms-teams
   *               properties:
   *                 # stp-focus
   *                 webhookUrl: $Secret('ms-teams-webhook-url')
   *                 # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/api.ts' }
   *     },
   *     memory: 1024,
   *     timeout: 15,
   *     alarms: [
   *       {
   *         trigger: { type: 'lambda-duration', properties: { thresholdMilliseconds: 5000 } },
   *         description: 'API function is running slow',
   *         notificationTargets: [
   *           {
   *             type: 'ms-teams',
   *             properties: {
   *               // stp-focus
   *               webhookUrl: $Secret('ms-teams-webhook-url')
   *               // stp-end-focus
   *             }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
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
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   paymentsFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/payments.ts
   *       memory: 512
   *       timeout: 30
   *       alarms:
   *         - trigger:
   *             type: lambda-error-rate
   *             properties:
   *               thresholdPercent: 1
   *           description: Payment processing failures detected
   *           notificationTargets:
   *             - type: email
   *               properties:
   *                 # stp-focus
   *                 sender: alerts@mycompany.com
   *                 # stp-end-focus
   *                 recipient: oncall@mycompany.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const paymentsFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/payments.ts' }
   *     },
   *     memory: 512,
   *     timeout: 30,
   *     alarms: [
   *       {
   *         trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 1 } },
   *         description: 'Payment processing failures detected',
   *         notificationTargets: [
   *           {
   *             type: 'email',
   *             properties: {
   *               // stp-focus
   *               sender: 'alerts@mycompany.com',
   *               // stp-end-focus
   *               recipient: 'oncall@mycompany.com'
   *             }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *   return { resources: { paymentsFunction } };
   * });
   * ```
   */
  sender: string;
  /**
   * #### The email address of the recipient.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   paymentsFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/payments.ts
   *       memory: 512
   *       timeout: 30
   *       alarms:
   *         - trigger:
   *             type: lambda-error-rate
   *             properties:
   *               thresholdPercent: 1
   *           description: Payment processing failures detected
   *           notificationTargets:
   *             - type: email
   *               properties:
   *                 sender: alerts@mycompany.com
   *                 # stp-focus
   *                 recipient: oncall@mycompany.com
   *                 # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const paymentsFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/payments.ts' }
   *     },
   *     memory: 512,
   *     timeout: 30,
   *     alarms: [
   *       {
   *         trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 1 } },
   *         description: 'Payment processing failures detected',
   *         notificationTargets: [
   *           {
   *             type: 'email',
   *             properties: {
   *               sender: 'alerts@mycompany.com',
   *               // stp-focus
   *               recipient: 'oncall@mycompany.com'
   *               // stp-end-focus
   *             }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *   return { resources: { paymentsFunction } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ingestFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/ingest.ts
   *       memory: 256
   *       timeout: 60
   *       alarms:
   *         - trigger:
   *             type: lambda-duration
   *             properties:
   *               thresholdMilliseconds: 30000
   *           description: Ingest job is taking too long
   *           notificationTargets:
   *             - type: discord
   *               properties:
   *                 # stp-focus
   *                 webhookUrl: $Secret('discord-webhook-url')
   *                 # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ingestFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/ingest.ts' }
   *     },
   *     memory: 256,
   *     timeout: 60,
   *     alarms: [
   *       {
   *         trigger: { type: 'lambda-duration', properties: { thresholdMilliseconds: 30000 } },
   *         description: 'Ingest job is taking too long',
   *         notificationTargets: [
   *           {
   *             type: 'discord',
   *             properties: {
   *               // stp-focus
   *               webhookUrl: $Secret('discord-webhook-url')
   *               // stp-end-focus
   *             }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *   return { resources: { ingestFunction } };
   * });
   * ```
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
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   schedulerFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/scheduler.ts
   *       memory: 256
   *       timeout: 30
   *       alarms:
   *         - trigger:
   *             type: lambda-error-rate
   *             properties:
   *               thresholdPercent: 10
   *           description: Scheduler errors detected
   *           notificationTargets:
   *             - type: webhook
   *               properties:
   *                 # stp-focus
   *                 url: https://ops.mycompany.com/hooks/stacktape-alarms
   *                 # stp-end-focus
   *                 secret: $Secret('webhook-signing-secret')
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const schedulerFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/scheduler.ts' }
   *     },
   *     memory: 256,
   *     timeout: 30,
   *     alarms: [
   *       {
   *         trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 10 } },
   *         description: 'Scheduler errors detected',
   *         notificationTargets: [
   *           {
   *             type: 'webhook',
   *             properties: {
   *               // stp-focus
   *               url: 'https://ops.mycompany.com/hooks/stacktape-alarms',
   *               // stp-end-focus
   *               secret: $Secret('webhook-signing-secret')
   *             }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *   return { resources: { schedulerFunction } };
   * });
   * ```
   */
  url: string;
  /**
   * #### Optional signing secret for HMAC-SHA256 payload verification.
   *
   * ---
   *
   * If provided, each request includes an `X-Stacktape-Signature` header.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   schedulerFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/scheduler.ts
   *       memory: 256
   *       timeout: 30
   *       alarms:
   *         - trigger:
   *             type: lambda-error-rate
   *             properties:
   *               thresholdPercent: 10
   *           description: Scheduler errors detected
   *           notificationTargets:
   *             - type: webhook
   *               properties:
   *                 url: https://ops.mycompany.com/hooks/stacktape-alarms
   *                 # stp-focus
   *                 secret: $Secret('webhook-signing-secret')
   *                 # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const schedulerFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/scheduler.ts' }
   *     },
   *     memory: 256,
   *     timeout: 30,
   *     alarms: [
   *       {
   *         trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 10 } },
   *         description: 'Scheduler errors detected',
   *         notificationTargets: [
   *           {
   *             type: 'webhook',
   *             properties: {
   *               url: 'https://ops.mycompany.com/hooks/stacktape-alarms',
   *               // stp-focus
   *               secret: $Secret('webhook-signing-secret')
   *               // stp-end-focus
   *             }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *   return { resources: { schedulerFunction } };
   * });
   * ```
   */
  secret?: string;
  /**
   * #### Optional custom headers to include in each request.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   schedulerFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/scheduler.ts
   *       memory: 256
   *       timeout: 30
   *       alarms:
   *         - trigger:
   *             type: lambda-error-rate
   *             properties:
   *               thresholdPercent: 10
   *           description: Scheduler errors detected
   *           notificationTargets:
   *             - type: webhook
   *               properties:
   *                 url: https://ops.mycompany.com/hooks/stacktape-alarms
   *                 secret: $Secret('webhook-signing-secret')
   *                 # stp-focus
   *                 headers:
   *                   X-Environment: production
   *                   Authorization: $Secret('webhook-auth-header')
   *                 # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const schedulerFunction = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/scheduler.ts' }
   *     },
   *     memory: 256,
   *     timeout: 30,
   *     alarms: [
   *       {
   *         trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 10 } },
   *         description: 'Scheduler errors detected',
   *         notificationTargets: [
   *           {
   *             type: 'webhook',
   *             properties: {
   *               url: 'https://ops.mycompany.com/hooks/stacktape-alarms',
   *               secret: $Secret('webhook-signing-secret'),
   *               // stp-focus
   *               headers: {
   *                 'X-Environment': 'production',
   *                 Authorization: $Secret('webhook-auth-header')
   *               }
   *               // stp-end-focus
   *             }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *   return { resources: { schedulerFunction } };
   * });
   * ```
   */
  headers?: Record<string, string>;
}

interface WebhookIntegration {
  type: 'webhook';
  properties?: WebhookIntegrationProps;
}

type UserIntegration = MsTeamsIntegration | SlackIntegration | EmailIntegration | DiscordIntegration | WebhookIntegration;

type UserIntegrationType = UserIntegration['type'];
