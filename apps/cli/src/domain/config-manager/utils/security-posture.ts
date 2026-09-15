import type {
  SecurityExposureEntry,
  SecurityFindingSeverity,
  SecurityReportFinding,
  SecurityRuleId
} from '@stacktape/console-api/security';
import type { StpApplicationLoadBalancer } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { StpDynamoTable } from '@domain-services/config-manager/resolved-types/dynamo-db-tables';
import type { StpEfsFilesystem } from '@domain-services/config-manager/resolved-types/efs-filesystem';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { StpOpenSearchDomain } from '@domain-services/config-manager/resolved-types/open-search';
import type { StpRelationalDatabase } from '@domain-services/config-manager/resolved-types/relational-databases';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import type { StackContext } from '@domain-services/stack-context';
import { SECURITY_RULES, SECURITY_SEVERITY_RANK } from '@stacktape/console-api/security';
import { classifyStage } from '@stacktape/console-api/stages';
import type { StacktapeConfig } from '@stacktape/config';
import type { StpIamRoleStatement } from '@stacktape/config/shared';
import type { ConfigManager } from '../index';

/**
 * Security posture: what the resolved configuration says about how exposed and how recoverable this stack is.
 *
 * Every rule here reads the same resolved resources the guardrails read, but reports every violation instead of
 * stopping at the first one, and never throws. The CLI prints the findings and, after a successful deployment,
 * reports them to the Console. Secret detection is the one rule that reads the raw configuration: after directive
 * resolution a `$Secret()` reference and a pasted credential look the same.
 */

export type SecurityPostureAssessment = {
  findings: SecurityReportFinding[];
  exposure: SecurityExposureEntry[];
  isProduction: boolean;
};

type RuleContext = {
  configManager: ConfigManager;
  rawConfig: StacktapeConfig | null | undefined;
  stackContext: StackContext;
  isProduction: boolean;
};

type FindingParams = {
  resourceName?: string;
  resourceType?: string;
  message: string;
  remediation: string;
  severity?: SecurityFindingSeverity;
  /** Distinguishes several findings of one rule on one resource, for example two IAM statements. */
  fingerprintSuffix?: string;
  details?: Record<string, unknown>;
};

const createFinding = (ruleId: SecurityRuleId, params: FindingParams): SecurityReportFinding => {
  const rule = SECURITY_RULES[ruleId];
  return {
    kind: rule.kind,
    ruleId,
    fingerprint: [ruleId, params.resourceName ?? 'stack', params.fingerprintSuffix].filter(Boolean).join(':'),
    severity: params.severity ?? rule.defaultSeverity,
    title: rule.title,
    message: params.message,
    remediation: params.remediation,
    ...(params.resourceName ? { resourceName: params.resourceName } : {}),
    ...(params.resourceType ? { resourceType: params.resourceType } : {}),
    ...(params.details ? { details: params.details } : {})
  };
};

type NamedResource = { name: string; type?: string };
const resourceTypeOf = (resource: NamedResource, fallback: string) => resource.type ?? fallback;

