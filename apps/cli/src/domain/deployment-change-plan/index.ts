import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { ResourceImpact } from '@aws-cdk/cloudformation-diff';
import { createHash } from 'node:crypto';
import { getStacktapeVersion } from '@utils/versioning';

export const CHANGE_PLAN_SCHEMA_VERSION = 'stacktape.change-plan.v1' as const;
export const DANGER_RULES_VERSION = 1 as const;

export const getChangePlanProducerVersion = () => {
  try {
    return getStacktapeVersion();
  } catch {
    // The version constant is injected in release builds and absent in direct source tests.
    return '4.0.0-dev.0';
  }
};

type Sha256 = `sha256:${string}`;

type DangerousResource = {
  stpResourceName: string;
  resourceType: string;
  impactedCfResources: Record<
    string,
    {
      cfResourceType: string;
      impact: ResourceImpact;
    }
  >;
};

export type DeploymentChangePlanV1 = {
  schemaVersion: typeof CHANGE_PLAN_SCHEMA_VERSION;
  planId: Sha256;
  createdAt: string;
  producer: {
    cliVersion: string;
  };
  target: {
    awsAccountId: string;
    region: string;
    projectName: string;
    stage: string;
    stackName: string;
  };
  baseline:
    | { kind: 'absent' }
    | {
        kind: 'deployed';
        stackId: string;
        deploymentVersion?: string;
        semanticTemplateDigest: Sha256;
      };
  candidate: {
    action: 'create' | 'update';
    mode: 'cloudformation';
    deploymentVersion: string;
    semanticTemplateDigest: Sha256;
    workloadBuilds: {
      jobName: string;
      buildDigest: string;
    }[];
    changeEvidence: 'local-template-diff' | 'aws-change-set';
  };
  summary: {
    creates: number;
    updates: number;
    deletes: number;
    replacements: number;
    dangerousChanges: number;
  };
  stacktapeResourceChanges: {
    resourceName: string;
    resourceType: string;
    action: 'create' | 'delete' | 'replace' | 'update';
    highlights: string[];
    willReplace: string[];
    mayReplace: string[];
    changedChildCount: number;
  }[];
  safety: {
    dangerRulesVersion: typeof DANGER_RULES_VERSION;
    hasProtectedResourceRisk: boolean;
    protectedResourceChanges: {
      resourceName: string;
      resourceType: string;
      logicalId: string;
      cloudformationResourceType: string;
      impact: 'WILL_DESTROY' | 'WILL_REPLACE';
    }[];
  };
};

type ChangePlanInput = {
  cliVersion: string;
  target: DeploymentChangePlanV1['target'];
  action: DeploymentChangePlanV1['candidate']['action'];
  changeEvidence: DeploymentChangePlanV1['candidate']['changeEvidence'];
  deploymentVersion: string;
  stackId?: string;
  previousDeploymentVersion?: string;
  previousTemplate?: CloudFormationTemplate;
  template: CloudFormationTemplate;
  artifacts: {
    jobName: string;
    digest: string;
    skipped: boolean;
    size?: number | null | undefined;
  }[];
  resourceChanges: DeploymentChangePlanV1['stacktapeResourceChanges'];
  dangerousResources: DangerousResource[];
  createdAt?: Date;
};

