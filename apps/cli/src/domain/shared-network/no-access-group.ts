import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { configManager } from '@domain-services/config-manager';
import { templateManager } from '@domain-services/template-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { CliError } from '@utils/errors';

/**
 * Resources of the stage that admit its whole stage group (`vpcManager.vpcWideIngress`): `vpc`-mode databases, Redis
 * and OpenSearch, internal load balancers and Service Connect ports. Every function of the stage reaches them today, so
 * while one exists, no function of the stage moves to the no-access group. The list may name more than the resolvers
 * admit; `assertNoAccessGroupIsolation` catches one it misses.
 */
const getStageGroupAdmitters = () => [
  ...configManager.databases.filter(({ accessibility }) => accessibility?.accessibilityMode === 'vpc'),
  ...configManager.redisCaches.filter(
    ({ accessibility }) => !accessibility || accessibility.accessibilityMode === 'vpc'
  ),
  ...configManager.openSearchDomains.filter(({ accessibility }) => accessibility?.accessibilityMode === 'vpc'),
  ...[...configManager.allApplicationLoadBalancers, ...configManager.allNetworkLoadBalancers].filter(
    (loadBalancer) => loadBalancer.interface === 'internal'
  ),
  ...Object.keys(configManager.serviceConnectContainerWorkloadsAssociations)
];

/**
 * The shared network's no-access security group for a VPC function, or undefined when the function keeps the stage's
 * groups.
 *
 * Lambda creates network interfaces per subnet and security-group combination, which takes about 4 minutes, and
 * releases them up to 20 minutes after the combination's last function. Functions in the no-access group (it has no
 * inbound rules and nothing admits it) share one combination per subnet set across every non-production stage, and the
 * network's keepers hold it, so such a function is created and deleted in seconds. It carries no other group, so it
 * reaches nothing private of any stage, its own included. A function qualifies only when that takes nothing away:
 * - it connects to nothing that admits functions by group (`connectedTo`: databases, caches, OpenSearch, Kafka, MongoDB
 *   Atlas and EFS mounts), and
 * - nothing in its stage admits the whole stage group (`getStageGroupAdmitters`).
 *
 * A deployed function keeps the group it runs in: moving it would create network interfaces again. It moves only when
 * its group changes anyway (a new function, one that joins the VPC, or one whose connections changed), and a function
 * already in the no-access group stays there while it qualifies.
 */
export const getNoAccessSecurityGroup = ({
  lambdaName,
  connectedTo,
  stageGroupCfLogicalName,
  deployedTemplate = templateManager.oldTemplate
}: {
  lambdaName: string;
  connectedTo: string[];
  /** The stage's function group the function gets otherwise (`getVpcLambdaSecurityGroup`). */
  stageGroupCfLogicalName: string;
  deployedTemplate?: CloudFormationTemplate;
}): string | undefined => {
  const groupId = vpcManager.isSharedNetwork ? vpcManager.noAccessSecurityGroupId : undefined;
  if (!groupId || connectedTo.length || getStageGroupAdmitters().length) return undefined;
  const deployedGroups = (
    deployedTemplate?.Resources?.[cfLogicalNames.lambda(lambdaName)] as
      | { Properties?: { VpcConfig?: { SecurityGroupIds?: unknown[] } } }
      | undefined
  )?.Properties?.VpcConfig?.SecurityGroupIds;
  const keepsStageGroup = deployedGroups?.some(
    (group) => (group as { Ref?: unknown } | null)?.Ref === stageGroupCfLogicalName
  );
  if (keepsStageGroup) return undefined;
  if (!templateManager.templateOverrideFunctions.includes(assertNoAccessGroupIsolation)) {
    templateManager.addFinalTemplateOverrideFn(assertNoAccessGroupIsolation);
  }
  return groupId;
};

/**
 * Fails the deploy when a function runs in the no-access group although something in the stage admits the stage group,
 * which that function then no longer reaches, or admits the no-access group, which would let every non-production stage
 * in. Both are excluded above; this keeps a resolver that starts admitting either from slipping through.
 */
export const assertNoAccessGroupIsolation = async (template: CloudFormationTemplate) => {
  const groupId = vpcManager.noAccessSecurityGroupId;
  const stageGroup = cfLogicalNames.stageNetworkSecurityGroup();
  // An ingress rule names its source group in `SourceSecurityGroupId` (or `...Name`), inline or in its own resource.
  const admitsStageGroup = new RegExp(`"SourceSecurityGroup(Id|Name)":\\{"(Ref":|Fn::GetAtt":\\[)"${stageGroup}"`);
  const problems: string[] = [];
  for (const [logicalId, resource] of Object.entries(template.Resources)) {
    if (resource.Type === 'AWS::Lambda::Function') continue;
    const serialized = JSON.stringify((resource as { Properties?: unknown }).Properties ?? {});
    if (admitsStageGroup.test(serialized)) problems.push(`${logicalId} admits the stage group`);
    if (groupId && serialized.includes(JSON.stringify(groupId))) {
      problems.push(`${logicalId} references the no-access group`);
    }
  }
  if (problems.length) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'SHARED_NETWORK_NO_ACCESS_GROUP_CONFLICT',
      message: `A function was placed in the shared network's no-access security group, but ${problems.join('; ')}.`,
      hints: 'This is a Stacktape bug. Please report it with the stage configuration.'
    });
  }
};