const databaseRules = ({ configManager, isProduction }: RuleContext): SecurityReportFinding[] => {
  const findings: SecurityReportFinding[] = [];
  for (const db of configManager.databases as (StpRelationalDatabase & NamedResource)[]) {
    const mode = db.accessibility?.accessibilityMode || 'internet';
    if (mode === 'internet') {
      findings.push(
        createFinding('database-reachable-from-internet', {
          resourceName: db.name,
          resourceType: resourceTypeOf(db, 'relational-database'),
          message: `Database \`${db.name}\` uses accessibility mode \`internet\`, so any address on the internet can open a connection to it.`,
          remediation: `Set \`accessibility.accessibilityMode\` on \`${db.name}\` to \`scoping-workloads-in-vpc\` (or \`vpc\`) and connect your workloads through \`connectTo\`.`
        })
      );
    }
    if (isProduction && !db.deletionProtection) {
      findings.push(
        createFinding('database-deletion-protection-disabled', {
          resourceName: db.name,
          resourceType: resourceTypeOf(db, 'relational-database'),
          message: `Production database \`${db.name}\` can be deleted without a second confirmation.`,
          remediation: `Set \`deletionProtection: true\` on \`${db.name}\`.`
        })
      );
    }
    if (isProduction && db.automatedBackupRetentionDays === 0) {
      findings.push(
        createFinding('database-backups-disabled', {
          resourceName: db.name,
          resourceType: resourceTypeOf(db, 'relational-database'),
          message: `Production database \`${db.name}\` disables automated backups (\`automatedBackupRetentionDays: 0\`).`,
          remediation: `Set \`automatedBackupRetentionDays\` on \`${db.name}\` to at least \`7\`.`
        })
      );
    }
  }
  for (const domain of configManager.openSearchDomains as (StpOpenSearchDomain & NamedResource)[]) {
    const mode = domain.accessibility?.accessibilityMode || 'internet';
    if (mode === 'internet') {
      findings.push(
        createFinding('database-reachable-from-internet', {
          resourceName: domain.name,
          resourceType: resourceTypeOf(domain, 'open-search-domain'),
          message: `OpenSearch domain \`${domain.name}\` uses accessibility mode \`internet\`, so any address on the internet can reach it.`,
          remediation: `Set \`accessibility.accessibilityMode\` on \`${domain.name}\` to \`scoping-workloads-in-vpc\` (or \`vpc\`).`
        })
      );
    }
  }
  for (const db of configManager.dsqlDatabases as ({ deletionProtection?: boolean } & NamedResource)[]) {
    if (isProduction && !db.deletionProtection) {
      findings.push(
        createFinding('database-deletion-protection-disabled', {
          resourceName: db.name,
          resourceType: resourceTypeOf(db, 'dsql-database'),
          message: `Production Aurora DSQL database \`${db.name}\` can be deleted without a second confirmation.`,
          remediation: `Set \`deletionProtection: true\` on \`${db.name}\`.`
        })
      );
    }
  }
  if (isProduction) {
    for (const table of configManager.dynamoDbTables as (StpDynamoTable & NamedResource)[]) {
      if (!table.enablePointInTimeRecovery) {
        findings.push(
          createFinding('database-backups-disabled', {
            resourceName: table.name,
            resourceType: resourceTypeOf(table, 'dynamo-db-table'),
            message: `Production DynamoDB table \`${table.name}\` has no point-in-time recovery, so a bad write cannot be undone.`,
            remediation: `Set \`enablePointInTimeRecovery: true\` on \`${table.name}\`.`
          })
        );
      }
    }
    for (const filesystem of configManager.efsFilesystems as (StpEfsFilesystem & NamedResource)[]) {
      if (!filesystem.backupEnabled) {
        findings.push(
          createFinding('database-backups-disabled', {
            resourceName: filesystem.name,
            resourceType: resourceTypeOf(filesystem, 'efs-filesystem'),
            message: `Production EFS filesystem \`${filesystem.name}\` is not backed up.`,
            remediation: `Set \`backupEnabled: true\` on \`${filesystem.name}\`.`
          })
        );
      }
    }
  }
  return findings;
};

const loadBalancerRules = ({ configManager }: RuleContext): SecurityReportFinding[] => {
  const findings: SecurityReportFinding[] = [];
  // Convex owns a fixed internal load balancer without a `useFirewall` setting; the same exclusion the guardrail uses.
  const configurable = (
    configManager.allApplicationLoadBalancers as (StpApplicationLoadBalancer & {
      configParentResourceType?: string;
    } & NamedResource)[]
  ).filter(({ configParentResourceType }) => configParentResourceType !== 'convex');
  for (const alb of configurable) {
    if (!alb.useFirewall) {
      findings.push(
        createFinding('load-balancer-without-firewall', {
          resourceName: alb.name,
          resourceType: resourceTypeOf(alb, 'application-load-balancer'),
          message: `Application load balancer \`${alb.name}\` accepts requests from the internet without a web application firewall.`,
          remediation: `Add a \`web-app-firewall\` resource and reference it with \`useFirewall\` on \`${alb.name}\`.`
        })
      );
    }
  }
  return findings;
};

