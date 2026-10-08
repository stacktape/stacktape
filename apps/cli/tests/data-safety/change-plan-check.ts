import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { StackInfoMap } from '@domain-services/stack-info/types';
import { ResourceImpact, diffTemplate } from '@aws-cdk/cloudformation-diff';
import { outputNames } from '@stacktape/naming/stack-output-names';
import { buildPreviewResourceChanges } from '../../src/commands/diff/utils';
import { buildDeploymentChangePlan, type DeploymentChangePlanV1 } from '@domain-services/deployment-change-plan';
import { getCriticalResourcesPotentiallyEndangeredByOperation } from '@utils/stack-info-map-diff';
import type { SynthesisIdentity } from '../characterization/synthesis-fixture';

/**
 * CloudFormation resource types that hold customer data. This list is deliberately wider than the product's own
 * protected-resource list so that the template-level check below also catches what the product check is blind to.
 */
export const statefulCloudformationTypes = [
  'AWS::RDS::DBCluster',
  'AWS::RDS::DBInstance',
  'AWS::DSQL::Cluster',
  'AWS::DynamoDB::Table',
  'AWS::DynamoDB::GlobalTable',
  'AWS::S3::Bucket',
  'AWS::EFS::FileSystem',
  'AWS::Cognito::UserPool',
  'AWS::Kinesis::Stream',
  'AWS::SQS::Queue',
  'AWS::MSK::ServerlessCluster',
  'AWS::ElastiCache::ReplicationGroup',
  'AWS::ElastiCache::GlobalReplicationGroup',
  'AWS::OpenSearchService::Domain',
  'MongoDB::StpAtlasV1::Cluster',
  'Upstash::DatabasesV1::Database'
] as const;

/**
 * The deployed stack publishes its stack-info map as a stack output. The template stores that output as an `Fn::Sub`
 * over a JSON document whose dynamic values are `${subN}` placeholders, so the document parses as JSON directly. Only
 * the static structure (resource names, types and CloudFormation child logical IDs) is needed for the change plan.
 */
export const readStackInfoMapFromTemplate = (template: CloudFormationTemplate): StackInfoMap => {
  const output = template.Outputs?.[outputNames.stackInfoMap()];
  if (!output) {
    throw new Error(`Baseline template has no ${outputNames.stackInfoMap()} output.`);
  }
  const value = output.Value as { 'Fn::Sub': string | [string, Record<string, unknown>] } | string;
  const document =
    typeof value === 'string' ? value : Array.isArray(value['Fn::Sub']) ? value['Fn::Sub'][0] : value['Fn::Sub'];
  const parsed = JSON.parse(document) as StackInfoMap;
  return {
    metadata: parsed.metadata ?? {},
    resources: parsed.resources ?? {},
    customOutputs: parsed.customOutputs ?? {}
  };
};

export type StatefulDrift = {
  logicalId: string;
  type: string;
  problem: 'removed' | 'type-changed' | 'will-replace' | 'may-replace' | 'will-destroy';
  detail?: string;
};

export type OfflineChangePlanResult = {
  plan: DeploymentChangePlanV1;
  /** Stateful CloudFormation resources whose logical ID, type or replacement impact changed between the templates. */
  statefulDrift: StatefulDrift[];
  /** Every CloudFormation resource the diff would replace or remove, for triage and documentation. */
  replacedOrRemoved: { logicalId: string; type: string; impact: ResourceImpact }[];
};

/**
 * Runs the product's own change plan offline: the baseline template plays the deployed stack and the current template
 * is the candidate, exactly as `deploy` computes `template.getOldTemplateDiff()` and the protected-resource check.
 */
export const computeOfflineChangePlan = ({
  baselineTemplate,
  currentTemplate,
  calculatedStackInfoMap,
  identity
}: {
  baselineTemplate: CloudFormationTemplate;
  currentTemplate: CloudFormationTemplate;
  calculatedStackInfoMap: StackInfoMap;
  identity: SynthesisIdentity;
}): OfflineChangePlanResult => {
  const deployedStackInfoMap = readStackInfoMapFromTemplate(baselineTemplate);
  const cfTemplateDiff = diffTemplate(baselineTemplate, currentTemplate);
  const dangerousResources = getCriticalResourcesPotentiallyEndangeredByOperation({
    calculatedStackInfoMap,
    deployedStackInfoMap,
    cfTemplateDiff
  });
  const resourceChanges = buildPreviewResourceChanges({
    calculatedStackInfoMap,
    deployedStackInfoMap,
    cfTemplateDiff,
    changes: []
  });
  const stackName = `${identity.projectName}-${identity.stage}`;
  const plan = buildDeploymentChangePlan({
    cliVersion: 'data-safety-check',
    target: {
      awsAccountId: identity.accountId,
      region: identity.region,
      projectName: identity.projectName,
      stage: identity.stage,
      stackName
    },
    action: 'update',
    changeEvidence: 'local-template-diff',
    deploymentVersion: 'v000002',
    stackId: `arn:aws:cloudformation:${identity.region}:${identity.accountId}:stack/${stackName}/data-safety`,
    previousDeploymentVersion: 'v000001',
    previousTemplate: baselineTemplate,
    template: currentTemplate,
    artifacts: [],
    resourceChanges,
    dangerousResources,
    createdAt: new Date(0)
  });

  const statefulDrift: StatefulDrift[] = [];
  for (const [logicalId, resource] of Object.entries(baselineTemplate.Resources ?? {})) {
    const type = (resource as { Type: string }).Type;
    if (!(statefulCloudformationTypes as readonly string[]).includes(type)) {
      continue;
    }
    const current = currentTemplate.Resources?.[logicalId] as { Type: string } | undefined;
    if (!current) {
      statefulDrift.push({ logicalId, type, problem: 'removed' });
      continue;
    }
    if (current.Type !== type) {
      statefulDrift.push({ logicalId, type, problem: 'type-changed', detail: current.Type });
      continue;
    }
    const difference = cfTemplateDiff.resources.logicalIds.includes(logicalId)
      ? cfTemplateDiff.resources.get(logicalId)
      : undefined;
    const impact = difference?.changeImpact ?? ResourceImpact.NO_CHANGE;
    if (impact === ResourceImpact.WILL_REPLACE || impact === ResourceImpact.MAY_REPLACE) {
      const causes = Object.entries(difference?.propertyUpdates ?? {})
        .filter(([, update]) => update.changeImpact === impact)
        .map(([property]) => property);
      statefulDrift.push({
        logicalId,
        type,
        problem: impact === ResourceImpact.WILL_REPLACE ? 'will-replace' : 'may-replace',
        detail: causes.join(', ')
      });
    } else if (impact === ResourceImpact.WILL_DESTROY) {
      statefulDrift.push({ logicalId, type, problem: 'will-destroy' });
    }
  }

  const replacedOrRemoved = cfTemplateDiff.resources.logicalIds
    .map((logicalId) => ({ logicalId, difference: cfTemplateDiff.resources.get(logicalId) }))
    .filter(
      ({ difference }) =>
        difference.changeImpact === ResourceImpact.WILL_REPLACE ||
        difference.changeImpact === ResourceImpact.MAY_REPLACE ||
        difference.changeImpact === ResourceImpact.WILL_DESTROY
    )
    .map(({ logicalId, difference }) => ({
      logicalId,
      type: difference.oldResourceType ?? difference.newResourceType ?? 'Unknown',
      impact: difference.changeImpact
    }))
    .sort((first, second) => first.logicalId.localeCompare(second.logicalId));

  return { plan, statefulDrift, replacedOrRemoved };
};
