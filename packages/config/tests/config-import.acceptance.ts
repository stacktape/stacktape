import type { StacktapeConfig } from '@stacktape/config';
import type { StacktapeResourceDefinition } from '@stacktape/config/shared';
import type { AnyCloudFormationResource } from '@stacktape/cloudformation/resource';
import { ref } from '@stacktape/cloudformation/intrinsics';
import type { LambdaPackaging } from '@stacktape/config/deployment-artifacts';
import type { HttpApiIntegration } from '@stacktape/config/events';
import type { LambdaFunction } from '@stacktape/config/functions';
import type { Bucket } from '@stacktape/config/buckets';
import type { WebService } from '@stacktape/config/web-services';
import type { BudgetControl } from '@stacktape/config/budget';
import type { AlarmDefinition, AlarmTrigger } from '@stacktape/config/alarms';

/**
 * A real Stacktape configuration built from explicit package imports.
 *
 * This is the compile half of the package's acceptance check, and it is deliberately a separate file from the
 * runtime test: it belongs to the package's own `tsconfig.json`, which compiles with `types: []`. That is the
 * environment a consumer of `@stacktape/config` actually has — no Bun globals, no Node globals — so an
 * accidental dependency on an ambient global cannot pass unnoticed here. The runtime assertions live in
 * `config-import.test.ts`, which needs `@types/bun` and therefore compiles under a laxer library check.
 *
 * Everything is imported through the package's own specifiers - the root, the `./shared` entry point and
 * ordinary wildcard subpaths - so this proves the export map a consumer actually resolves, not the file layout.
 */

export const lambdaPackaging: LambdaPackaging = {
  type: 'stacktape-lambda-buildpack',
  properties: { entryfilePath: 'src/index.ts' }
};

export const httpIntegration: HttpApiIntegration = {
  type: 'http-api-gateway',
  properties: { httpApiGatewayName: 'gateway', method: 'GET', path: '/items' }
};

export const api: LambdaFunction = {
  type: 'function',
  properties: { packaging: lambdaPackaging, events: [httpIntegration], memory: 512 }
};

export const site: WebService = {
  type: 'web-service',
  properties: {
    packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/server.ts' } },
    resources: { cpu: 0.25, memory: 512 }
  }
};

export const uploads: Bucket = { type: 'bucket', properties: { versioning: true } };

export const rawTopic: AnyCloudFormationResource = {
  Type: 'AWS::SNS::Topic',
  Properties: { TopicName: 'legacy-events' }
};

/** An intrinsic function is accepted wherever a raw resource takes a value. */
export const rawSubscription: AnyCloudFormationResource = {
  Type: 'AWS::SNS::Subscription',
  Properties: { TopicArn: ref('Topic') },
  Condition: 'CreateRawResources'
};

// Every resource a user can write must be assignable to the union the schema is generated from.
const resources: Record<string, StacktapeResourceDefinition> = { api, site, uploads };

export const acceptedConfiguration: StacktapeConfig = {
  projectName: 'acceptance',
  resources,
  cloudformationResources: { LegacyTopic: rawTopic }
};

/** Published as `StacktapeBudgetControl`; authored, but not reachable from the configuration root. */
export const monthlyBudget: BudgetControl = {
  limit: 200,
  notifications: [{ budgetType: 'FORECASTED', thresholdPercentage: 80, emails: ['ops@example.com'] }]
};

export type AlarmDefinitionSurface = Pick<
  AlarmDefinition,
  | 'name'
  | 'trigger'
  | 'forServices'
  | 'forStages'
  | 'description'
  | 'evaluation'
  | 'includeInHistory'
  | 'notificationTargets'
>;

export const alarmTrigger: AlarmTrigger = {
  type: 'lambda-error-rate',
  properties: { thresholdPercent: 5 }
};

export const alarmDefinition: AlarmDefinition = {
  name: 'api-error-rate',
  trigger: alarmTrigger,
  forServices: ['api'],
  forStages: ['production'],
  description: 'API error rate too high',
  evaluation: { period: 60, evaluationPeriods: 5, breachedPeriods: 3 },
  includeInHistory: true
};