const bucketRules = ({ configManager }: RuleContext): SecurityReportFinding[] => {
  const findings: SecurityReportFinding[] = [];
  for (const bucket of configManager.buckets as (StpBucket & NamedResource)[]) {
    const mode = bucket.accessibility?.accessibilityMode;
    if (mode !== 'public-read' && mode !== 'public-read-write') continue;
    const writable = mode === 'public-read-write';
    findings.push(
      createFinding('bucket-publicly-accessible', {
        resourceName: bucket.name,
        resourceType: resourceTypeOf(bucket, 'bucket'),
        severity: writable ? 'HIGH' : 'MEDIUM',
        message: writable
          ? `Bucket \`${bucket.name}\` lets anyone on the internet read and write its objects (\`public-read-write\`).`
          : `Bucket \`${bucket.name}\` lets anyone on the internet read its objects (\`public-read\`).`,
        remediation: `Set \`accessibility.accessibilityMode\` on \`${bucket.name}\` to \`private\`, or use a \`hosting-bucket\` for files that are meant to be public.`,
        details: { accessibilityMode: mode }
      })
    );
  }
  return findings;
};

type WorkloadWithRole = NamedResource & { iamRoleStatements?: StpIamRoleStatement[] };
const iamRules = ({ configManager }: RuleContext): SecurityReportFinding[] => {
  const findings: SecurityReportFinding[] = [];
  const workloads = [
    ...(configManager.functions as (StpLambdaFunction & NamedResource)[]).map((fn) => ({
      ...fn,
      type: resourceTypeOf(fn, 'function')
    })),
    ...(configManager.edgeLambdaFunctions as WorkloadWithRole[]).map((fn) => ({
      ...fn,
      type: resourceTypeOf(fn, 'edge-lambda-function')
    })),
    ...(configManager.allContainerWorkloads as WorkloadWithRole[]).map((workload) => ({
      ...workload,
      type: resourceTypeOf(workload, 'multi-container-workload')
    })),
    ...(configManager.batchJobs as WorkloadWithRole[]).map((job) => ({
      ...job,
      type: resourceTypeOf(job, 'batch-job')
    }))
  ] as WorkloadWithRole[];
  for (const workload of workloads) {
    (workload.iamRoleStatements || []).forEach((statement, index) => {
      if (statement.Effect && statement.Effect !== 'Allow') return;
      const actions = statement.Action || [];
      const resources = statement.Resource || [];
      const suffix = `statement-${index}`;
      if (actions.includes('*')) {
        findings.push(
          createFinding('iam-statement-allows-any-action', {
            resourceName: workload.name,
            resourceType: workload.type,
            fingerprintSuffix: suffix,
            message: `\`${workload.name}\` has an IAM role statement with \`Action: "*"\`, which allows every AWS action${resources.includes('*') ? ' on every resource' : ''}.`,
            remediation: `List the specific actions \`${workload.name}\` needs in \`iamRoleStatements\`, or use \`connectTo\` to let Stacktape grant the minimal permissions.`,
            details: { statementIndex: index }
          })
        );
        return;
      }
      const wildcardServiceActions = actions.filter((action) => /^[a-z0-9-]+:\*$/i.test(action));
      if (wildcardServiceActions.length && resources.includes('*')) {
        findings.push(
          createFinding('iam-statement-wildcard-service-on-any-resource', {
            resourceName: workload.name,
            resourceType: workload.type,
            fingerprintSuffix: suffix,
            message: `\`${workload.name}\` has an IAM role statement allowing ${wildcardServiceActions.map((action) => `\`${action}\``).join(', ')} on every resource (\`Resource: "*"\`).`,
            remediation: `Narrow the statement on \`${workload.name}\` to the actions it uses and to the ARNs of the resources it touches.`,
            details: { statementIndex: index, actions: wildcardServiceActions }
          })
        );
      }
    });
  }
  return findings;
};

