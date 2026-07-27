import BrowserCustom from '@cloudform/bedrockAgentCore/browserCustom';
import CodeInterpreterCustom from '@cloudform/bedrockAgentCore/codeInterpreterCustom';
import Gateway from '@cloudform/bedrockAgentCore/gateway';
import GatewayTarget from '@cloudform/bedrockAgentCore/gatewayTarget';
import Memory from '@cloudform/bedrockAgentCore/memory';
import Runtime from '@cloudform/bedrockAgentCore/runtime';
import RuntimeEndpoint from '@cloudform/bedrockAgentCore/runtimeEndpoint';
import type SecurityGroup from '@cloudform/ec2/securityGroup';
import { GetAtt, Join, Ref } from '@cloudform/functions';
import Role, { Policy } from '@cloudform/iam/role';
import { globalStateManager } from '@application-services/global-state-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveReferenceToLambdaFunction } from '@domain-services/config-manager/utils/lambdas';
import { resolveConnectToList } from '@domain-services/config-manager/utils/resource-references';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { templateManager } from '@domain-services/template-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getJobName } from '@shared/naming/utils';
import { getCfEnvironment } from '@utils/cloudformation';
import { getIsDirective } from '@utils/directives';
import { getAugmentedEnvironment } from '@utils/environment';
import { getResolvedConnectToEnvironmentVariables } from '../_utils/connect-to-helper';
import { getPoliciesForRoles } from '../_utils/role-helpers';
import { getLambdaFunctionSecurityGroup } from '../functions/utils';

const BEDROCK_AGENTCORE_PRINCIPAL = 'bedrock-agentcore.amazonaws.com';
const PENDING_IMAGE_URI = '000000000000.dkr.ecr.us-east-1.amazonaws.com/pending:pending';

export const resolveAgentCoreResources = async () => {
  resolveAgentCoreMemories();
  resolveAgentCoreGateways();
  resolveAgentCoreBrowsers();
  resolveAgentCoreCodeInterpreters();
  resolveAgentCoreRuntimes();
};

