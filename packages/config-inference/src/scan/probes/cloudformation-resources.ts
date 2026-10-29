/**
 * CloudFormation resources that SAM templates and Serverless `resources` declare the same way: what init carries from
 * a queue, topic, bucket or table, and whether a resource deploys at all.
 */

import type { DependencyFact } from '../../facts/dependency';
import {
  conditionHolds,
  declaredNumber,
  declaredQueueSettings,
  resolveDeclaredValue,
  UNRESOLVED,
  type TemplateScope
} from './declared-function';
import { isOmitted, omitFor, reviewKeys, type KeyReview, type KeyRules } from './declared-keys';

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The logical ID a `Ref`, `Fn::GetAtt` or `Fn::Sub` names, when it is one of `known`. */
export const referencedLogicalId = (value: unknown, known: ReadonlySet<string>): string | undefined => {
  if (!isRecord(value)) return undefined;
  if (typeof value.Ref === 'string') return known.has(value.Ref) ? value.Ref : undefined;
  const getAtt = value['Fn::GetAtt'];
  const target = Array.isArray(getAtt) ? getAtt[0] : typeof getAtt === 'string' ? getAtt.split('.')[0] : undefined;
  if (typeof target === 'string') return known.has(target) ? target : undefined;
  const sub = value['Fn::Sub'];
  const template = Array.isArray(sub) ? sub[0] : sub;
  if (typeof template !== 'string') return undefined;
  return [...known].find((logicalId) => template.includes(`\${${logicalId}}`) || template.includes(`\${${logicalId}.`));
};

/** Attributes every template resource can carry next to `Type` and `Properties`. */
export const RESOURCE_ATTRIBUTES: KeyRules = {
  Type: 'carried',
  Properties: 'carried',
  Condition: 'carried',
  DependsOn: 'ignored',
  Metadata: 'ignored',
  // Stacktape decides what a stack deletion keeps; a declared Retain is worth knowing about.
  DeletionPolicy: 'not-carried',
  UpdateReplacePolicy: 'not-carried',
  UpdatePolicy: 'ignored',
  CreationPolicy: 'ignored'
};

const QUEUE_PROPERTIES: KeyRules = {
  FifoQueue: 'carried',
  ContentBasedDeduplication: 'carried',
  VisibilityTimeout: 'carried',
  RedrivePolicy: 'carried',
  QueueName: 'ignored',
  Tags: 'ignored',
  SqsManagedSseEnabled: 'ignored',
  MessageRetentionPeriod: 'not-carried',
  DelaySeconds: 'not-carried',
  MaximumMessageSize: 'not-carried',
  ReceiveMessageWaitTimeSeconds: 'not-carried',
  RedriveAllowPolicy: 'not-carried',
  DeduplicationScope: 'not-carried',
  FifoThroughputLimit: 'not-carried',
  KmsMasterKeyId: 'carried',
  KmsDataKeyReusePeriodSeconds: 'not-carried'
};

const TOPIC_PROPERTIES: KeyRules = {
  TopicName: 'ignored',
  DisplayName: 'ignored',
  Tags: 'ignored',
  Subscription: 'not-carried',
  DeliveryStatusLogging: 'ignored',
  TracingConfig: 'ignored',
  ArchivePolicy: 'not-carried',
  DataProtectionPolicy: 'not-carried',
  SignatureVersion: 'not-carried',
  KmsMasterKeyId: 'carried',
  FifoTopic: 'execution',
  ContentBasedDeduplication: 'execution'
};

const BUCKET_PROPERTIES: KeyRules = {
  VersioningConfiguration: 'carried',
  BucketName: 'ignored',
  Tags: 'ignored',
  OwnershipControls: 'ignored',
  // Stacktape buckets block public access; leaving a looser setting out makes the bucket more private.
  PublicAccessBlockConfiguration: 'ignored',
  AccessControl: 'not-carried',
  CorsConfiguration: 'not-carried',
  LifecycleConfiguration: 'not-carried',
  NotificationConfiguration: 'not-carried',
  WebsiteConfiguration: 'not-carried',
  LoggingConfiguration: 'not-carried',
  IntelligentTieringConfigurations: 'not-carried',
  InventoryConfigurations: 'not-carried',
  MetricsConfigurations: 'not-carried',
  AnalyticsConfigurations: 'not-carried',
  AccelerateConfiguration: 'not-carried',
  ReplicationConfiguration: 'not-carried',
  BucketEncryption: 'carried',
  ObjectLockEnabled: 'storage',
  ObjectLockConfiguration: 'storage'
};