const resilienceRules = ({ configManager, isProduction }: RuleContext): SecurityReportFinding[] => {
  const findings: SecurityReportFinding[] = [];
  if (isProduction && !configManager.deploymentConfig.terminationProtection) {
    findings.push(
      createFinding('stack-termination-protection-disabled', {
        message: 'The production stack can be deleted in one step, with every resource in it.',
        remediation: 'Set `deploymentConfig.terminationProtection` to `true`.'
      })
    );
  }
  if (isProduction) {
    const workloads = (
      configManager.allContainerWorkloads as ({
        configParentResourceType?: string;
        scaling: { minInstances: number };
      } & NamedResource)[]
    ).filter(({ configParentResourceType }) => configParentResourceType !== 'convex');
    for (const workload of workloads) {
      if (workload.scaling.minInstances < 2) {
        findings.push(
          createFinding('container-single-instance-in-production', {
            resourceName: workload.name,
            resourceType: resourceTypeOf(workload, 'multi-container-workload'),
            message: `Production container service \`${workload.name}\` runs \`${workload.scaling.minInstances}\` instance, so one failure or one deployment interrupts it.`,
            remediation: `Set \`scaling.minInstances\` on \`${workload.name}\` to at least \`2\`.`
          })
        );
      }
    }
  }
  for (const queue of configManager.sqsQueues as (StpSqsQueue & NamedResource)[]) {
    if (!queue.redrivePolicy) {
      findings.push(
        createFinding('queue-without-dead-letter-queue', {
          resourceName: queue.name,
          resourceType: resourceTypeOf(queue, 'sqs-queue'),
          message: `Queue \`${queue.name}\` drops messages that keep failing once they expire, without keeping a copy.`,
          remediation: `Configure \`redrivePolicy\` on \`${queue.name}\` with a dead-letter queue.`
        })
      );
    }
  }
  return findings;
};

// ── Secret detection over the raw configuration ──

