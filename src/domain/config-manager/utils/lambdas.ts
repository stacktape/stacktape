/* eslint-disable no-template-curly-in-string */
import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Ref, Sub } from '@cloudform/functions';
import { IS_DEV, STACKTAPE_TRPC_API_ENDPOINT } from '@config';
import { sesManager } from '@domain-services/ses-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { stpErrors } from '@errors';
import { arns } from '@shared/naming/arns';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { helperLambdaAwsResourceNames } from '@shared/naming/helper-lambdas-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import {
  getLegacySsmParameterStoreStackPrefix,
  getSsmParameterStoreStackPrefix
} from '@shared/naming/ssm-secret-parameters';
import { tagNames } from '@shared/naming/tag-names';
import { getContainingFolderName, getFileExtension, getFileNameWithoutExtension } from '@shared/utils/fs-utils';
import { getGloballyUniqueStackHash } from '@shared/utils/hashing';
import { getDefaultRuntimeForExtension } from '@shared/utils/runtimes';
import { SubWithoutMapping } from '@utils/cloudformation';
import { kebabCase } from 'change-case';
import { configManager } from '../index';
import { getPropsOfResourceReferencedInConfig } from './resource-references';

export const getBatchJobTriggerLambdaEnvironment = ({
  batchJobName,
  stackName
}: {
  batchJobName: string;
  stackName: string;
}) => {
  return [
    {
      name: 'STATE_MACHINE_NAME',
      value: awsResourceNames.batchStateMachine(batchJobName, stackName)
    },
    {
      name: 'STATE_MACHINE_ARN',
      value: Ref(cfLogicalNames.batchStateMachine(batchJobName)).toJSON() as unknown as string
    },
    {
      name: 'BATCH_JOB_NAME_BASE',
      value: kebabCase(`${batchJobName}-${stackName}`)
    }
  ];
};

export const getBatchJobTriggerLambdaAccessControl = ({ batchJobName }: { batchJobName: string }) => {
  return [
    {
      Effect: 'Allow',
      Action: ['states:StartExecution'],
      Resource: [Ref(cfLogicalNames.batchStateMachine(batchJobName)) as unknown as string]
    }
  ];
};

export const getStacktapeServiceLambdaEnvironment = ({
  projectName,
  stackName,
  globallyUniqueStackHash
}: {
  stackName: string;
  projectName: string;
  globallyUniqueStackHash: string;
}) => {
  return [
    {
      name: 'AWS_PARTITION',
      value: Ref('AWS::Partition') as unknown as string
    },
    {
      name: 'AWS_ACCOUNT_ID',
      value: Ref('AWS::AccountId') as unknown as string
    },
    {
      name: 'STACK_NAME',
      value: stackName
    },
    {
      name: 'PROJECT_NAME',
      value: projectName
    },
    {
      name: 'STAGE',
      value: globalStateManager.targetStack.stage
    },
    {
      name: 'GLOBALLY_UNIQUE_STACK_HASH',
      value: globallyUniqueStackHash
    },
    {
      name: 'STACKTAPE_TRPC_API_ENDPOINT',
      value: STACKTAPE_TRPC_API_ENDPOINT
    },
    ...(IS_DEV ? [{ name: 'DEV_MODE', value: IS_DEV }] : [])
  ];
};