const TABLE_PROPERTIES: KeyRules = {
  AttributeDefinitions: 'carried',
  KeySchema: 'carried',
  BillingMode: 'ignored',
  TableName: 'ignored',
  Tags: 'ignored',
  ContributorInsightsSpecification: 'ignored',
  TableClass: 'not-carried',
  ProvisionedThroughput: 'not-carried',
  StreamSpecification: 'not-carried',
  TimeToLiveSpecification: 'not-carried',
  GlobalSecondaryIndexes: 'not-carried',
  LocalSecondaryIndexes: 'not-carried',
  PointInTimeRecoverySpecification: 'not-carried',
  DeletionProtectionEnabled: 'not-carried',
  KinesisStreamSpecification: 'not-carried',
  ImportSourceSpecification: 'not-carried',
  OnDemandThroughput: 'not-carried',
  ResourcePolicy: 'not-carried',
  SSESpecification: 'carried'
};

export const DEPENDENCY_PROPERTIES: Readonly<Record<string, KeyRules>> = {
  'AWS::SQS::Queue': QUEUE_PROPERTIES,
  'AWS::SNS::Topic': TOPIC_PROPERTIES,
  'AWS::S3::Bucket': BUCKET_PROPERTIES,
  'AWS::DynamoDB::Table': TABLE_PROPERTIES
};

/**
 * Whether a template resource deploys with the parameters' defaults. A resource whose `Condition` is not provably
 * true is left out with a gap: CloudFormation creates it only when the condition holds.
 */
export const conditionReview = (resource: RecordValue, scope: TemplateScope, review: KeyReview): void => {
  if (resource.Condition === undefined) return;
  const holds = typeof resource.Condition === 'string' ? conditionHolds(resource.Condition, scope) : undefined;
  if (holds !== true) omitFor(review, `Condition: ${String(resource.Condition)}`.replace(/\s+/g, ''), 'condition');
};

const ATTRIBUTE_TYPES = { S: 'string', N: 'number', B: 'binary' } as const;

/** A table's declared key with its attribute types, or undefined when the declaration is not literal. */
export const declaredTableKey = (properties: RecordValue, scope: TemplateScope): DependencyFact['tableKey'] => {
  const schema = resolveDeclaredValue(properties.KeySchema, scope);
  const definitions = resolveDeclaredValue(properties.AttributeDefinitions, scope);
  if (!Array.isArray(schema) || !Array.isArray(definitions)) return undefined;
  const attribute = (keyType: string) => {
    const name = schema.find((entry) => isRecord(entry) && entry.KeyType === keyType);
    const attributeName = isRecord(name) ? name.AttributeName : undefined;
    if (typeof attributeName !== 'string') return undefined;
    const definition = definitions.find((entry) => isRecord(entry) && entry.AttributeName === attributeName);
    const type = isRecord(definition)
      ? ATTRIBUTE_TYPES[definition.AttributeType as keyof typeof ATTRIBUTE_TYPES]
      : undefined;
    return type === undefined ? undefined : { name: attributeName, type };
  };
  const partitionKey = attribute('HASH');
  if (partitionKey === undefined) return undefined;
  const sortKey = attribute('RANGE');
  if (schema.some((entry) => isRecord(entry) && entry.KeyType === 'RANGE') && sortKey === undefined) return undefined;
  return { partitionKey, ...(sortKey === undefined ? {} : { sortKey }) };
};