const resolveAgentCoreRuntimes = () => {
  configManager.agentCoreRuntimes.forEach((runtime) => {
    const { name, nameChain } = runtime;
    const stackName = globalStateManager.targetStack.stackName;
    const {
      accessToResourcesRequiringRoleChanges,
      accessToResourcesPotentiallyRequiringSecurityGroupCreation,
      accessToAwsServices
    } = resolveConnectToList({
      stpResourceNameOfReferencer: name,
      connectTo: runtime.connectTo
    });

    const roleLogicalName = cfLogicalNames.agentCoreRuntimeRole(name);
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: roleLogicalName,
      resource: getAgentCoreExecutionRole({
        stpResourceName: name,
        roleSuffix: 'runtime',
        iamRoleStatements: runtime.iamRoleStatements || [],
        accessToResourcesRequiringRoleChanges,
        accessToAwsServices
      }),
      nameChain
    });

    const useVpc = !!accessToResourcesPotentiallyRequiringSecurityGroupCreation.length;
    if (useVpc) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.workloadSecurityGroup(name),
        resource: getLambdaFunctionSecurityGroup({ stackName, stpFunctionName: name }) as SecurityGroup,
        nameChain
      });
    }

    const cfLogicalName = cfLogicalNames.agentCoreRuntime(name);
    const packagingType = runtime.packaging?.type as Parameters<typeof getAugmentedEnvironment>[0]['packagingType'];
    const entryfilePath = (runtime.packaging?.properties as { entryfilePath?: string })?.entryfilePath;
    const languageSpecificConfig = (
      runtime.packaging?.properties as { languageSpecificConfig?: EsLanguageSpecificConfig }
    )?.languageSpecificConfig;
    const environmentVariables = Object.fromEntries(
      getCfEnvironment(
        getAugmentedEnvironment({
          environment: [...(runtime.environment || []), ...getLinkedAgentCoreEnvironment(runtime)],
          workloadType: 'agentcore-runtime',
          packagingType,
          entryfilePath,
          nodeVersion: languageSpecificConfig?.nodeVersion
        })
      ).map(({ Name, Value }) => [Name, Value])
    );

    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName,
      resource: new Runtime({
        AgentRuntimeName: awsResourceNames.agentCoreRuntime(stackName, name),
        Description: runtime.description,
        ProtocolConfiguration: runtime.protocol || 'HTTP',
        EnvironmentVariables: environmentVariables,
        LifecycleConfiguration: runtime.lifecycle && {
          MaxLifetime: runtime.lifecycle.maxLifetime,
          IdleRuntimeSessionTimeout: runtime.lifecycle.idleRuntimeSessionTimeout
        },
        RequestHeaderConfiguration: runtime.requestHeaders?.length && {
          RequestHeaderAllowlist: runtime.requestHeaders
        },
        AuthorizerConfiguration: getAuthorizerConfiguration(runtime.authorizer),
        NetworkConfiguration: useVpc
          ? {
              NetworkMode: 'VPC',
              NetworkModeConfig: {
                SecurityGroups: [Ref(cfLogicalNames.workloadSecurityGroup(name))],
                Subnets: vpcManager.getPrivateSubnetIds()
              }
            }
          : { NetworkMode: 'PUBLIC' },
        AgentRuntimeArtifact: {
          ContainerConfiguration: {
            ContainerUri:
              runtime.packaging.type === 'prebuilt-image'
                ? (runtime.packaging.properties as PrebuiltImageCwPackagingProps).image
                : PENDING_IMAGE_URI
          }
        },
        RoleArn: GetAtt(roleLogicalName, 'Arn'),
        Tags: getAgentCoreTags(runtime.tags)
      }) as any,
      nameChain
    });

    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'id',
      paramValue: GetAtt(cfLogicalName, 'AgentRuntimeId'),
      showDuringPrint: false
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'arn',
      paramValue: GetAtt(cfLogicalName, 'AgentRuntimeArn'),
      showDuringPrint: true
    });

    getRuntimeEndpoints(runtime).forEach((endpoint) => {
      const endpointLogicalName = cfLogicalNames.agentCoreRuntimeEndpoint(name, endpoint.name);
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: endpointLogicalName,
        resource: new RuntimeEndpoint({
          AgentRuntimeId: GetAtt(cfLogicalName, 'AgentRuntimeId'),
          AgentRuntimeVersion: getRuntimeEndpointVersion(cfLogicalName, endpoint),
          Description: endpoint.description,
          Name: awsResourceNames.agentCoreRuntimeEndpoint(stackName, name, endpoint.name),
          Tags: getAgentCoreTags(runtime.tags)
        }) as any,
        nameChain
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        nameChain,
        paramName: 'endpointName',
        paramValue: awsResourceNames.agentCoreRuntimeEndpoint(stackName, name, endpoint.name),
        showDuringPrint: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        nameChain,
        paramName: 'endpointArn',
        paramValue: Ref(endpointLogicalName),
        showDuringPrint: true
      });
    });

    templateManager.addFinalTemplateOverrideFn(async (template) => {
      if (runtime.packaging.type === 'prebuilt-image') {
        return;
      }
      const imageUrl = deploymentArtifactManager.getImageUploadInfoForJob({
        jobName: getJobName({ workloadName: runtime.name, workloadType: runtime.type })
      })?.imageTagWithUrl;
      if (imageUrl) {
        template.Resources[cfLogicalName].Properties.AgentRuntimeArtifact.ContainerConfiguration.ContainerUri =
          imageUrl;
      }
    });

    templateManager.addFinalTemplateOverrideFn(async (template) => {
      const props = template.Resources[cfLogicalName].Properties;
      const variablesToInject = getResolvedConnectToEnvironmentVariables({
        connectTo: runtime.connectTo,
        localResolve: false
      });
      props.EnvironmentVariables = props.EnvironmentVariables || {};
      variablesToInject.forEach(({ Name, Value }) => {
        props.EnvironmentVariables[Name] = Value;
      });
    });
  });
};

const resolveAgentCoreMemories = () => {
  configManager.agentCoreMemories.forEach((memory) => {
    const cfLogicalName = cfLogicalNames.agentCoreMemory(memory.name);
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName,
      resource: new Memory({
        Name: awsResourceNames.agentCoreMemory(globalStateManager.targetStack.stackName, memory.name),
        Description: memory.description,
        EventExpiryDuration: memory.eventExpiryDuration || memory.expirationDays || 30,
        EncryptionKeyArn: memory.encryptionKeyArn,
        MemoryStrategies: memory.memoryStrategies,
        Tags: getAgentCoreTags(memory.tags)
      }) as any,
      nameChain: memory.nameChain
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: memory.nameChain,
      paramName: 'id',
      paramValue: GetAtt(cfLogicalName, 'MemoryId'),
      showDuringPrint: false
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: memory.nameChain,
      paramName: 'arn',
      paramValue: Ref(cfLogicalName),
      showDuringPrint: true
    });
  });
};