export const getStacktapeServiceLambdaCustomResourceInducedStatements = (): StpIamRoleStatement[] => {
  const serviceLambdaName: HelperLambdaName = 'stacktapeServiceLambda';
  const { allAuroraDatabases, allDatabasesWithInstancies, allResourcesRequiringVpc, deploymentScripts } = configManager;
  const { stackName } = globalStateManager.targetStack;
  const globallyUniqueStackHash = getGloballyUniqueStackHash({
    region: globalStateManager.region,
    accountId: globalStateManager.targetAwsAccount.awsAccountId,
    stackName
  });
  const {
    targetAwsAccount: { awsAccountId: accountId }
  } = globalStateManager;
  const waf = [
    {
      Resource: ['*'],
      Action: ['wafv2:CreateWebACL', 'wafv2:UpdateWebACL', 'wafv2:DeleteWebACL', 'wafv2:ListWebACLs'],
      Effect: 'Allow'
    }
  ];
  const s3Events = [
    {
      Resource: ['*'],
      Action: ['s3:PutBucketNotification', 's3:GetBucketNotification'],
      Effect: 'Allow'
    },
    {
      Resource: ['*'],
      Action: ['lambda:AddPermission', 'lambda:RemovePermission'],
      Effect: 'Allow'
    }
  ];
  const acceptVpcPeeringConnections = [
    {
      Effect: 'Allow',
      Action: ['ec2:AcceptVpcPeeringConnection'],
      Resource: [
        ...(allResourcesRequiringVpc.length
          ? [
              Sub('arn:${AWS::Partition}:ec2:${AWS::Region}:${AWS::AccountId}:vpc/${vpcId}', {
                vpcId: vpcManager.getVpcId()
              }) as unknown as string
            ]
          : []),
        SubWithoutMapping(
          `arn:\${AWS::Partition}:ec2:\${AWS::Region}:\${AWS::AccountId}:vpc-peering-connection/*`
        ) as unknown as string
      ]
    },
    {
      Effect: 'Allow',
      Action: ['ec2:DescribeVpcPeeringConnections'],
      Resource: ['*']
    }
  ];

  const edgeFunctions: StpIamRoleStatement[] = [
    // todo
    // role related statements
    {
      Resource: [
        arns.iamRole({
          accountId,
          roleAwsName: `${stackName}-*`
        })
      ],
      Action: [
        'iam:CreateRole',
        'iam:DeleteRolePolicy',
        'iam:ListRolePolicies',
        'iam:PutRolePolicy',
        'iam:GetRole',
        'iam:PassRole',
        'iam:DeleteRole'
      ],
      Effect: 'Allow'
    },
    // lambda related statements
    {
      Resource: [
        arns.lambdaFromFullName({
          accountId,
          lambdaAwsName: `${stackName}-*`,
          region: 'us-east-1'
        })
      ],
      Action: [
        'lambda:UpdateFunctionCode',
        'lambda:UpdateFunctionConfiguration',
        'lambda:CreateFunction',
        'lambda:PublishVersion',
        'lambda:GetFunction',
        'lambda:GetFunctionConfiguration',
        'lambda:ListVersionsByFunction',
        'lambda:DeleteFunction',
        'lambda:TagResource',
        'lambda:UntagResource',
        'lambda:ListTags'
      ],
      Effect: 'Allow'
    },
    // log group related statements
    {
      Resource: [{ 'Fn::Sub': 'arn:${AWS::Partition}:logs:*:${AWS::AccountId}:log-group:*' } as unknown as string],
      Action: ['*'],
      Effect: 'Allow'
    },
    {
      // deny creating its own log group - otherwise stack might not clean up properly

      Resource: [GetAtt(cfLogicalNames.lambdaLogGroup(serviceLambdaName), 'Arn') as unknown as string],
      Action: ['logs:CreateLogGroup'],
      Effect: 'Deny'
    },
    // bucket related statements
    {
      Resource: [
        `arn:aws:s3:::${awsResourceNames.deploymentBucket(globallyUniqueStackHash)}/*`,
        `arn:aws:s3:::${awsResourceNames.deploymentBucket(globallyUniqueStackHash)}`
      ],
      Action: ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:PutObjectAcl'],
      Effect: 'Allow'
    },
    {
      Resource: [
        `arn:aws:s3:::${helperLambdaAwsResourceNames.edgeDeploymentBucket(globallyUniqueStackHash)}/*`,
        `arn:aws:s3:::${helperLambdaAwsResourceNames.edgeDeploymentBucket(globallyUniqueStackHash)}`
      ],
      Action: ['*'],
      Effect: 'Allow'
    }
  ];

  const publishLambdaVersion: StpIamRoleStatement[] = [
    {
      Resource: ['*'],
      Action: ['lambda:PublishVersion', 'lambda:GetFunction', 'lambda:DeleteFunction'],
      Effect: 'Allow'
    },
    // log group related statements
    {
      Resource: [{ 'Fn::Sub': 'arn:${AWS::Partition}:logs:*:${AWS::AccountId}:log-group:*' } as unknown as string],
      Action: ['*'],
      Effect: 'Allow'
    }
  ];

  const setDatabaseDeletionProtection = [
    ...(allAuroraDatabases.length
      ? [
          {
            Resource: allAuroraDatabases.map(
              ({ name }) =>
                SubWithoutMapping(
                  `arn:\${AWS::Partition}:rds:\${AWS::Region}:\${AWS::AccountId}:cluster:${awsResourceNames.dbCluster(
                    stackName,
                    name
                  )}`
                ) as unknown as string
            ),
            Action: ['rds:ModifyDBCluster'],
            Effect: 'Allow'
          }
        ]
      : []),
    ...(allDatabasesWithInstancies.length
      ? [
          {
            Resource: allDatabasesWithInstancies.map(
              ({ name, engine }) =>
                SubWithoutMapping(
                  `arn:\${AWS::Partition}:rds:\${AWS::Region}:\${AWS::AccountId}:db:${
                    engine.type === 'aurora-mysql' ||
                    engine.type === 'aurora-postgresql' ||
                    engine.type === 'aurora-mysql-serverless-v2' ||
                    engine.type === 'aurora-postgresql-serverless-v2'
                      ? awsResourceNames.auroraDbInstance(name, stackName, 0)
                      : awsResourceNames.dbInstance(name, stackName)
                  }`
                ) as unknown as string
            ),
            Action: ['rds:ModifyDBInstance'],
            Effect: 'Allow'
          }
        ]
      : [])
  ];

  const sensitiveData = [
    {
      Resource: [
        SubWithoutMapping(
          `arn:\${AWS::Partition}:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter${getLegacySsmParameterStoreStackPrefix(
            {
              stackName
            }
          )}/*`
        ) as unknown as string,
        SubWithoutMapping(
          `arn:\${AWS::Partition}:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter${getSsmParameterStoreStackPrefix({
            stackName,
            region: globalStateManager.region
          })}/*`
        ) as unknown as string
      ],
      Action: [
        'ssm:DeleteParameter',
        'ssm:DeleteParameters',
        'ssm:PutParameter',
        'ssm:AddTagsToResource',
        'ssm:GetParameters'
      ]
    }
  ];

  const scriptFunction = (
    deploymentScripts.length
      ? [
          // invoke user script functions
          {
            Resource: deploymentScripts.map(
              ({
                _nestedResources: {
                  scriptFunction: { resourceName }
                }
              }) =>
                arns.lambdaFromFullName({
                  accountId,
                  lambdaAwsName: resourceName,
                  region: globalStateManager.region
                }) as unknown as string
            ),
            Action: ['lambda:InvokeFunction'],
            Effect: 'Allow'
          }
        ]
      : []
  ).concat({
    Resource: ['*'],
    Action: ['cloudformation:DescribeStacks'],
    Effect: 'Allow'
  });

  const forceDeleteAsg = [
    {
      Resource: ['*'],
      Action: ['autoscaling:DescribeAutoScalingGroups', 'autoscaling:SetInstanceProtection'],
      Condition: {
        StringEquals: {
          [`autoscaling:ResourceTag/${tagNames.stackName()}`]: stackName
        }
      }
    }
  ];

  const disableEcsManagedTerminationProtection = [
    {
      Resource: ['*'],
      Action: ['ecs:UpdateCapacityProvider'],
      Condition: {
        StringEquals: {
          [`aws:ResourceTag/${tagNames.stackName()}`]: stackName
        }
      }
    }
  ];

  const defaultDomainCert = [
    {
      Resource: ['*'],
      Action: ['acm:AddTagsToCertificate', 'acm:DescribeCertificate', 'acm:ListCertificates', 'acm:RequestCertificate']
    },
    {
      Resource: [
        arns.lambdaFromFullName({
          accountId,
          lambdaAwsName: awsResourceNames.stpServiceLambda(stackName),
          region: globalStateManager.region
        })
      ],
      Action: ['lambda:InvokeFunction']
    }
  ];

  const userPoolDetails = [
    {
      Resource: ['*'],
      Action: ['cognito-idp:DescribeUserPoolClient'],
      Condition: {
        StringEquals: {
          [`aws:ResourceTag/${tagNames.stackName()}`]: stackName
        }
      }
    }
  ];

  const ssmGetAnyStpParameter = [
    {
      Resource: [
        SubWithoutMapping('arn:${AWS::Partition}:ssm:*:${AWS::AccountId}:parameter/stp/*') as unknown as string
      ],

      Action: ['ssm:GetParameter']
    }
  ];

  return [
    ...s3Events,
    ...acceptVpcPeeringConnections,
    ...edgeFunctions,
    ...setDatabaseDeletionProtection,
    ...sensitiveData,
    ...scriptFunction,
    ...publishLambdaVersion,
    ...waf,
    ...forceDeleteAsg,
    ...disableEcsManagedTerminationProtection,
    ...defaultDomainCert,
    ...userPoolDetails,
    ...ssmGetAnyStpParameter
  ];
};

