import type { StpContainerWorkload } from './resolved-types/multi-container-workloads';
import type { Script, StpResourceType } from './resolved-types/resources';
import { VALID_CONFIG_PATHS } from 'src/config/random';
import { CliError } from '@utils/errors';
import type { Subtype } from '@utils/type-helpers';

const inlineCode = (value: unknown) => `\`${String(value)}\``;

export const configErrors = {
  directiveResourceNotFound({
    directiveType,
    resourceName
  }: {
    directiveType: '$ResourceParam' | '$CfResourceParam';
    resourceName: string;
  }): CliError {
    const alternativeDirective = directiveType === '$ResourceParam' ? '$CfResourceParam' : '$ResourceParam';
    return new CliError({
      category: 'DIRECTIVE',
      code: 'DIRECTIVE_RESOURCE_NOT_FOUND',
      message: `Cannot resolve resource ${inlineCode(resourceName)} referenced by ${inlineCode(directiveType)}.`,
      hints: [
        `${inlineCode(directiveType)} only works for ${
          directiveType === '$CfResourceParam'
            ? 'user-defined CloudFormation resources and child CloudFormation resources of Stacktape resources.'
            : 'Stacktape resources configured in the `resources` section.'
        }`,
        `If you want to reference parameters of ${
          directiveType === '$ResourceParam'
            ? 'CloudFormation resource'
            : 'a Stacktape resource configured in the `resources` section'
        }, use ${inlineCode(alternativeDirective)}.`
      ]
    });
  },
  directiveResourceParameterInvalid({
    directiveType,
    referencableParams,
    referencedParam,
    resourceName
  }: {
    directiveType: '$ResourceParam' | '$CfResourceParam';
    referencableParams: string[];
    referencedParam: string;
    resourceName: string;
  }): CliError {
    return new CliError({
      category: 'DIRECTIVE',
      code: 'DIRECTIVE_RESOURCE_PARAMETER_INVALID',
      message: `Parameter ${inlineCode(referencedParam)} referenced by ${inlineCode(directiveType)} is not available on resource ${inlineCode(resourceName)}.`,
      hints: referencableParams.length
        ? `Available parameters: ${referencableParams.map(inlineCode).join(', ')}.`
        : `Resource ${inlineCode(resourceName)} does not expose any parameters for ${inlineCode(directiveType)}.`
    });
  },
  configFileMissing(): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_FILE_REQUIRED',
      message: [
        'This command requires a Stacktape config. Provide it in one of these ways:',
        ` - Stacktape auto-detects config files named ${VALID_CONFIG_PATHS.map(inlineCode).join(', ')} in your project root.`,
        ` - Specify the config path using ${inlineCode('--configPath')}.`,
        ` - Specify a Console template ID using ${inlineCode('--templateId')}.`
      ].join('\n'),
      hints: `Create a Stacktape configuration manually, or run ${inlineCode('stacktape init')} to bootstrap one or choose a starter template.`
    });
  },
  customArtifactHandlerRequired({ functionName }: { functionName: string }): CliError {
    return new CliError({
      category: 'CONFIG',
      code: 'CONFIG_LAMBDA_CUSTOM_ARTIFACT_HANDLER_REQUIRED',
      message: `Lambda function ${inlineCode(functionName)} must have ${inlineCode(
        'handler'
      )} property specified when using custom-artifact packaging type.`
    });
  },
  customArtifactRuntimeRequired({ functionName }: { functionName: string }): CliError {
    return new CliError({
      category: 'CONFIG',
      code: 'CONFIG_LAMBDA_CUSTOM_ARTIFACT_RUNTIME_REQUIRED',
      message: `Lambda function ${inlineCode(
        functionName
      )} must set ${inlineCode('runtime')} when using custom-artifact packaging type.`
    });
  },
  unresolvedResourceReference({
    stpResourceName,
    stpResourceType,
    referencedFromType,
    referencedFrom,
    validResourcePath,
    invalidRestResourcePath,
    possibleNestedResources,
    incorrectResourceType
  }: {
    stpResourceName: string;
    stpResourceType?: StpResourceType;
    referencedFromType?: StpResourceType | 'alarm';
    referencedFrom: string;
    validResourcePath: string;
    invalidRestResourcePath: string;
    possibleNestedResources?: string[];
    incorrectResourceType?: boolean;
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_RESOURCE_REFERENCE_UNRESOLVED',
      message: `Referenced resource with name ${inlineCode(stpResourceName)}${
        stpResourceType ? ` of type ${inlineCode(stpResourceType as StpResourceType)}` : ''
      } could not be resolved in the config (referenced from ${inlineCode(referencedFrom)}${
        referencedFromType ? `(${inlineCode(referencedFromType as StpResourceType)})` : ''
      }).`,
      hints:
        validResourcePath && invalidRestResourcePath
          ? [
              `Resource ${inlineCode(validResourcePath)} does not contain nested resource "${
                invalidRestResourcePath.split('.')[0]
              }"`
            ].concat(
              possibleNestedResources?.length
                ? `Possible nested resources: ${possibleNestedResources.map(inlineCode).join(', ')}`
                : []
            )
          : incorrectResourceType
            ? `Referenced resource does not have the correct type (${inlineCode(stpResourceType as StpResourceType)})`
            : undefined
    });
  },
  listenerPortWithoutCustomListeners({
    stpLoadBalancerName,
    referencedFromType,
    referencedFrom
  }: {
    stpLoadBalancerName: string;
    referencedFromType?: StpResourceType | 'alarm';
    referencedFrom: string;
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_ALB_LISTENER_PORT_UNEXPECTED',
      message:
        `Error in ${referencedFromType ? `${referencedFromType} ` : ''}resource ${inlineCode(
          referencedFrom
        )} when referencing application-load-balancer ${inlineCode(stpLoadBalancerName)}.\n` +
        `You cannot specify ${inlineCode(
          'listenerPort'
        )} property when application-load-balancer does not use custom ${inlineCode('listeners')}.`
    });
  },
  listenerNotFound({
    stpLoadBalancerName,
    listenerPort,
    referencedFromType,
    referencedFrom
  }: {
    stpLoadBalancerName: string;
    listenerPort: number;
    referencedFromType?: StpResourceType | 'alarm';
    referencedFrom: string;
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_ALB_LISTENER_NOT_FOUND',
      message:
        `Error in ${referencedFromType || ''} resource ${inlineCode(referencedFrom)}.\n` +
        `Referenced application-load-balancer ${inlineCode(
          stpLoadBalancerName
        )} does NOT have listener on port ${inlineCode(listenerPort)}.`
    });
  },
  listenerPortRequired({
    stpLoadBalancerName,
    referencedFromType,
    referencedFrom
  }: {
    stpLoadBalancerName: string;
    referencedFromType?: StpResourceType | 'alarm';
    referencedFrom: string;
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_ALB_LISTENER_PORT_REQUIRED',
      message:
        `Error in ${referencedFromType ? `${referencedFromType} ` : ''}resource ${inlineCode(
          referencedFrom
        )} when referencing application-load-balancer ${inlineCode(stpLoadBalancerName)}.\n` +
        `You need to specify ${inlineCode(
          'listenerPort'
        )} property when application-load-balancer uses custom ${inlineCode('listeners')}.`
    });
  },
  domainAssociatedWithMultipleResources({
    fullDomainName,
    associations
  }: {
    fullDomainName: string;
    associations: string[];
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_DOMAIN_ASSOCIATION_CONFLICT',
      message: `You are trying to associate single domain (${inlineCode(
        fullDomainName
      )}) to multiple resources.\nAssociated resources: ${associations
        .map((resource) => `${inlineCode(resource)}`)
        .join(', ')}`,
      hints: 'Single domain can be associated only to single resource.'
    });
  },
  deploymentRequiresAlbIntegration({
    stpResourceName,
    resourceType
  }: {
    stpResourceName: string;
    resourceType: StpContainerWorkload['configParentResourceType'];
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_DEPLOYMENT_ALB_INTEGRATION_REQUIRED',
      message: `Error in ${inlineCode(resourceType)} ${inlineCode(
        stpResourceName
      )}: The compute resource must use application-load-balancer ${inlineCode(
        'event'
      )} integration to use ${inlineCode('deployment')}.`
    });
  },
  alarmReferenceNotFound({
    alarmReference,
    referencedFromType,
    referencedFrom
  }: {
    alarmReference: string;
    referencedFromType?: StpResourceType | 'alarm';
    referencedFrom: string;
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_ALARM_REFERENCE_NOT_FOUND',
      message: `Alarm ${inlineCode(alarmReference)} referenced from ${inlineCode(referencedFrom)} ${
        referencedFromType ? `(${referencedFromType})` : ''
      } is not defined in this config.`
    });
  },
  deploymentRequiresSingleAlbTarget({
    stpResourceName,
    resourceType
  }: {
    stpResourceName: string;
    resourceType: StpContainerWorkload['configParentResourceType'];
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_DEPLOYMENT_ALB_TARGET_INVALID',
      message: `Error in ${inlineCode(resourceType)} ${inlineCode(
        stpResourceName
      )}: Only one container of compute resource can be targeted by exactly one application-load-balancer listener when using ${inlineCode(
        'deployment'
      )} property.`
    });
  },
  deploymentIncompatibleWithServiceConnect({
    workloadName,
    workloadType
  }: {
    workloadName: string;
    workloadType: StpContainerWorkload['configParentResourceType'];
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_DEPLOYMENT_SERVICE_CONNECT_CONFLICT',
      message: `Error in ${inlineCode(workloadType)} ${inlineCode(
        workloadName
      )}: Property "${inlineCode('deployment')}" cannot be used when using "service-connect" events.`
    });
  },
  webServiceDeploymentRequiresAlb({ webServiceName }: { webServiceName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_WEB_SERVICE_DEPLOYMENT_ALB_REQUIRED',
      message: `Error in ${inlineCode('web-service')} ${inlineCode(webServiceName)}. When using ${inlineCode(
        'deployment'
      )} property, you must use load balancing type "application-load-balancer".`
    });
  },
  webServiceAlarmIncompatibleWithLoadBalancing({ webServiceName }: { webServiceName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_WEB_SERVICE_ALARM_INCOMPATIBLE',
      message: `Error in ${inlineCode('web-service')} ${inlineCode(webServiceName)}. You can only use ${inlineCode(
        'alarms'
      )} compatible with web service load balancing type (i.e ${inlineCode(
        'application-load-balancer'
      )} alarms for ${inlineCode('application-load-balancer')} and ${inlineCode(
        'http-api-gateway'
      )} alarms for ${inlineCode('http-api-gateway')}).`
    });
  },
  sqsFifoOptionRequiresFifo({ stpSqsQueueName }: { stpSqsQueueName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_SQS_FIFO_OPTION_REQUIRES_FIFO',
      message: `Error in ${inlineCode('sqs-queue')} ${inlineCode(
        stpSqsQueueName
      )}. Properties ${inlineCode('fifoHighThroughput')} and ${inlineCode(
        'contentBasedDeduplication'
      )} can only be used when fifo is enabled(property ${inlineCode('fifoEnabled')} is set to ${inlineCode('true')}).`
    });
  },
  snsContentDeduplicationRequiresFifo({ stpSqsQueueName }: { stpSqsQueueName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_SNS_DEDUPLICATION_REQUIRES_FIFO',
      message: `Error in ${inlineCode('sns-topic')} ${inlineCode(stpSqsQueueName)}. Property ${inlineCode(
        'contentBasedDeduplication'
      )} can only be used when fifo is enabled(property ${inlineCode('fifoEnabled')} is set to ${inlineCode('true')}).`
    });
  },
  containerResourcesInvalid({
    workloadName,
    workloadType
  }: {
    workloadName: string;
    workloadType: StpContainerWorkload['type'];
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_CONTAINER_RESOURCES_INVALID',
      message: [
        `Error in ${inlineCode(workloadType)} ${inlineCode(
          workloadName
        )}: When configuring ${inlineCode('resources')} you must choose one of:`,
        `1. Specify ${inlineCode('cpu')} and ${inlineCode(
          'memory'
        )} properties only (FARGATE launch type will be used).`,
        `2. Specify ${inlineCode(
          'instanceTypes'
        )} property (EC2 launch type will be used). You can optionally also configure ${inlineCode(
          'cpu'
        )} and ${inlineCode('memory')}`
      ].join('\n'),
      hints: [
        `See resource docs to learn more: https://docs.stacktape.com/compute-resources/${workloadType}s/#resources`
      ]
    });
  },
  scalingRangeInvalid({
    workloadName,
    workloadType
  }: {
    workloadName: string;
    workloadType: StpContainerWorkload['type'];
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_SCALING_RANGE_INVALID',
      message: `Error in ${inlineCode(workloadType)} ${inlineCode(
        workloadName
      )}: ${inlineCode('scaling.minInstances')} and ${inlineCode(
        'scaling.maxInstances'
      )} must both be at least 1, and ${inlineCode(
        'scaling.maxInstances'
      )} must be greater than or equal to ${inlineCode('scaling.minInstances')}.`
    });
  },
  pythonAppVariableRequiresRunAppAs({
    workloadType,
    workloadName,
    appVariable
  }: {
    workloadType: StpResourceType;
    workloadName: string;
    appVariable: string;
  }): CliError {
    return new CliError({
      category: 'PACKAGING_CONFIG',
      code: 'PACKAGING_CONFIG_PYTHON_RUN_APP_AS_REQUIRED',
      message: `Error in ${inlineCode(workloadType)} ${inlineCode(workloadName)}:
  You have specified ${inlineCode('app_variable')} "${appVariable}" in your ${inlineCode(
    'entryfilePath'
  )}. In this case, you must also specify ${inlineCode(
    'runAppAs'
  )} property in the ${inlineCode('languageSpecificConfig')}`
    });
  },
  httpApiRouteConflict({
    stpHttpApiGatewayName,
    stpResourceName1,
    stpResourceName2
  }: {
    stpHttpApiGatewayName: string;
    stpResourceName1: string;
    stpResourceName2: string;
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_HTTP_API_ROUTE_CONFLICT',
      message: `Error in event integrations of ${inlineCode('http-api-gateway')} ${inlineCode(
        stpHttpApiGatewayName
      )}. Events on two different resources(${inlineCode(
        stpResourceName1
      )} and ${inlineCode(stpResourceName2)}) are using the same ${inlineCode(
        'path'
      )} and ${inlineCode('method')} which is not allowed.`
    });
  },
  albPriorityConflict({
    stpApplicationLoadBalancerName,
    stpResourceName1,
    stpResourceName2
  }: {
    stpApplicationLoadBalancerName: string;
    stpResourceName1: string;
    stpResourceName2: string;
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_ALB_PRIORITY_CONFLICT',
      message: `Error in event integrations of ${inlineCode('application-load-balancer')} ${inlineCode(
        stpApplicationLoadBalancerName
      )}. Events on two different resources(${inlineCode(
        stpResourceName1
      )} and ${inlineCode(stpResourceName2)}) are using the same ${inlineCode('priority')} which is not allowed.`
    });
  },
  bastionScriptRequiresBastion({
    scriptType
  }: {
    scriptType: Subtype<Script['type'], 'bastion-script' | 'local-script-with-bastion-tunneling'>;
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_BASTION_SCRIPT_REQUIRES_BASTION',
      message: `Error in ${inlineCode('script')}. You cannot use script of type ${inlineCode(
        scriptType
      )} if resource of type ${inlineCode('bastion')} does not exist in the config.`
    });
  },
  lambdaHandlerFormatInvalid({ functionName }: { functionName: string }): CliError {
    return new CliError({
      category: 'CONFIG',
      code: 'CONFIG_LAMBDA_HANDLER_FORMAT_INVALID',
      message: `${inlineCode('Handler')} property of lambda function ${inlineCode(functionName)} has invalid format.`,
      hints: `Handler must be in shape ${inlineCode('{{filePath}}:{{handlerFunction}}')}`
    });
  },
  nextjsEdgeStreamingConflict({ stpResourceName }: { stpResourceName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_NEXTJS_EDGE_STREAMING_CONFLICT',
      message: `Error in ${inlineCode(stpResourceName)} (${inlineCode('nextjs-web')}) Cannot use edge lambdas ${inlineCode('useEdgeLambda')} together with streaming responses ${inlineCode('streamingEnabled')}.`
    });
  },
  appDirectoryMissing({
    directoryPath,
    stpResourceName,
    resolvedPath
  }: {
    directoryPath: string;
    stpResourceName: string;
    resolvedPath?: string;
  }): CliError {
    const resolvedPathHint = resolvedPath ? `\nResolved absolute path: "${inlineCode(resolvedPath)}"` : '';
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_APP_DIRECTORY_MISSING',
      message: `Error in ${inlineCode(stpResourceName)} resource: Specified directory "${inlineCode(directoryPath)}" is not accessible or not a directory.${resolvedPathHint}`,
      hints:
        'The appDirectory path is relative to the directory containing your Stacktape config file. If your config is already inside the app directory, use "." (the default) instead.'
    });
  },
  nextjsProjectMissing({
    directoryPath,
    stpResourceName
  }: {
    directoryPath: string;
    stpResourceName: string;
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_NEXTJS_PROJECT_MISSING',
      message: `Error in ${inlineCode(stpResourceName)} resource: Specified directory "${inlineCode(directoryPath)}" does not seem to contain a Next.js project (no Next.js dependency or next.config file was found).`
    });
  },
  sqsRedriveTargetAmbiguous({ sqsQueueReferencerStpName }: { sqsQueueReferencerStpName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_SQS_REDRIVE_TARGET_AMBIGUOUS',
      message: `Error in ${inlineCode('sqs-queue')} ${inlineCode(
        sqsQueueReferencerStpName
      )}. When referencing target sqs queue in redrive policy, you must specify exactly one of ${inlineCode(
        'targetSqsQueueName'
      )} or ${inlineCode('targetSqsQueueArn')} properties.`
    });
  },
  nlbListenerIntegrationCountInvalid({
    stpLoadBalancerName,
    referencingWorkloadNames,
    port
  }: {
    stpLoadBalancerName: string;
    referencingWorkloadNames: string[];
    port: number;
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_NLB_LISTENER_INTEGRATION_COUNT_INVALID',
      message: `Error in network load-balancer ${inlineCode(
        stpLoadBalancerName
      )}. Listener with port ${port} has ${referencingWorkloadNames.length} integrations (${referencingWorkloadNames.join(
        ', '
      )}). Each network load balancer listener must have exactly one integration.`
    });
  },
  webServiceCdnLoadBalancingInvalid({ webServiceName }: { webServiceName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_WEB_SERVICE_CDN_LOAD_BALANCING_INVALID',
      message: `Error in ${inlineCode('web-service')} ${inlineCode(
        webServiceName
      )}. CDN can only be used with web services that use ${inlineCode('http-api-gateway')} (default) or ${inlineCode('application-load-balancer')} load balancing types.`
    });
  },
  customCertificateRequiredWhenDnsDisabled({
    resourceName,
    resourceType
  }: {
    resourceName: string;
    resourceType: 'web-service' | 'application-load-balancer' | 'network-load-balancer';
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_CUSTOM_CERTIFICATE_REQUIRED',
      message: `Error in ${inlineCode(resourceType)} ${inlineCode(resourceName)}. If ${inlineCode(
        'disableDnsRecordCreation'
      )} is set to true, you must also specify ${inlineCode('customCertificateArn')}.`
    });
  },
  lambdaEfsRequiresVpc({ lambdaStpResourceName }: { lambdaStpResourceName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_LAMBDA_EFS_REQUIRES_VPC',
      message: `Error in ${inlineCode('function')} ${inlineCode(lambdaStpResourceName)}: When using ${inlineCode(
        'volumeMounts'
      )}, the property ${inlineCode('joinDefaultVpc')} must be set to ${inlineCode('true')}.`,
      hints: 'Be aware that a Lambda function joined to a VPC cannot access the internet.'
    });
  },
  rdsMaintenanceWindowInvalid({ stpResourceName }: { stpResourceName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_RDS_MAINTENANCE_WINDOW_INVALID',
      message: `Error in ${inlineCode('relational-database')} ${inlineCode(stpResourceName)}. Preferred maintenance window must be in format "day:hour:minute-day:hour:minute" (e.g. ${inlineCode('Sun:02:00-Sun:04:00')}).`
    });
  },
  nextjsEdgeVpcConflict({ stpResourceName }: { stpResourceName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_NEXTJS_EDGE_VPC_CONFLICT',
      message: `Error in ${inlineCode('nextjs-web')} ${inlineCode(stpResourceName)}. You cannot use ${inlineCode('joinDefaultVpc')} property when using edge lambda.`
    });
  },
  warmPoolMixedInstanceTypes({
    stpResourceName,
    stpResourceType
  }: {
    stpResourceName: string;
    stpResourceType: StpContainerWorkload['configParentResourceType'];
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_WARM_POOL_INSTANCE_TYPES_INVALID',
      message: `Error in ${inlineCode(stpResourceType)} ${inlineCode(stpResourceName)}. Property ${inlineCode('enableWarmPool')} can only be used when you specify exactly one instance type in ${inlineCode('instanceTypes')}. Warm pools are not supported with mixed instance types.`
    });
  },
  cpuArchitectureWithEc2Invalid({
    stpResourceName,
    stpResourceType
  }: {
    stpResourceName: string;
    stpResourceType: StpContainerWorkload['configParentResourceType'];
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_CPU_ARCHITECTURE_EC2_CONFLICT',
      message: `Error in ${inlineCode(stpResourceType)} ${inlineCode(stpResourceName)}. Property ${inlineCode('cpuArchitecture')} cannot be used when ${inlineCode('instanceTypes')} is specified.`,
      hints: `Property ${inlineCode('cpuArchitecture')} is only used when using Fargate launch type (when ${inlineCode('instanceTypes')} is not specified). When using EC2 launch type, CPU architecture is determined by the instance type.`
    });
  },
  typescriptDefaultExportNotFunction({ configPath }: { configPath: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_TYPESCRIPT_DEFAULT_EXPORT_INVALID',
      message: `The default export from ${inlineCode(configPath)} must be created with ${inlineCode('defineConfig')}.`
    });
  },
  configObjectInvalid({ configPath, config }: { configPath: string; config: any }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_OBJECT_INVALID',
      message: `Could not load valid config object from file ${inlineCode(configPath)}. Returned value: ${config}`
    });
  },
  reusedVpcSelectorInvalid(_arg: null): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_REUSED_VPC_SELECTOR_INVALID',
      message: `Invalid ${inlineCode(
        'stackConfig.vpc.reuseVpc'
      )} configuration. Specify either ${inlineCode('vpcId')} or both ${inlineCode(
        'projectName'
      )} and ${inlineCode('stage')}, but not both methods.`
    });
  },
  configDependencyMissing({ configPath, packageName }: { configPath: string; packageName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_DEPENDENCY_MISSING',
      message: `Cannot find package ${inlineCode(packageName)} when loading config from ${inlineCode(configPath)}.`,
      hints: `Install it with ${inlineCode(`npm install ${packageName}`)} or ${inlineCode(`bun add ${packageName}`)}.`
    });
  },
  typescriptSyntaxInvalid({ configPath, errorMessage }: { configPath: string; errorMessage: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_TYPESCRIPT_SYNTAX_INVALID',
      message: `Syntax error in TypeScript config ${inlineCode(configPath)}.`,
      hints: `Error details: ${errorMessage}`
    });
  },
  typescriptExecutionFailed({
    configPath,
    errorMessage,
    userStackTrace
  }: {
    configPath: string;
    errorMessage: string;
    userStackTrace?: string;
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_TYPESCRIPT_EXECUTION_FAILED',
      message: `Failed to execute TypeScript config ${inlineCode(configPath)}.`,
      detail: { title: errorMessage, codeFrame: userStackTrace }
    });
  },
  typescriptExportMissing({ configPath }: { configPath: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_TYPESCRIPT_EXPORT_MISSING',
      message: `TypeScript config ${inlineCode(configPath)} must export the result of ${inlineCode('defineConfig')} as its default export.`,
      hints: `Example:\n${inlineCode(`import { defineConfig } from 'stacktape';\nexport default defineConfig(({ stage }) => ({ resources: {} }));`)}`
    });
  },
  typescriptDefineConfigRequired({ configPath }: { configPath: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_TYPESCRIPT_DEFINE_CONFIG_REQUIRED',
      message: `The default export from ${inlineCode(configPath)} did not produce a Stacktape configuration.`,
      hints: `Wrap the configuration factory with ${inlineCode('defineConfig')} and export it as the default export.`
    });
  },
  resourceDirectoryMissing({
    directoryPath,
    stpResourceName,
    propertyName,
    resolvedPath
  }: {
    directoryPath: string;
    stpResourceName: string;
    propertyName: string;
    resolvedPath?: string;
  }): CliError {
    const resolvedPathHint = resolvedPath ? `\nResolved absolute path: "${inlineCode(resolvedPath)}"` : '';
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_RESOURCE_DIRECTORY_MISSING',
      message: `Error in ${inlineCode(stpResourceName)} resource: Directory from ${inlineCode(propertyName)} ("${inlineCode(directoryPath)}") is not accessible or not a directory.${resolvedPathHint}`,
      hints:
        'Relative paths are resolved from the directory containing your Stacktape config file. If your config is already inside that app directory, use "." (the default) instead.'
    });
  },
  pythonAppVariableRequired({
    entryfilePath,
    workloadType,
    workloadName
  }: {
    entryfilePath: string;
    workloadType: StpResourceType;
    workloadName: string;
  }): CliError {
    return new CliError({
      category: 'PACKAGING_CONFIG',
      code: 'PACKAGING_CONFIG_PYTHON_APP_VARIABLE_REQUIRED',
      message: `Error in ${inlineCode(workloadType)} ${inlineCode(workloadName)}:
  If you want to run the app as WSGI/ASGI, specify the app variable (WSGI/ASGI callable) in ${inlineCode(
    'entryfilePath'
  )}, e.g. ${inlineCode(`${entryfilePath}:<<app_variable>>`)}.`,
      hints: `${inlineCode('Typical paths')} for common frameworks:
  Django: ${inlineCode('project/asgi.py:application')}
  Flask: ${inlineCode('project/app.py:application')}
  FastAPI: ${inlineCode('project/main.py:app')}`
    });
  },
  runAppAsPackagingInvalid({
    workloadType,
    workloadName
  }: {
    workloadType: StpResourceType;
    workloadName: string;
  }): CliError {
    return new CliError({
      category: 'PACKAGING_CONFIG',
      code: 'PACKAGING_CONFIG_RUN_APP_AS_INVALID',
      message: `Error in ${inlineCode(workloadType)} ${inlineCode(workloadName)}:
  Property ${inlineCode('runAppAs')} can be specified only for ${inlineCode(
    'stacktape-image-buildpack'
  )} packaging type.`
    });
  },
  webServiceFirewallLoadBalancingInvalid({ webServiceName }: { webServiceName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_WEB_SERVICE_FIREWALL_LOAD_BALANCING_INVALID',
      message: `Error in ${inlineCode('web-service')} ${inlineCode(
        webServiceName
      )}. You can only use ${inlineCode('useFirewall')} with ${inlineCode(
        'application-load-balancer'
      )} load balancing type.`
    });
  },
  firewallScopeIncompatible({ firewallName }: { firewallName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_FIREWALL_SCOPE_INCOMPATIBLE',
      message: `Error in ${inlineCode('web-app-firewall')} ${inlineCode(firewallName)}. Firewall with ${inlineCode(
        'scope: cdn'
      )} can't be used with regional resources without CDN, and firewall with ${inlineCode(
        'scope: regional'
      )} can't be used with resources using CDN.`
    });
  },
  uptimeCheckBodyAssertionRequiresGet({ checkName }: { checkName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_UPTIME_CHECK_BODY_ASSERTION_REQUIRES_GET',
      message: `Error in ${inlineCode('uptime-check')} ${inlineCode(checkName)}: a ${inlineCode(
        'body-contains'
      )} assertion requires ${inlineCode('method: GET')} — a ${inlineCode('HEAD')} response has no body to match.`,
      hints: [`Use ${inlineCode('method: GET')}, or remove the ${inlineCode('body-contains')} assertion.`]
    });
  },
  uptimeCheckValueOutOfRange({
    checkName,
    property,
    min,
    max,
    actual
  }: {
    checkName: string;
    property: string;
    min: number;
    max: number;
    actual: number;
  }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_UPTIME_CHECK_VALUE_OUT_OF_RANGE',
      message: `Error in ${inlineCode('uptime-check')} ${inlineCode(checkName)}: ${inlineCode(
        property
      )} must be between ${min} and ${max} (got ${actual}).`
    });
  },
  uptimeCheckRegionsInvalid({ checkName, reason }: { checkName: string; reason: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_UPTIME_CHECK_REGIONS_INVALID',
      message: `Error in ${inlineCode('uptime-check')} ${inlineCode(checkName)}: ${reason}`
    });
  },
  tracingSamplingRateInvalid({ source, actual }: { source: string; actual: number }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_TRACING_SAMPLING_RATE_INVALID',
      message: `Invalid tracing configuration in ${source}: ${inlineCode('samplingRate')} must be a number between 0 and 1 (got ${actual}).`
    });
  },
  uptimeChecksLimitExceeded({ count, limit }: { count: number; limit: number }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_UPTIME_CHECKS_LIMIT_EXCEEDED',
      message: `This stack defines ${count} ${inlineCode('uptime-check')} resources; at most ${limit} are supported per stack.`
    });
  },
  uptimeCheckAssertionInvalid({ checkName, reason }: { checkName: string; reason: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_UPTIME_CHECK_ASSERTION_INVALID',
      message: `Error in ${inlineCode('uptime-check')} ${inlineCode(checkName)}: ${reason}`
    });
  },
  uptimeCheckUrlInvalid({ checkName, url }: { checkName: string; url: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_UPTIME_CHECK_URL_INVALID',
      message: `Error in ${inlineCode('uptime-check')} ${inlineCode(checkName)}: ${inlineCode(
        'url'
      )} must be an ${inlineCode('http://')} or ${inlineCode('https://')} URL (got ${inlineCode(url)}).`,
      hints: [
        `Use a full URL like ${inlineCode('https://api.example.com/health')}, or reference a deployed resource with ${inlineCode("$ResourceParam('api', 'url')")}.`
      ]
    });
  },
  alarmConsoleChannelRequiresHistory({ alarmName }: { alarmName: string }): CliError {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_ALARM_CONSOLE_CHANNEL_REQUIRES_HISTORY',
      message: `Alarm ${inlineCode(alarmName)} uses a ${inlineCode(
        'console-channel'
      )} notification channel together with ${inlineCode(
        'includeInHistory: false'
      )}. Console channels are delivered through the Stacktape Console, which requires history routing.`,
      hints: [
        `Remove ${inlineCode('includeInHistory: false')}, or replace the ${inlineCode(
          'console-channel'
        )} entry with an inline channel (slack, ms-teams, discord, email, webhook).`
      ]
    });
  }
};