/** A directive such as `$Secret('name')` or `$SsmParam('name')`: a reference, never a value. */
const DIRECTIVE_PATTERN = /^\$[A-Z][A-Za-z]*\(/;
const SECRET_LIKE_NAME =
  /(secret|token|passw(or)?d|pwd|api[_-]?key|private[_-]?key|access[_-]?key|credential|auth[_-]?key|signing[_-]?key|client[_-]?secret)/i;
const PLACEHOLDER_VALUE =
  /(^<.*>$|\$\{|^your[-_ ]|change[-_ ]?me|replace[-_ ]?me|placeholder|example|dummy|xxxx|todo|^test$|^none$|^null$|^undefined$|^\*+$)/i;

const KNOWN_SECRET_PATTERNS: Array<{ id: string; test: (value: string) => boolean }> = [
  { id: 'aws-access-key-id', test: (value) => /\b(AKIA|ASIA)[0-9A-Z]{16}\b/.test(value) },
  { id: 'private-key', test: (value) => /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value) },
  { id: 'github-token', test: (value) => /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/.test(value) },
  { id: 'stripe-key', test: (value) => /\b[sr]k_(live|test)_[A-Za-z0-9]{16,}\b/.test(value) },
  { id: 'slack-token', test: (value) => /\bxox[baprs]-[A-Za-z0-9-]{10,}/.test(value) },
  { id: 'google-api-key', test: (value) => /\bAIza[0-9A-Za-z_-]{35}\b/.test(value) },
  { id: 'stacktape-api-key', test: (value) => /\bstp_(live|job)[._][A-Za-z0-9_.-]{10,}/.test(value) },
  { id: 'jwt', test: (value) => /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/.test(value) },
  // A connection string that carries a password in its authority part, before the host.
  { id: 'connection-string-with-password', test: (value) => /^[a-z][a-z0-9+.-]*:\/\/[^:/\s@]+:[^@/\s]+@/i.test(value) }
];

const shannonEntropy = (value: string) => {
  const counts = new Map<string, number>();
  for (const character of value) counts.set(character, (counts.get(character) || 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
};

/** Which pattern a plain environment value matches, or null when it looks like ordinary configuration. */
export const detectSecretLikeValue = ({ name, value }: { name: string; value: unknown }): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || DIRECTIVE_PATTERN.test(trimmed)) return null;
  const known = KNOWN_SECRET_PATTERNS.find(({ test }) => test(trimmed));
  if (known) return known.id;
  if (!SECRET_LIKE_NAME.test(name)) return null;
  if (trimmed.length < 16 || /\s/.test(trimmed) || PLACEHOLDER_VALUE.test(trimmed)) return null;
  // A generic credential is long and random; a named-but-innocent value such as `TOKEN_TTL=3600s` is neither.
  if (!/\d/.test(trimmed) || !/[A-Za-z]/.test(trimmed) || shannonEntropy(trimmed) < 3.2) return null;
  return 'high-entropy-value-in-secret-like-variable';
};

type EnvironmentEntry = { name: string; value: unknown };

const environmentEntriesOf = (environment: unknown): EnvironmentEntry[] => {
  if (Array.isArray(environment)) {
    return environment.filter(
      (entry): entry is EnvironmentEntry => !!entry && typeof entry === 'object' && typeof entry.name === 'string'
    );
  }
  if (environment && typeof environment === 'object') {
    return Object.entries(environment as Record<string, unknown>).map(([name, value]) => ({ name, value }));
  }
  return [];
};

/**
 * Walks one resource's raw properties for `environment` blocks. Containers of a multi-container workload nest
 * theirs, so the path is kept to name the exact spot in the finding.
 */
const collectEnvironmentBlocks = (
  value: unknown,
  path: string[],
  onBlock: (path: string[], entries: EnvironmentEntry[]) => void,
  depth = 0
) => {
  if (!value || typeof value !== 'object' || depth > 8) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectEnvironmentBlocks(item, [...path, String(index)], onBlock, depth + 1));
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'environment') onBlock([...path, key], environmentEntriesOf(child));
    else collectEnvironmentBlocks(child, [...path, key], onBlock, depth + 1);
  }
};

const secretRules = ({ rawConfig }: RuleContext): SecurityReportFinding[] => {
  const findings: SecurityReportFinding[] = [];
  const resources = (rawConfig?.resources || {}) as Record<string, { type?: string; properties?: unknown }>;
  for (const [resourceName, resource] of Object.entries(resources)) {
    collectEnvironmentBlocks(resource?.properties, [], (path, entries) => {
      for (const { name, value } of entries) {
        const pattern = detectSecretLikeValue({ name, value });
        if (!pattern) continue;
        const location = path.length > 1 ? ` (\`${path.join('.')}\`)` : '';
        // The message deliberately never includes the value: the finding travels to the Console and into logs.
        findings.push(
          createFinding('secret-in-environment-variable', {
            resourceName,
            resourceType: resource?.type,
            fingerprintSuffix: `${path.join('.')}.${name}`,
            message: `Environment variable \`${name}\` on \`${resourceName}\`${location} holds a value that looks like a credential (${pattern.replaceAll('-', ' ')}).`,
            remediation: `Store the value with \`stacktape secret:create\`, reference it as \`$Secret('...')\`, remove it from the configuration, and rotate the credential: a value committed to Git stays valid until it is revoked.`,
            details: { pattern, variableName: name, path }
          })
        );
      }
    });
  }
  return findings;
};

// ── Exposure: what the internet can reach ──