export const getStacktapeServiceLambdaAlarmNotificationInducedStatements = (): StpIamRoleStatement[] => {
  const {
    allSecretNamesUsedInAlarmNotifications,
    allParameterNamesUsedInAlarmNotifications,
    categorizedEmailsUsedInAlertNotifications: { senders }
  } = configManager;
  const allEmailSenders = Array.from(senders);
  return [
    allParameterNamesUsedInAlarmNotifications.length && {
      Resource: allParameterNamesUsedInAlarmNotifications
        .map((paramName) => (paramName.startsWith('/') ? paramName : `/${paramName}`))
        .map(
          (paramName) =>
            SubWithoutMapping(
              `arn:\${AWS::Partition}:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter${paramName}`
            ) as unknown as string
        ),
      Action: ['ssm:GetParameters', 'ssm:GetParameter']
    },
    allSecretNamesUsedInAlarmNotifications.length && {
      Resource: allSecretNamesUsedInAlarmNotifications.map(
        (secretName) =>
          SubWithoutMapping(
            `arn:\${AWS::Partition}:secretsmanager:\${AWS::Region}:\${AWS::AccountId}:secret:${secretName}-*`
          ) as unknown as string
      ),
      Action: ['secretsmanager:GetSecretValue']
    },
    allEmailSenders.length && {
      Resource: allEmailSenders.map(
        (senderName) =>
          SubWithoutMapping(
            `arn:\${AWS::Partition}:ses:\${AWS::Region}:\${AWS::AccountId}:identity/${sesManager.getVerifiedIdentityForEmail(
              { email: senderName }
            )}`
          ) as unknown as string
      ),
      Action: ['ses:SendEmail']
    }
  ].filter(Boolean);
};