/** A queue's `RedrivePolicy` as a dead-letter target, or `UNRESOLVED` when init cannot tell where failures go. */
export const declaredDeadLetter = (
  policy: unknown,
  scope: TemplateScope,
  queueNames: ReadonlyMap<string, string>
): NonNullable<DependencyFact['queueSettings']>['deadLetter'] | typeof UNRESOLVED | undefined => {
  if (policy === undefined) return undefined;
  const parsed =
    typeof policy === 'string'
      ? (() => {
          try {
            return JSON.parse(policy) as unknown;
          } catch {
            return undefined;
          }
        })()
      : policy;
  if (!isRecord(parsed)) return UNRESOLVED;
  const maxReceiveCount = declaredNumber(parsed.maxReceiveCount, scope);
  if (typeof maxReceiveCount !== 'number' || maxReceiveCount < 1 || maxReceiveCount > 1000) return UNRESOLVED;
  const target = parsed.deadLetterTargetArn;
  const targetId = referencedLogicalId(target, new Set(queueNames.keys()));
  if (targetId !== undefined) return { dependencyName: queueNames.get(targetId)!, maxReceiveCount };
  const arn = resolveDeclaredValue(target, scope);
  if (typeof arn === 'string' && /^arn:aws[a-z-]*:sqs:[a-z0-9-]+:\d{12}:[A-Za-z0-9_.-]+$/.test(arn)) {
    return { queueArn: arn, maxReceiveCount };
  }
  return UNRESOLVED;
};

const DATABASE_PROPERTIES: KeyRules = {
  Engine: 'carried',
  EngineVersion: 'carried',
  DBInstanceIdentifier: 'ignored',
  DBClusterIdentifier: 'ignored',
  DBName: 'ignored',
  DatabaseName: 'ignored',
  Tags: 'ignored',
  // Stacktape databases are private; leaving a public setting out makes the database more private.
  PubliclyAccessible: 'ignored',
  KmsKeyId: 'encryption',
  MasterUserPassword: 'not-carried',
  ManageMasterUserPassword: 'not-carried',
  MasterUsername: 'not-carried'
};

const CACHE_AND_SEARCH_PROPERTIES: KeyRules = {
  Engine: 'carried',
  EngineVersion: 'carried',
  Tags: 'ignored',
  ClusterName: 'ignored',
  ReplicationGroupId: 'ignored',
  DomainName: 'ignored',
  KmsKeyId: 'encryption',
  EncryptionAtRestOptions: 'encryption',
  AtRestEncryptionEnabled: 'encryption',
  TransitEncryptionEnabled: 'encryption',
  AuthToken: 'access',
  AccessPolicies: 'access',
  AdvancedSecurityOptions: 'access'
};

const RULES_BY_TYPE: Readonly<Record<string, KeyRules>> = {
  ...DEPENDENCY_PROPERTIES,
  'AWS::RDS::DBInstance': DATABASE_PROPERTIES,
  'AWS::RDS::DBCluster': DATABASE_PROPERTIES,
  'AWS::ElastiCache::CacheCluster': CACHE_AND_SEARCH_PROPERTIES,
  'AWS::ElastiCache::ReplicationGroup': CACHE_AND_SEARCH_PROPERTIES,
  'AWS::OpenSearchService::Domain': CACHE_AND_SEARCH_PROPERTIES,
  'AWS::Elasticsearch::Domain': CACHE_AND_SEARCH_PROPERTIES
};

/** An AWS managed key (`alias/aws/sqs`), which Stacktape's default encryption stands in for, unlike a customer's own. */
const AWS_MANAGED_KEY = /^alias\/aws\//;

/**
 * At-rest encryption a declaration chooses. A customer-managed key is a decision about who may decrypt the data, so a
 * resource that declares one is left out rather than written with Stacktape's default encryption. AWS-owned and
 * AWS-managed keys are encryption Stacktape's default already provides; they are reported, not blocking.
 */
