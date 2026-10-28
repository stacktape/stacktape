import type { InstanceProfileProperties } from '@stacktape/cloudformation/resources/aws-iam-instanceprofile';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref, sub } from '@stacktape/cloudformation/intrinsics';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getStpServiceCustomResource } from './custom-resource';

/** Any image EC2 accepts in the region. The service Lambda only names it in dry-run launches, with a subnet of the VPC. */
const PROBE_IMAGE_ID = '{{resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64}}';

const isDeployedAsCloudformationInstanceProfile = (cfLogicalName: string) =>
  !!stackManager.existingStackResources?.some(
    ({ LogicalResourceId, ResourceType }) =>
      LogicalResourceId === cfLogicalName && ResourceType === 'AWS::IAM::InstanceProfile'
  );

/**
 * Adds the instance profile of an EC2 role.
 *
 * CloudFormation's `AWS::IAM::InstanceProfile` handler waits about 2 minutes on every create, and the profile sits on
 * the critical path of every stack that launches instances (NAT instances, bastions, ECS on EC2, Batch). New profiles
 * are created by the service Lambda instead, which returns once EC2 accepts the profile (about 15 s). The logical ID
 * and the `Arn` attribute stay the same, so the launch templates reference either form.
 *
 * A profile already deployed as `AWS::IAM::InstanceProfile` keeps that form: a type change would replace the profile
 * and with it the launch templates and the running instances.
 */
export const addInstanceProfile = ({
  cfLogicalName,
  roleCfLogicalName,
  purpose,
  nameChain,
  cloudformationProperties,
  probeSubnetId = vpcManager.getPublicSubnetIds()[0]
}: {
  cfLogicalName: string;
  roleCfLogicalName: string;
  /** Part of the profile's name, unique within the stack. */
  purpose: string;
  nameChain: string[];
  /** The `AWS::IAM::InstanceProfile` properties a deployed profile was created with. */
  cloudformationProperties: InstanceProfileProperties;
  /** Where the dry-run launches happen: a subnet the profile's instances run in. Default: the stack's first public one. */
  probeSubnetId?: string;
}) => {
  if (isDeployedAsCloudformationInstanceProfile(cfLogicalName)) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName,
      resource: cfnResource('AWS::IAM::InstanceProfile', cloudformationProperties),
      nameChain
    });
    return;
  }
  const { stackName, region } = calculatedStackOverviewManager.context;
  const instanceProfileName = awsResourceNames.instanceProfile({ stackName, region, purpose });
  const policyLogicalName = cfLogicalNames.instanceProfileServiceLambdaPolicy(cfLogicalName);
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: policyLogicalName,
    // A separate policy rather than a statement in the service Lambda's role: the role's permission needs this role's
    // ARN, and the service Lambda, which other custom resources use, would otherwise wait for this role.
    resource: cfnResource('AWS::IAM::Policy', {
      PolicyName: `instance-profile-${cfLogicalName}`,
      Roles: [ref(cfLogicalNames.lambdaRole(configManager.stacktapeServiceLambdaProps.name))],
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'iam:GetInstanceProfile',
              'iam:CreateInstanceProfile',
              'iam:DeleteInstanceProfile',
              'iam:AddRoleToInstanceProfile',
              'iam:RemoveRoleFromInstanceProfile'
            ],
            Resource: sub(`arn:\${AWS::Partition}:iam::\${AWS::AccountId}:instance-profile/${instanceProfileName}`)
          },
          // Adding a role to a profile requires passing it.
          { Effect: 'Allow', Action: 'iam:PassRole', Resource: getAtt(roleCfLogicalName, 'Arn') }
        ]
      }
    }),
    nameChain
  });
  const resource = getStpServiceCustomResource<'instanceProfile'>({
    instanceProfile: {
      instanceProfileName,
      roleName: ref(roleCfLogicalName),
      probeImageId: PROBE_IMAGE_ID,
      probeSubnetId
    }
  });
  resource.DependsOn = [policyLogicalName];
  calculatedStackOverviewManager.addCfChildResource({ cfLogicalName, resource, nameChain });
};