export const getStacktapeServiceLambdaEcsRedeployInducedStatements = (): StpIamRoleStatement[] => {
  const { allContainerWorkloads } = configManager;

  const { stackName } = globalStateManager.targetStack;
  const allBlueGreenWorkloads = allContainerWorkloads.filter(({ deployment }) => deployment);
  return allContainerWorkloads.length
    ? [
        {
          Resource: ['*'],
          Action: ['ecs:UpdateService', 'ecs:DescribeServices'],
          Condition: {
            StringEquals: {
              [`aws:ResourceTag/${tagNames.stackName()}`]: stackName
            }
          }
        },
        {
          Resource: ['*'],
          Action: ['autoscaling:SetDesiredCapacity'],
          Condition: {
            StringEquals: {
              [`autoscaling:ResourceTag/${tagNames.stackName()}`]: stackName
            }
          }
        },
        {
          Resource: ['*'],
          Action: ['autoscaling:DescribeAutoScalingGroups']
        }
      ].concat(
        allBlueGreenWorkloads.length
          ? [
              {
                Resource: allContainerWorkloads
                  .filter(({ deployment }) => deployment)
                  .map(
                    ({ name }) =>
                      SubWithoutMapping(
                        `arn:\${AWS::Partition}:codedeploy:\${AWS::Region}:\${AWS::AccountId}:deploymentgroup:${awsResourceNames.ecsCodeDeployApp(
                          stackName
                        )}/${awsResourceNames.codeDeployDeploymentGroup({ stackName, stpResourceName: name })}`
                      ) as unknown as string
                  ),
                Action: ['codedeploy:CreateDeployment', 'codedeploy:ListDeployments']
              },
              {
                Resource: [
                  SubWithoutMapping(
                    `arn:\${AWS::Partition}:codedeploy:\${AWS::Region}:\${AWS::AccountId}:application:${awsResourceNames.ecsCodeDeployApp(
                      stackName
                    )}`
                  ) as unknown as string
                ],
                Action: ['codedeploy:RegisterApplicationRevision', 'codedeploy:GetApplicationRevision']
              },
              {
                Resource: ['*'],
                Action: ['codedeploy:GetDeploymentConfig']
              }
            ]
          : []
      )
    : [];
};