const encryptionReview = (type: string, properties: RecordValue, scope: TemplateScope, review: KeyReview): void => {
  const key = (value: unknown, path: string): void => {
    if (value === undefined) return;
    const resolved = resolveDeclaredValue(value, scope);
    if (typeof resolved === 'string' && AWS_MANAGED_KEY.test(resolved)) review.notCarried.push(path);
    else omitFor(review, path, 'encryption');
  };
  if (type === 'AWS::SQS::Queue' || type === 'AWS::SNS::Topic') key(properties.KmsMasterKeyId, 'KmsMasterKeyId');
  if (type === 'AWS::DynamoDB::Table' && properties.SSESpecification !== undefined) {
    const sse = resolveDeclaredValue(properties.SSESpecification, scope);
    if (isRecord(sse) && sse.KMSMasterKeyId !== undefined) key(sse.KMSMasterKeyId, 'SSESpecification.KMSMasterKeyId');
    else if (isRecord(sse)) review.notCarried.push('SSESpecification');
    else omitFor(review, 'SSESpecification', 'encryption');
  }
  if (type === 'AWS::S3::Bucket' && properties.BucketEncryption !== undefined) {
    const encryption = resolveDeclaredValue(properties.BucketEncryption, scope);
    const rules = isRecord(encryption) ? encryption.ServerSideEncryptionConfiguration : undefined;
    if (!Array.isArray(rules)) {
      omitFor(review, 'BucketEncryption', 'encryption');
      return;
    }
    for (const rule of rules) {
      const defaults = isRecord(rule) ? rule.ServerSideEncryptionByDefault : undefined;
      const algorithm = isRecord(defaults) ? defaults.SSEAlgorithm : undefined;
      if (algorithm === 'AES256') continue;
      if (isRecord(defaults) && defaults.KMSMasterKeyID !== undefined) {
        key(defaults.KMSMasterKeyID, 'BucketEncryption.KMSMasterKeyID');
      } else review.notCarried.push('BucketEncryption');
    }
  }
};

/**
 * Review a queue, topic, bucket, table, database, cache or search domain declaration, and read the settings init
 * carries from it. A setting it cannot read whose loss would make the resource less safe leaves it out.
 */
export const declaredDependencySettings = (
  type: string,
  properties: RecordValue,
  scope: TemplateScope,
  review: KeyReview,
  queueNames: ReadonlyMap<string, string>
): Pick<DependencyFact, 'queueSettings' | 'tableKey' | 'bucketVersioning'> => {
  const rules = RULES_BY_TYPE[type];
  if (rules !== undefined) reviewKeys(properties, rules, { review });
  encryptionReview(type, properties, scope, review);
  if (type === 'AWS::SQS::Queue') {
    const settings = declaredQueueSettings(properties, scope);
    const deadLetter = declaredDeadLetter(properties.RedrivePolicy, scope, queueNames);
    if (settings === UNRESOLVED) omitFor(review, 'FifoQueue', 'execution');
    if (deadLetter === UNRESOLVED) omitFor(review, 'RedrivePolicy', 'failure-handling');
    if (settings === UNRESOLVED || deadLetter === UNRESOLVED) return {};
    const queueSettings = { ...settings, ...(deadLetter === undefined ? {} : { deadLetter }) };
    return Object.keys(queueSettings).length === 0 ? {} : { queueSettings };
  }
  if (type === 'AWS::DynamoDB::Table') {
    const tableKey = declaredTableKey(properties, scope);
    if (tableKey === undefined) review.notCarried.push('KeySchema');
    return tableKey === undefined ? {} : { tableKey };
  }
  if (type === 'AWS::S3::Bucket' && properties.VersioningConfiguration !== undefined) {
    const versioning = resolveDeclaredValue(properties.VersioningConfiguration, scope);
    if (isRecord(versioning) && versioning.Status === 'Enabled') return { bucketVersioning: true };
    if (!isRecord(versioning) || versioning.Status !== 'Suspended')
      omitFor(review, 'VersioningConfiguration', 'storage');
  }
  return {};
};

const USER_POOL_PROPERTIES: KeyRules = {
  MfaConfiguration: 'carried',
  EnabledMfas: 'carried',
  Policies: 'carried',
  AdminCreateUserConfig: 'carried',
  UserPoolName: 'ignored',
  UserPoolTags: 'ignored',
  AutoVerifiedAttributes: 'not-carried',
  UsernameAttributes: 'not-carried',
  AliasAttributes: 'not-carried',
  UsernameConfiguration: 'not-carried',
  Schema: 'not-carried',
  EmailConfiguration: 'not-carried',
  SmsConfiguration: 'not-carried',
  EmailVerificationMessage: 'not-carried',
  EmailVerificationSubject: 'not-carried',
  SmsVerificationMessage: 'not-carried',
  SmsAuthenticationMessage: 'not-carried',
  VerificationMessageTemplate: 'not-carried',
  AccountRecoverySetting: 'not-carried',
  DeletionProtection: 'not-carried',
  DeviceConfiguration: 'not-carried',
  UserAttributeUpdateSettings: 'not-carried',
  UserPoolTier: 'not-carried',
  WebAuthnRelyingPartyID: 'not-carried',
  WebAuthnUserVerification: 'not-carried',
  // Triggers and threat protection enforce sign-in rules of their own.
  LambdaConfig: 'identity',
  UserPoolAddOns: 'identity'
};

