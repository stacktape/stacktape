import { globalStateManager } from '@application-services/global-state-manager';
import AutoScalingGroup from '@cloudform/autoScaling/autoScalingGroup';
import LaunchTemplate from '@cloudform/ec2/launchTemplate';
import SecurityGroup from '@cloudform/ec2/securityGroup';
import { Base64, GetAtt, Ref } from '@cloudform/functions';
import InstanceProfile from '@cloudform/iam/instanceProfile';
import Role from '@cloudform/iam/role';
import LogGroup from '@cloudform/logs/logGroup';
import SsmAssociation from '@cloudform/ssm/association';
import SsmDocument from '@cloudform/ssm/document';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { tagNames } from '@shared/naming/tag-names';
import { SubWithoutMapping } from '@utils/cloudformation';

export const getEc2AutoscalingGroup = ({ definition }: { definition: StpBastion }) => {
  const resource = new AutoScalingGroup({
    MinSize: '1',
    DesiredCapacity: '1',
    MaxSize: '2',
    MixedInstancesPolicy: {
      LaunchTemplate: {
        LaunchTemplateSpecification: {
          LaunchTemplateId: Ref(cfLogicalNames.bastionEc2LaunchTemplate(definition.name)),
          Version: GetAtt(cfLogicalNames.bastionEc2LaunchTemplate(definition.name), 'LatestVersionNumber')
        },
        Overrides: [{ InstanceType: definition.instanceSize }]
      },
      InstancesDistribution: {
        OnDemandAllocationStrategy: 'prioritized'
      }
    },
    AutoScalingGroupName: awsResourceNames.bastionEc2AutoscalingGroup(
      definition.name,
      globalStateManager.targetStack.stackName
    ),
    VPCZoneIdentifier: vpcManager.getPublicSubnetIds()
  });
  resource.UpdatePolicy = {
    AutoScalingRollingUpdate: {
      MinInstancesInService: 1
    }
  };
  resource.DependsOn = configManager.reuseVpcConfig ? [] : [cfLogicalNames.vpcGatewayAttachment()];
  return resource;
};

export const getSecurityGroup = ({ definition }: { definition: StpBastion }) => {
  return new SecurityGroup({
    GroupDescription: `Security group for bastion host ${definition.name} in stack ${globalStateManager.targetStack.stackName}.`,
    GroupName: awsResourceNames.bastionSecurityGroup(definition.name, globalStateManager.targetStack.stackName),
    VpcId: vpcManager.getVpcId()
  });
};

export const getEc2LaunchTemplate = ({ definition }: { definition: StpBastion }) => {
  return new LaunchTemplate({
    LaunchTemplateData: {
      ImageId: '{{resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64}}',
      SecurityGroupIds: [Ref(cfLogicalNames.bastionSecurityGroup(definition.name))],
      IamInstanceProfile: {
        Arn: GetAtt(cfLogicalNames.bastionEc2InstanceProfile(definition.name), 'Arn')
      },
      // SecurityGroupIds: [cfLogicalNames.bastionSecurityGroup(definition.name)],
      UserData: Base64(
        SubWithoutMapping(`#!/bin/bash -xe
mkdir -p /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d

cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d/default <<- EOF
${JSON.stringify(cloudwatchAgentConfig({ definition }), null, 2)}
EOF
touch /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.toml
${(definition.runCommandsAtLaunch || []).join('\n')}`)
      ),
      InstanceRequirements: {
        VCpuCount: {
          Min: 0
        },
        MemoryMiB: {
          Min: 0
        },
        BareMetal: 'included',
        BurstablePerformance: 'included',
        AllowedInstanceTypes: [definition.instanceSize || 't3.micro']
      },
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: stackManager.getTags([
            {
              name: tagNames.autoscalingGroupName(),
              value: awsResourceNames.bastionEc2AutoscalingGroup(
                definition.name,
                globalStateManager.targetStack.stackName
              )
            }
          ])
        },
        {
          ResourceType: 'volume',
          Tags: stackManager.getTags([
            {
              name: tagNames.autoscalingGroupName(),
              value: awsResourceNames.bastionEc2AutoscalingGroup(
                definition.name,
                globalStateManager.targetStack.stackName
              )
            }
          ])
        },
        {
          ResourceType: 'network-interface',
          Tags: stackManager.getTags([
            {
              name: tagNames.autoscalingGroupName(),
              value: awsResourceNames.bastionEc2AutoscalingGroup(
                definition.name,
                globalStateManager.targetStack.stackName
              )
            }
          ])
        }
      ]
    }
  });
};