const resolveAgentCoreGateways = () => {
  configManager.agentCoreGateways.forEach((gateway) => {
    const { name, nameChain } = gateway;
    const roleLogicalName = cfLogicalNames.agentCoreGatewayRole(name);
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: roleLogicalName,
      resource: getAgentCoreExecutionRole({
        stpResourceName: name,
        roleSuffix: 'gateway',
        iamRoleStatements: getGatewayToolIamStatements(gateway)
      }),
      nameChain
    });

    const cfLogicalName = cfLogicalNames.agentCoreGateway(name);
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName,
      resource: new Gateway({
        Name: awsResourceNames.agentCoreGateway(globalStateManager.targetStack.stackName, name),
        Description: gateway.description,
        AuthorizerType: gateway.authorizer ? 'CUSTOM_JWT' : 'NONE',
        AuthorizerConfiguration: getAuthorizerConfiguration(gateway.authorizer),
        ProtocolType: 'MCP',
        ProtocolConfiguration: {
          Mcp: {
            Instructions: gateway.instructions,
            SupportedVersions: gateway.supportedVersions,
            SearchType: gateway.searchType
          }
        },
        ExceptionLevel: gateway.exceptionLevel,
        RoleArn: GetAtt(roleLogicalName, 'Arn'),
        Tags: getAgentCoreTags(gateway.tags)
      }) as any,
      nameChain
    });

    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'id',
      paramValue: Ref(cfLogicalName),
      showDuringPrint: false
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'arn',
      paramValue: GetAtt(cfLogicalName, 'GatewayArn'),
      showDuringPrint: true
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'url',
      paramValue: GetAtt(cfLogicalName, 'GatewayUrl'),
      showDuringPrint: true
    });

    (gateway.tools || []).forEach((tool) => {
      const targetLogicalName = cfLogicalNames.agentCoreGatewayTarget(name, tool.name);
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: targetLogicalName,
        resource: new GatewayTarget({
          GatewayIdentifier: Ref(cfLogicalName),
          Name: awsResourceNames.agentCoreGatewayTarget(globalStateManager.targetStack.stackName, name, tool.name),
          Description: tool.description,
          CredentialProviderConfigurations: [{ CredentialProviderType: 'GATEWAY_IAM_ROLE' }],
          TargetConfiguration: {
            Mcp: {
              Lambda: {
                LambdaArn: getGatewayToolLambdaArn(tool, gateway),
                ToolSchema: {
                  InlinePayload: tool.toolSchema.map((definition) => ({
                    Name: definition.name,
                    Description: definition.description || definition.name,
                    InputSchema: transformJsonSchema(definition.inputSchema),
                    OutputSchema: definition.outputSchema && transformJsonSchema(definition.outputSchema)
                  }))
                }
              }
            }
          }
        }) as any,
        nameChain
      });
    });
  });
};

const resolveAgentCoreBrowsers = () => {
  configManager.agentCoreBrowsers.forEach((browser) => {
    const roleLogicalName = cfLogicalNames.agentCoreBrowserRole(browser.name);
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: roleLogicalName,
      resource: getAgentCoreExecutionRole({
        stpResourceName: browser.name,
        roleSuffix: 'browser',
        iamRoleStatements: browser.recording?.bucketName
          ? [
              {
                Action: ['s3:GetBucketLocation', 's3:ListBucket'],
                Resource: [getBrowserRecordingS3BucketArn(browser.recording) as unknown as string]
              },
              {
                Action: ['s3:PutObject', 's3:GetObject', 's3:AbortMultipartUpload', 's3:ListMultipartUploadParts'],
                Resource: [getBrowserRecordingS3ObjectArn(browser.recording) as unknown as string]
              }
            ]
          : []
      }),
      nameChain: browser.nameChain
    });

    const cfLogicalName = cfLogicalNames.agentCoreBrowser(browser.name);
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName,
      resource: new BrowserCustom({
        Name: awsResourceNames.agentCoreBrowser(globalStateManager.targetStack.stackName, browser.name),
        Description: browser.description,
        ExecutionRoleArn: GetAtt(roleLogicalName, 'Arn'),
        NetworkConfiguration: { NetworkMode: 'PUBLIC' },
        RecordingConfig: browser.recording && {
          Enabled: browser.recording.enabled,
          S3Location: browser.recording.bucketName && {
            Bucket: browser.recording.bucketName,
            Prefix: browser.recording.prefix || ''
          }
        },
        Tags: getAgentCoreTags(browser.tags)
      }) as any,
      nameChain: browser.nameChain
    });
    addAgentCoreIdArnParams(browser.nameChain, cfLogicalName, 'BrowserId', 'BrowserArn');
  });
};