export const getStacktapeServiceLambdaCustomTaggingInducedStatement = (): StpIamRoleStatement[] => {
  return [
    {
      Resource: ['*'],
      Action: [
        'servicediscovery:GetNamespace',
        'route53:ChangeTagsForResource',
        'ec2:CreateTags',
        'ec2:DescribeNetworkInterfaces'
      ]
    }
  ];
};

export const getLambdaHandler = ({ name, packaging }: { packaging: LambdaPackaging; name: string }) => {
  if (packaging.type === 'stacktape-lambda-buildpack') {
    const extension = getFileExtension(packaging.properties.entryfilePath);
    const handlerToUse =
      packaging.properties.handlerFunction ??
      (extension === 'java' ? '' : extension === 'go' ? '' : extension === 'py' ? 'handler' : 'default');
    let entry = '';
    switch (extension) {
      case 'py':
      case 'go':
        entry = getFileNameWithoutExtension(packaging.properties.entryfilePath);
        break;
      case 'java':
        entry = getContainingFolderName(packaging.properties.entryfilePath);
        break;
      default:
        entry = 'index';
    }
    return [entry, handlerToUse].filter(Boolean).join('.');
  }
  if (packaging.type === 'custom-artifact') {
    if (!packaging.properties.handler) {
      throw stpErrors.e10({ functionName: name });
    }
    const [filePath, handlerFunction] = packaging.properties.handler.split(':');
    if (!handlerFunction) {
      throw stpErrors.e102({ functionName: name });
    }
    const filePathWithoutExtension = getFileNameWithoutExtension(filePath);

    return `${filePathWithoutExtension}.${handlerFunction}`;
  }
};

export const getLambdaRuntime = ({
  name,
  packaging,
  runtime
}: {
  packaging: LambdaPackaging | HelperLambdaPackaging;
  name: string;
  runtime: LambdaRuntime;
}): LambdaRuntime => {
  if (runtime) {
    return runtime;
  }
  if (packaging.type === 'custom-artifact' && !runtime) {
    throw stpErrors.e11({ functionName: name });
  }
  if (packaging.type === 'stacktape-lambda-buildpack') {
    return getDefaultRuntimeForExtension(getFileExtension(packaging.properties.entryfilePath));
  }
};

export const resolveReferenceToLambdaFunction = ({
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  referencedFrom: string;
  referencedFromType?: StpWorkloadType | 'alarm';
  stpResourceReference: string;
}) => {
  return getPropsOfResourceReferencedInConfig({
    stpResourceReference,
    stpResourceType: 'function',
    referencedFrom,
    referencedFromType
  });
};

export const validateLambdaConfig = ({ definition }: { definition: StpLambdaFunction }) => {
  if (definition.volumeMounts && !definition.joinDefaultVpc) {
    throw stpErrors.e121({ lambdaStpResourceName: definition.name });
  }
};