const cloudwatchAgentConfig = ({ definition }: { definition: StpBastion }) => {
  return {
    agent: {
      metrics_collection_interval: 60,
      run_as_user: 'root'
    },
    logs: {
      logs_collected: {
        files: {
          collect_list: [
            ...(!definition.logging?.secure?.disabled
              ? [
                  {
                    file_path: '/var/log/secure',
                    log_group_name: awsResourceNames.bastionLogGroup({
                      stackName: globalStateManager.targetStack.stackName,
                      stpResourceName: definition.name,
                      logType: 'secure'
                    }),
                    log_stream_name: '{instance_id}'
                  }
                ]
              : []),
            ...(!definition.logging?.audit?.disabled
              ? [
                  {
                    file_path: '/var/log/audit/audit.log',
                    log_group_name: awsResourceNames.bastionLogGroup({
                      stackName: globalStateManager.targetStack.stackName,
                      stpResourceName: definition.name,
                      logType: 'audit'
                    }),
                    log_stream_name: '{instance_id}'
                  }
                ]
              : []),
            ...(!definition.logging?.messages?.disabled
              ? [
                  {
                    file_path: '/var/log/messages',
                    log_group_name: awsResourceNames.bastionLogGroup({
                      stackName: globalStateManager.targetStack.stackName,
                      stpResourceName: definition.name,
                      logType: 'messages'
                    }),
                    log_stream_name: '{instance_id}'
                  }
                ]
              : [])
          ]
        }
      }
    }
  };
};

export const getEc2InstanceRole = () =>
  new Role({
    Path: '/',
    AssumeRolePolicyDocument: {
      Version: '2008-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'ec2.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    ManagedPolicyArns: [
      'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
      'arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy'
    ]
    // Policies: [
    //   {
    //     PolicyName: 'logs-and-metrics',
    //     PolicyDocument: {
    //       Version: '2012-10-17',
    //       Statement: [
    //         {
    //           Effect: 'Allow',
    //           Resource: (['messages', 'secure', 'audit'] as const).map((logType) => {
    //             return {
    //               'Fn::Sub': `arn:\${AWS::Partition}:logs:*:\${AWS::AccountId}:log-group:${awsResourceNames.bastionLogGroup(
    //                 {
    //                   stackName: globalStateManager.targetStack.stackName,
    //                   stpResourceName: definition.name,
    //                   logType
    //                 }
    //               )}:log-stream:*`
    //             };
    //           }),
    //           Action: ['logs:CreateLogStream', 'logs:DescribeLogStreams', 'logs:PutLogEvents']
    //         }
    //       ]
    //     }
    //   }
    // ]
  });

export const getEc2InstanceProfile = ({ definition }: { definition: StpBastion }) =>
  new InstanceProfile({
    Path: '/',
    Roles: [Ref(cfLogicalNames.bastionRole(definition.name))]
  });

export const getSsmAgentAutoUpdateSsmAssociation = ({ definition }: { definition: StpBastion }) => {
  return new SsmAssociation({
    Name: 'AWS-UpdateSSMAgent',
    ScheduleExpression: 'rate(1 day)',
    Targets: [
      {
        Key: `tag:${tagNames.autoscalingGroupName()}`,
        Values: [Ref(cfLogicalNames.bastionEc2AutoscalingGroup(definition.name))]
      }
    ]
  });
};

export const getCloudwatchAgentAutoUpdateDocument = () => {
  return new SsmDocument({
    DocumentType: 'Command',
    Content: {
      schemaVersion: '2.2',
      description: 'Install, setup auto-update, and start AWS CloudWatch Agent',
      mainSteps: [
        {
          action: 'aws:configurePackage',
          name: 'InstallAgent',
          inputs: {
            action: 'Install',
            name: 'AmazonCloudWatchAgent'
          }
        },
        {
          action: 'aws:runDocument',
          name: 'StartAgent',
          inputs: {
            documentType: 'SSMDocument',
            documentPath: 'AmazonCloudWatch-ManageAgent',
            documentParameters: {
              action: 'start',
              optionalConfigurationSource: 'default'
            }
          }
        }
      ]
    }
  });
};

export const getCloudwatchAgentAutoUpdateSsmAssociation = ({ definition }: { definition: StpBastion }) => {
  return new SsmAssociation({
    Name: Ref(cfLogicalNames.bastionCloudwatchSsmDocument()),
    ScheduleExpression: 'rate(1 day)',
    Targets: [
      {
        Key: `tag:${tagNames.autoscalingGroupName()}`,
        Values: [Ref(cfLogicalNames.bastionEc2AutoscalingGroup(definition.name))]
      }
    ]
  });
};

export const getLogGroup = ({
  definition,
  logType
}: {
  definition: StpBastion;
  logType: keyof BastionLoggingConfig;
}) => {
  return new LogGroup({
    LogGroupName: awsResourceNames.bastionLogGroup({
      stackName: globalStateManager.targetStack.stackName,
      stpResourceName: definition.name,
      logType
    }),
    RetentionInDays:
      definition.logging?.[logType]?.retentionDays || logType === 'audit' ? 365 : logType === 'secure' ? 180 : 30
  });
};