const resolveAgentCoreCodeInterpreters = () => {
  configManager.agentCoreCodeInterpreters.forEach((codeInterpreter) => {
    const roleLogicalName = cfLogicalNames.agentCoreCodeInterpreterRole(codeInterpreter.name);
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: roleLogicalName,
      resource: getAgentCoreExecutionRole({
        stpResourceName: codeInterpreter.name,
        roleSuffix: 'code-interpreter'
      }),
      nameChain: codeInterpreter.nameChain
    });

    const cfLogicalName = cfLogicalNames.agentCoreCodeInterpreter(codeInterpreter.name);
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName,
      resource: new CodeInterpreterCustom({
        Name: awsResourceNames.agentCoreCodeInterpreter(globalStateManager.targetStack.stackName, codeInterpreter.name),
        Description: codeInterpreter.description,
        ExecutionRoleArn: GetAtt(roleLogicalName, 'Arn'),
        NetworkConfiguration: { NetworkMode: 'PUBLIC' },
        Tags: getAgentCoreTags(codeInterpreter.tags)
      }) as any,
      nameChain: codeInterpreter.nameChain
    });
    addAgentCoreIdArnParams(codeInterpreter.nameChain, cfLogicalName, 'CodeInterpreterId', 'CodeInterpreterArn');
  });
};

const getAgentCoreExecutionRole = ({
  stpResourceName,
  roleSuffix,
  iamRoleStatements = [],
  accessToResourcesRequiringRoleChanges = [],
  accessToAwsServices = []
}: {
  stpResourceName: string;
  roleSuffix: string;
  iamRoleStatements?: StpIamRoleStatement[];
  accessToResourcesRequiringRoleChanges?: StpResourceScopableByConnectToAffectingRole[];
  accessToAwsServices?: ConnectToAwsServicesMacro[];
}) =>
  new Role({
    RoleName: awsResourceNames.agentCoreRole(
      globalStateManager.targetStack.stackName,
      globalStateManager.region,
      stpResourceName,
      roleSuffix
    ),
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: BEDROCK_AGENTCORE_PRINCIPAL },
          Action: 'sts:AssumeRole'
        }
      ]
    },
    Policies: [
      new Policy({
        PolicyName: 'agentcore-service-access',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['bedrock:*', 'bedrock-agentcore:*', 'bedrock-agentcore-control:*'],
              Resource: '*'
            },
            {
              Effect: 'Allow',
              Action: [
                'ecr:GetAuthorizationToken',
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage'
              ],
              Resource: '*'
            },
            {
              Effect: 'Allow',
              Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents', 'logs:DescribeLogStreams'],
              Resource: '*'
            }
          ]
        }
      }),
      ...getPoliciesForRoles({
        iamRoleStatements,
        accessToResourcesRequiringRoleChanges,
        accessToAwsServices
      })
    ]
  });

const getLinkedAgentCoreEnvironment = (runtime: StpAgentCoreRuntime): EnvironmentVar[] =>
  [
    runtime.useMemory && {
      name: 'STP_AGENTCORE_MEMORY_ID',
      value: GetAtt(cfLogicalNames.agentCoreMemory(runtime.useMemory), 'MemoryId')
    },
    runtime.useGateway && {
      name: 'STP_AGENTCORE_GATEWAY_URL',
      value: GetAtt(cfLogicalNames.agentCoreGateway(runtime.useGateway), 'GatewayUrl')
    },
    runtime.useBrowser && {
      name: 'STP_AGENTCORE_BROWSER_ID',
      value: GetAtt(cfLogicalNames.agentCoreBrowser(runtime.useBrowser), 'BrowserId')
    },
    runtime.useCodeInterpreter && {
      name: 'STP_AGENTCORE_CODE_INTERPRETER_ID',
      value: GetAtt(cfLogicalNames.agentCoreCodeInterpreter(runtime.useCodeInterpreter), 'CodeInterpreterId')
    }
  ].filter(Boolean) as unknown as EnvironmentVar[];