const USER_POOL_CLIENT_PROPERTIES: KeyRules = {
  UserPoolId: 'carried',
  GenerateSecret: 'carried',
  ClientName: 'ignored',
  ExplicitAuthFlows: 'not-carried',
  AllowedOAuthFlows: 'not-carried',
  AllowedOAuthFlowsUserPoolClient: 'not-carried',
  AllowedOAuthScopes: 'not-carried',
  CallbackURLs: 'not-carried',
  LogoutURLs: 'not-carried',
  DefaultRedirectURI: 'not-carried',
  SupportedIdentityProviders: 'not-carried',
  AccessTokenValidity: 'not-carried',
  IdTokenValidity: 'not-carried',
  RefreshTokenValidity: 'not-carried',
  TokenValidityUnits: 'not-carried',
  PreventUserExistenceErrors: 'not-carried',
  EnableTokenRevocation: 'not-carried',
  EnablePropagateAdditionalUserContextData: 'not-carried',
  AuthSessionValidity: 'not-carried',
  ReadAttributes: 'not-carried',
  WriteAttributes: 'not-carried',
  AnalyticsConfiguration: 'not-carried'
};

const MFA_TYPES = { SMS_MFA: 'SMS', SOFTWARE_TOKEN_MFA: 'SOFTWARE_TOKEN', EMAIL_OTP: 'EMAIL_OTP' } as const;

type UserPoolSettings = NonNullable<DependencyFact['userPoolSettings']>;

/** The sign-in rules a pool declaration states, or `UNRESOLVED` when one that protects users cannot be read. */
const userPoolSettings = (
  properties: RecordValue,
  scope: TemplateScope,
  review: KeyReview
): UserPoolSettings | undefined => {
  const settings: UserPoolSettings = {};
  const mfa =
    properties.MfaConfiguration === undefined ? 'OFF' : resolveDeclaredValue(properties.MfaConfiguration, scope);
  const enabled = properties.EnabledMfas === undefined ? [] : resolveDeclaredValue(properties.EnabledMfas, scope);
  if ((mfa !== 'ON' && mfa !== 'OPTIONAL' && mfa !== 'OFF') || !Array.isArray(enabled)) {
    omitFor(review, 'MfaConfiguration', 'identity');
  } else if (mfa !== 'OFF') {
    const known = enabled.filter((type): type is keyof typeof MFA_TYPES => Object.hasOwn(MFA_TYPES, String(type)));
    if (known.length !== enabled.length) omitFor(review, 'EnabledMfas', 'identity');
    const types = known.map((type) => MFA_TYPES[type]);
    settings.mfa = { status: mfa, ...(types.length === 0 ? {} : { enabledTypes: types }) };
  }
  if (properties.Policies !== undefined) {
    const policies = resolveDeclaredValue(properties.Policies, scope);
    const policy = isRecord(policies) ? policies.PasswordPolicy : undefined;
    reviewKeys(policies, { PasswordPolicy: 'carried', SignInPolicy: 'not-carried' }, { prefix: 'Policies.', review });
    if (policy !== undefined) {
      const fields = isRecord(policy) ? policy : undefined;
      const number = (key: string) => (typeof fields?.[key] === 'number' ? (fields[key] as number) : undefined);
      const flag = (key: string) => (typeof fields?.[key] === 'boolean' ? (fields[key] as boolean) : undefined);
      if (fields === undefined) omitFor(review, 'Policies.PasswordPolicy', 'identity');
      else {
        reviewKeys(
          fields,
          {
            MinimumLength: 'carried',
            RequireLowercase: 'carried',
            RequireNumbers: 'carried',
            RequireSymbols: 'carried',
            RequireUppercase: 'carried',
            TemporaryPasswordValidityDays: 'carried',
            PasswordHistorySize: 'identity'
          },
          { prefix: 'Policies.PasswordPolicy.', review, unknown: 'identity' }
        );
        const passwordPolicy = Object.fromEntries(
          Object.entries({
            minimumLength: number('MinimumLength'),
            requireLowercase: flag('RequireLowercase'),
            requireNumbers: flag('RequireNumbers'),
            requireSymbols: flag('RequireSymbols'),
            requireUppercase: flag('RequireUppercase'),
            temporaryPasswordValidityDays: number('TemporaryPasswordValidityDays')
          }).filter(([, value]) => value !== undefined)
        );
        if (Object.keys(passwordPolicy).length > 0) settings.passwordPolicy = passwordPolicy;
      }
    }
  }
  if (properties.AdminCreateUserConfig !== undefined) {
    const config = resolveDeclaredValue(properties.AdminCreateUserConfig, scope);
    reviewKeys(
      config,
      {
        AllowAdminCreateUserOnly: 'carried',
        InviteMessageTemplate: 'not-carried',
        UnusedAccountValidityDays: 'not-carried'
      },
      { prefix: 'AdminCreateUserConfig.', review }
    );
    const adminOnly = isRecord(config) ? config.AllowAdminCreateUserOnly : undefined;
    if (typeof adminOnly === 'boolean') settings.allowOnlyAdminsToCreateAccount = adminOnly;
    else if (adminOnly !== undefined) omitFor(review, 'AdminCreateUserConfig.AllowAdminCreateUserOnly', 'identity');
  }
  return Object.keys(settings).length === 0 ? undefined : settings;
};