const exposureEntries = ({ configManager }: RuleContext): SecurityExposureEntry[] => {
  const entries: SecurityExposureEntry[] = [];
  type Endpoint = NamedResource & { useFirewall?: string };
  const publicEndpoint = (resource: Endpoint, fallbackType: string, firewallCapable = true) =>
    entries.push({
      kind: 'public-endpoint',
      resourceName: resource.name,
      resourceType: resourceTypeOf(resource, fallbackType),
      accessibility: 'internet',
      ...(firewallCapable ? { protectedByFirewall: Boolean(resource.useFirewall) } : {})
    });
  for (const service of configManager.webServices as Endpoint[]) publicEndpoint(service, 'web-service');
  for (const alb of configManager.applicationLoadBalancers as Endpoint[])
    publicEndpoint(alb, 'application-load-balancer');
  for (const gateway of configManager.httpApiGateways as Endpoint[]) publicEndpoint(gateway, 'http-api-gateway', false);
  for (const bucket of configManager.hostingBuckets as Endpoint[]) publicEndpoint(bucket, 'hosting-bucket');
  for (const web of [
    ...configManager.nextjsWebs,
    ...configManager.astroWebs,
    ...configManager.nuxtWebs,
    ...configManager.sveltekitWebs,
    ...configManager.solidstartWebs,
    ...configManager.tanstackWebs,
    ...configManager.remixWebs
  ] as Endpoint[]) {
    publicEndpoint(web, 'ssr-web');
  }
  for (const db of configManager.databases as (StpRelationalDatabase & NamedResource)[]) {
    entries.push({
      kind: 'database',
      resourceName: db.name,
      resourceType: resourceTypeOf(db, 'relational-database'),
      accessibility: db.accessibility?.accessibilityMode || 'internet'
    });
  }
  for (const domain of configManager.openSearchDomains as (StpOpenSearchDomain & NamedResource)[]) {
    entries.push({
      kind: 'database',
      resourceName: domain.name,
      resourceType: resourceTypeOf(domain, 'open-search-domain'),
      accessibility: domain.accessibility?.accessibilityMode || 'internet'
    });
  }
  for (const bucket of configManager.buckets as (StpBucket & NamedResource)[]) {
    const mode = bucket.accessibility?.accessibilityMode || 'private';
    if (mode === 'private') continue;
    entries.push({
      kind: 'bucket',
      resourceName: bucket.name,
      resourceType: resourceTypeOf(bucket, 'bucket'),
      accessibility: mode
    });
  }
  return entries;
};

const sortFindings = (findings: SecurityReportFinding[]) =>
  findings.toSorted(
    (a, b) =>
      SECURITY_SEVERITY_RANK[a.severity] - SECURITY_SEVERITY_RANK[b.severity] ||
      a.fingerprint.localeCompare(b.fingerprint)
  );

export const assessSecurityPosture = ({
  configManager,
  rawConfig,
  stackContext
}: {
  configManager: ConfigManager;
  rawConfig: StacktapeConfig | null | undefined;
  stackContext: StackContext;
}): SecurityPostureAssessment => {
  const { isProduction } = classifyStage({
    stageName: stackContext.stage,
    explicitStageType: configManager.stackConfig?.stageType
  });
  const context: RuleContext = { configManager, rawConfig, stackContext, isProduction };
  const findings = sortFindings([
    ...databaseRules(context),
    ...loadBalancerRules(context),
    ...bucketRules(context),
    ...iamRules(context),
    ...resilienceRules(context),
    ...secretRules(context)
  ]);
  return { findings, exposure: exposureEntries(context), isProduction };
};

/** `1 critical, 2 high, 1 low` or `no findings`, for the deploy output. */
export const summarizeSecurityFindings = (findings: ReadonlyArray<SecurityReportFinding>): string => {
  if (!findings.length) return 'no findings';
  const counts = new Map<SecurityFindingSeverity, number>();
  for (const finding of findings) counts.set(finding.severity, (counts.get(finding.severity) || 0) + 1);
  return [...counts.entries()]
    .toSorted(([a], [b]) => SECURITY_SEVERITY_RANK[a] - SECURITY_SEVERITY_RANK[b])
    .map(([severity, count]) => `${count} ${severity.toLowerCase()}`)
    .join(', ');
};