const getRuntimeEndpoints = (runtime: StpAgentCoreRuntime): AgentCoreRuntimeEndpointConfig[] =>
  (runtime.endpoints?.length ? runtime.endpoints : ['default']).map((endpoint) =>
    typeof endpoint === 'string' ? { name: endpoint } : endpoint
  );

export const getRuntimeEndpointVersion = (
  runtimeCfLogicalName: string,
  endpoint: AgentCoreRuntimeEndpointConfig
): string | ReturnType<typeof GetAtt> => endpoint.runtimeVersion || GetAtt(runtimeCfLogicalName, 'AgentRuntimeVersion');

export const getBrowserRecordingS3ObjectArn = (recording: NonNullable<AgentCoreBrowserProps['recording']>) => {
  const prefix = recording.prefix || '';
  return isLiteralBucketName(recording.bucketName)
    ? `arn:aws:s3:::${recording.bucketName}/${prefix}*`
    : Join('', ['arn:aws:s3:::', recording.bucketName, '/', prefix, '*']);
};

export const getBrowserRecordingS3BucketArn = (recording: NonNullable<AgentCoreBrowserProps['recording']>) => {
  return isLiteralBucketName(recording.bucketName)
    ? `arn:aws:s3:::${recording.bucketName}`
    : Join('', ['arn:aws:s3:::', recording.bucketName]);
};

const isLiteralBucketName = (bucketName: NonNullable<AgentCoreBrowserProps['recording']>['bucketName']) =>
  typeof bucketName === 'string' && !getIsDirective(bucketName);

const getGatewayToolLambdaArn = (tool: AgentCoreGatewayTool, gateway: StpAgentCoreGateway) => {
  if (tool.lambdaArn) {
    return tool.lambdaArn;
  }
  return GetAtt(
    resolveReferenceToLambdaFunction({
      stpResourceReference: tool.function,
      referencedFrom: gateway.name,
      referencedFromType: gateway.type as any
    }).cfLogicalName,
    'Arn'
  );
};

const getGatewayToolIamStatements = (gateway: StpAgentCoreGateway): StpIamRoleStatement[] =>
  (gateway.tools || []).map((tool) => ({
    Action: ['lambda:InvokeFunction'],
    Resource: [getGatewayToolLambdaArn(tool, gateway) as unknown as string]
  }));

const getAuthorizerConfiguration = (authorizer?: AgentCoreJwtAuthorizerConfig) =>
  authorizer && {
    CustomJWTAuthorizer: {
      DiscoveryUrl: authorizer.discoveryUrl,
      AllowedAudience: authorizer.allowedAudience,
      AllowedClients: authorizer.allowedClients,
      AllowedScopes: authorizer.allowedScopes
    }
  };

const getAgentCoreTags = (tags?: CloudformationTag[]) =>
  Object.fromEntries(stackManager.getTags(tags).map(({ Key, Value }) => [Key, Value]));

const addAgentCoreIdArnParams = (
  nameChain: string[],
  cfLogicalName: string,
  idAttribute: string,
  arnAttribute: string
) => {
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain,
    paramName: 'id',
    paramValue: GetAtt(cfLogicalName, idAttribute),
    showDuringPrint: false
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain,
    paramName: 'arn',
    paramValue: GetAtt(cfLogicalName, arnAttribute),
    showDuringPrint: true
  });
};

export const transformJsonSchema = (schema: any): any => {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map(transformJsonSchema);
  }
  const supportedKeys = new Set(['type', 'properties', 'required', 'items', 'description']);
  const transformed: Record<string, any> = {};
  Object.entries(schema).forEach(([key, value]) => {
    if (!supportedKeys.has(key)) {
      return;
    }
    const transformedKey = key[0].toUpperCase() + key.slice(1);
    transformed[transformedKey] =
      key === 'properties' && value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(
            Object.entries(value).map(([propName, propValue]) => [propName, transformJsonSchema(propValue)])
          )
        : transformJsonSchema(value);
  });
  return transformed;
};