export type DeclaredUserPool = { logicalId: string; name: string; settings?: UserPoolSettings; review: KeyReview };

/**
 * The Cognito user pools a template declares, and which pool each of its app clients belongs to.
 *
 * Stacktape gives every pool one app client. A pool with several clients keeps none of them bound: putting two
 * clients' variables on one client would merge identity domains the source keeps apart.
 */
export const declaredUserPools = (
  resources: Readonly<Record<string, unknown>>,
  scope: TemplateScope,
  reviews: ReadonlyMap<string, KeyReview>
): { pools: DeclaredUserPool[]; clientPools: Map<string, string>; clientReviews: Map<string, KeyReview> } => {
  const pools: DeclaredUserPool[] = [];
  for (const [logicalId, resource] of Object.entries(resources)) {
    if (!isRecord(resource) || resource.Type !== 'AWS::Cognito::UserPool') continue;
    const review = reviews.get(logicalId) ?? { omitted: [], notCarried: [] };
    const properties = isRecord(resource.Properties) ? resource.Properties : {};
    reviewKeys(properties, USER_POOL_PROPERTIES, { review });
    const settings = userPoolSettings(properties, scope, review);
    const name = logicalId.slice(0, 1).toLowerCase() + logicalId.slice(1);
    pools.push({ logicalId, name, ...(settings === undefined ? {} : { settings }), review });
  }
  const poolIds = new Set(pools.map((pool) => pool.logicalId));
  const clients = new Map<string, string>();
  const clientReviews = new Map<string, KeyReview>();
  for (const [logicalId, resource] of Object.entries(resources)) {
    if (!isRecord(resource) || resource.Type !== 'AWS::Cognito::UserPoolClient') continue;
    const review = reviews.get(logicalId) ?? { omitted: [], notCarried: [] };
    const properties = isRecord(resource.Properties) ? resource.Properties : {};
    reviewKeys(properties, USER_POOL_CLIENT_PROPERTIES, { review });
    clientReviews.set(logicalId, review);
    const pool = referencedLogicalId(properties.UserPoolId, poolIds);
    if (pool !== undefined) clients.set(logicalId, pool);
    if (resolveDeclaredValue(properties.GenerateSecret, scope) === true) {
      const owner = pools.find((entry) => entry.logicalId === pool);
      if (owner !== undefined) owner.settings = { ...owner.settings, generateClientSecret: true };
    }
  }
  const clientPools = new Map<string, string>();
  for (const [client, pool] of clients) {
    const siblings = [...clients.values()].filter((entry) => entry === pool).length;
    const owner = pools.find((entry) => entry.logicalId === pool)!;
    if (siblings === 1 && !isOmitted(owner.review)) clientPools.set(client, owner.name);
  }
  return { pools, clientPools, clientReviews };
};