const canonicalJson = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Change plans cannot contain non-finite numbers.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    const entries = Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`);
    return `{${entries.join(',')}}`;
  }
  throw new TypeError(`Change plans cannot contain values of type ${typeof value}.`);
};

const digestCanonicalValue = (value: unknown): Sha256 =>
  `sha256:${createHash('sha256').update(canonicalJson(value)).digest('hex')}`;

const compareOrdinal = (first: string, second: string) => (first < second ? -1 : first > second ? 1 : 0);

const flattenDangerousChanges = (dangerousResources: DangerousResource[]) =>
  dangerousResources
    .flatMap(({ stpResourceName, resourceType, impactedCfResources }) =>
      Object.entries(impactedCfResources).map(([logicalId, change]) => {
        if (change.impact !== 'WILL_DESTROY' && change.impact !== 'WILL_REPLACE') {
          throw new TypeError(`Protected-resource change ${logicalId} has unsupported impact ${change.impact}.`);
        }
        return {
          resourceName: stpResourceName,
          resourceType,
          logicalId,
          cloudformationResourceType: change.cfResourceType,
          impact: change.impact
        };
      })
    )
    .sort(
      (first, second) =>
        compareOrdinal(first.resourceName, second.resourceName) || compareOrdinal(first.logicalId, second.logicalId)
    );

export const buildDeploymentChangePlan = (input: ChangePlanInput): DeploymentChangePlanV1 => {
  let baseline: DeploymentChangePlanV1['baseline'];
  if (input.action === 'create') {
    baseline = { kind: 'absent' };
  } else {
    const stackId = input.stackId;
    if (!stackId) throw new TypeError('An update change plan requires the deployed CloudFormation stack ID.');
    if (!input.previousTemplate) {
      throw new TypeError('An update change plan requires the previously deployed CloudFormation template.');
    }
    baseline = {
      kind: 'deployed',
      stackId,
      semanticTemplateDigest: digestCanonicalValue(input.previousTemplate),
      ...(input.previousDeploymentVersion ? { deploymentVersion: input.previousDeploymentVersion } : {})
    };
  }
  const dangerousChanges = flattenDangerousChanges(input.dangerousResources);
  const workloadBuilds = input.artifacts
    .map(({ jobName, digest }) => ({
      jobName,
      buildDigest: digest
    }))
    .sort((first, second) => compareOrdinal(first.jobName, second.jobName));
  const changes = input.resourceChanges
    .map((change) => ({
      ...change,
      highlights: [...change.highlights].sort(),
      willReplace: [...change.willReplace].sort(),
      mayReplace: [...change.mayReplace].sort()
    }))
    .sort((first, second) => compareOrdinal(first.resourceName, second.resourceName));
  const changeCounts = {
    creates: changes.filter(({ action }) => action === 'create').length,
    updates: changes.filter(({ action }) => action === 'update').length,
    deletes: changes.filter(({ action }) => action === 'delete').length,
    replacements: changes.filter(({ action }) => action === 'replace').length
  };

  const candidate: DeploymentChangePlanV1['candidate'] = {
    action: input.action,
    mode: 'cloudformation',
    deploymentVersion: input.deploymentVersion,
    semanticTemplateDigest: digestCanonicalValue(input.template),
    workloadBuilds,
    changeEvidence: input.changeEvidence
  };
  const safety: DeploymentChangePlanV1['safety'] = {
    dangerRulesVersion: DANGER_RULES_VERSION,
    hasProtectedResourceRisk: dangerousChanges.length > 0,
    protectedResourceChanges: dangerousChanges
  };
  const executionIdentity = {
    schemaVersion: CHANGE_PLAN_SCHEMA_VERSION,
    target: input.target,
    baseline,
    candidate,
    stacktapeResourceChanges: changes,
    safety
  };

  return {
    schemaVersion: CHANGE_PLAN_SCHEMA_VERSION,
    planId: digestCanonicalValue(executionIdentity),
    createdAt: (input.createdAt || new Date()).toISOString(),
    producer: { cliVersion: input.cliVersion },
    target: input.target,
    baseline,
    candidate,
    summary: {
      ...changeCounts,
      dangerousChanges: dangerousChanges.length
    },
    stacktapeResourceChanges: changes,
    safety
  };
};

/**
 * One-line, user-facing answer to "what is this deploy about to do to my
 * infrastructure". Counts are Stacktape resources; zero counts are dropped
 * rather than listed, and the plan id stays at the end for support and audit
 * lookups. Workload-build counts are deliberately absent — the packaging block
 * already reports builds in detail.
 */
export const formatDeploymentChangePlanSummary = (plan: DeploymentChangePlanV1) => {
  const { creates, updates, deletes, replacements, dangerousChanges } = plan.summary;
  const planId = plan.planId.slice('sha256:'.length, 'sha256:'.length + 12);

  const parts: string[] = [];
  if (creates > 0) parts.push(`${creates} to create`);
  if (updates > 0) parts.push(`${updates} to update`);
  if (replacements > 0) parts.push(`${replacements} to replace`);
  if (deletes > 0) parts.push(`${deletes} to delete`);

  const changeText =
    parts.length === 1 && creates + updates + deletes + replacements === 1
      ? `1 resource ${parts[0].slice('1 '.length)}`
      : parts.length === 1
        ? `${parts[0].replace(' to ', ' resources to ')}`
        : parts.length > 0
          ? parts.join(' · ')
          : plan.candidate.workloadBuilds.length > 0
            ? 'no infrastructure changes — application code only'
            : 'no changes';

  const riskText =
    dangerousChanges > 0
      ? ` · ${dangerousChanges} change${dangerousChanges === 1 ? '' : 's'} affect${dangerousChanges === 1 ? 's' : ''} a protected resource`
      : '';
  return `Infrastructure changes: ${changeText}${riskText} (plan ${planId})`;
};
