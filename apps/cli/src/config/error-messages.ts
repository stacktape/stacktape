import type { GlobalStateConnectedAwsAccount } from '@application-services/global-state-manager/types';
import { CliError, type ErrorCategory } from '@utils/errors';
import type { StpCfInfrastructureModuleType } from '@domain-services/cloudformation-registry-manager/types';
import type { ArgType, Subtype } from '@utils/type-helpers';
import type { StacktapeCommand } from 'src/config/cli/types';
import type {
  StpDomainAttachableResourceType,
  StpResourceType
} from '@domain-services/config-manager/resolved-types/resources';
import type { AlarmDefinition } from '@stacktape/config/alarms';
import { tuiManager } from '@application-services/tui-manager';
import { StackStatus } from '@aws-sdk/client-cloudformation';
import {
  STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS,
  STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS
} from 'src/aws/cloudformation';
import type { ValidatedAwsCredentials } from 'src/aws/credentials';
import { consoleLinks } from '@stacktape/naming/console-links';
import { getApexDomain } from '@utils/domains';

const STACKTAPE_DOMAINS_CONSOLE_URL = 'https://console.stacktape.com/domains';
const DOMAINS_DOCS_URL = 'https://docs.stacktape.com/other-resources/domains-and-certificates/';

const wrap = (
  errorsObj: typeof errors
): {
  [errorCode in ErrorCode]: (arg: ArgType<(typeof errors)[errorCode]>) => CliError;
} => {
  const res = {};
  for (const errCode in errorsObj) {
    res[errCode] = (props) => {
      const definition: ReturnedError = errorsObj[errCode](props);
      const error = new CliError({
        category: definition.type,
        code: `${definition.type}_${errCode.toUpperCase()}`,
        message: definition.message,
        hints: definition.hint,
        userStackTrace: definition.userStackTrace,
        detail: definition.errorDetails
      });
      if (definition.stack) error.stack = definition.stack;
      return error;
    };
  }
  return res as any;
};

const errors = {
  e2({ container, resourceName }: { container: string; resourceName: string }): ReturnedError {
    return {
      type: 'CONFIG',
      message: `Container with name ${tuiManager.colorize(
        'cyan',
        container
      )} is not defined in the container compute resource ${tuiManager.prettyResourceName(resourceName)}.`
    };
  },
  e3({ region, stage }): ReturnedError {
    return {
      type: 'STACK',
      message: `Stack with stage ${tuiManager.colorize('cyan', stage)} is not deployed in region ${tuiManager.colorize(
        'cyan',
        region
      )}.`,
      hint: `To use local emulation (inject parameters, reuse IAM permissions), deploy your stack first.
If you want to disable local emulation, use the ${tuiManager.prettyOption('disableEmulation')} flag.`
    };
  },
  e5({ resourceName, resourceType }: { resourceName: string; resourceType: StpResourceType }): ReturnedError {
    return {
      type: 'NON_EXISTING_RESOURCE',
      message: `Resource ${tuiManager.prettyResourceName(resourceName)} is not defined in the configuration.`,
      hint: hintMessages.mustFullDeployResourceBeforeCommand({ resourceType })
    };
  },
  e6({
    resourceName,
    stackName,
    resourceType
  }: {
    resourceName: string;
    stackName: string;
    resourceType: StpResourceType;
  }): ReturnedError {
    return {
      type: 'NON_EXISTING_RESOURCE',
      message: sharedErrorMessages.resourceNotDeployed({ resourceName, stackName, resourceType }),
      hint: hintMessages.mustFullDeployResourceBeforeCommand({ resourceType })
    };
  },
  e14({ configPath }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `File ${tuiManager.prettyFilePath(configPath)} doesn't exist or is not accessible.`
    };
  },
  e17({ scriptName }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Script ${tuiManager.makeBold(scriptName)} is not defined in the 'scripts' section of the configuration.`
    };
  },
  e18({ absoluteScriptPath }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Script ${tuiManager.prettyFilePath(absoluteScriptPath)} doesn't exist or is not accessible.`
    };
  },
  e20({ scriptName }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Script ${tuiManager.makeBold(scriptName)} is not defined in the 'scripts' section of the configuration.`
    };
  },
  e22({
    stackName,
    region,
    moduleType,
    moduleMajorVersionDeployed,
    moduleMajorVersionUsedByStacktape
  }: {
    stackName: string;
    region: string;
    moduleType: StpCfInfrastructureModuleType;
    moduleMajorVersionDeployed: string;
    moduleMajorVersionUsedByStacktape: string;
  }): ReturnedError {
    return {
      type: 'EXISTING_STACK',
      message:
        `A stack named ${tuiManager.prettyStackName(stackName)} is already deployed in ${tuiManager.makeBold(
          region
        )} which uses ${moduleType} resources in major version "${tuiManager.colorize(
          'yellow',
          moduleMajorVersionDeployed
        )}".\n` +
        `This version of Stacktape uses major version "${tuiManager.colorize(
          'yellow',
          moduleMajorVersionUsedByStacktape
        )}". Updating stack might result in replacement of resources and data-loss.`
    };
  },
  // e29({ stpResourceName, referencedFrom, referencedFromType }): ReturnedError {
  //   return {
  //     type: 'CONFIG_VALIDATION',
  //     message: `Upstash kafka topic ${tuiManager.makeBold(stpResourceName)} referenced by ${
  //       referencedFromType || ''
  //     } ${tuiManager.makeBold(referencedFrom)} is not defined in this config.`
  //   };
  // },
  e30({
    stackName,
    organizationName,
    awsAccountName,
    command: _command
  }: {
    stackName: string;
    organizationName: string;
    awsAccountName: string;
    command: StacktapeCommand;
  }): ReturnedError {
    return {
      type: 'NON_EXISTING_STACK',
      message: `Cannot retrieve stack details for ${tuiManager.prettyStackName(stackName)}. Stack not found.`,
      hint: hintMessages.incorrectAwsAccount({ organizationName, awsAccountName })
    };
  },
  e31({ stackName }): ReturnedError {
    return {
      type: 'MISSING_OUTPUT',
      message: `Cannot retrieve stack overview for ${tuiManager.prettyStackName(
        stackName
      )}. Stack doesn't appear to be deployed with Stacktape.`,
      hint: ['If the stack was deployed using Stacktape, try re-deploying the stack.']
    };
  },
  e32({ stackName, stage, organizationName, awsAccountName }): ReturnedError {
    return {
      type: 'NON_EXISTING_STACK',
      message: `Stack ${tuiManager.prettyStackName(stackName)}${
        stage ? ` (stage ${tuiManager.colorize('cyan', stage)})` : ''
      } is not deployed.`,
      hint: hintMessages.incorrectAwsAccount({ organizationName, awsAccountName })
    };
  },
  e37({
    stpResourceName,
    referencedResourceType,
    referencedResourceStpName
  }: {
    stpResourceName: string;
    referencedResourceType: StpResourceType;
    referencedResourceStpName: string;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Resource ${tuiManager.prettyResourceName(
        stpResourceName
      )} of type edge-lambda-function cannot use ${tuiManager.prettyConfigProperty(
        'connectTo'
      )} with resource ${tuiManager.prettyResourceName(
        referencedResourceStpName
      )} of type ${tuiManager.prettyResourceType(referencedResourceType)}.`
    };
  },
  e38({ domainName }: { domainName: string }): ReturnedError {
    return {
      type: 'DOMAIN_MANAGEMENT',
      message: `Domain ${tuiManager.makeBold(domainName)} is not a valid domain name.`,
      hint: [
        `Enter a bare domain without a protocol, for example ${tuiManager.colorize(
          'blue',
          'example.com'
        )} or ${tuiManager.colorize('blue', 'api.internal.example.com')}.`,
        `Manage and verify your domains in Stacktape Console: ${STACKTAPE_DOMAINS_CONSOLE_URL}`
      ]
    };
  },
  e39({
    fullDomainName,
    // attachingTo,
    region
  }: {
    fullDomainName: string;
    attachingTo: StpDomainAttachableResourceType;
    region: string;
  }): ReturnedError {
    return {
      type: 'DOMAIN_MANAGEMENT',
      message: `No suitable TLS certificate found for domain ${tuiManager.makeBold(
        fullDomainName
      )} in region ${region}.`,
      hint: [
        `If you want Stacktape to manage DNS and certificates, configure and verify the domain in Stacktape Console: ${STACKTAPE_DOMAINS_CONSOLE_URL}`,
        `If you manage certificates yourself, use ${tuiManager.prettyConfigProperty(
          'customCertificateArn'
        )} (or ${tuiManager.prettyConfigProperty('customCertificateArns')} on load balancer listeners).`,
        `Docs: ${DOMAINS_DOCS_URL}`
      ].join('\n')
    };
  },
  e40({ fullDomainName, certificateStatus }: { fullDomainName: string; certificateStatus: string }): ReturnedError {
    return {
      type: 'DOMAIN_MANAGEMENT',
      message: `Certificate for domain ${tuiManager.makeBold(
        fullDomainName
      )} is not validated yet. Current status: ${certificateStatus}.`,
      hint: [
        `Open Stacktape Console to check domain and certificate validation status: ${STACKTAPE_DOMAINS_CONSOLE_URL}`,
        'If you added the domain recently, validation can take a few minutes.'
      ]
    };
  },
  e48({ domainName }: { domainName: string }): ReturnedError {
    return {
      type: 'DOMAIN_MANAGEMENT',
      message: `Cannot use domain ${tuiManager.makeBold(domainName)}. The domain ${tuiManager.makeBold(
        getApexDomain(domainName)
      )} is not registered.`,
      hint: hintMessages.buyDomainHint()
    };
  },
  e49({ domainName, desiredNameServers }: { domainName: string; desiredNameServers?: string[] }): ReturnedError {
    return {
      type: 'DOMAIN_MANAGEMENT',
      message: `Cannot use domain ${tuiManager.makeBold(domainName)}. DNS records of the domain ${tuiManager.makeBold(
        getApexDomain(domainName)
      )} are not delegated to the hosted zone in your AWS account.`,
      hint: [
        `Manage domain setup in Stacktape Console: ${STACKTAPE_DOMAINS_CONSOLE_URL}`,
        desiredNameServers
          ? `At your registrar, update name servers to:\n${tuiManager.colorize(
              'cyan',
              desiredNameServers.map((ns) => `- ${ns}`).join('\n')
            )}`
          : 'At your registrar, update name servers to the values shown in the Stacktape Console.',
        `Docs: ${DOMAINS_DOCS_URL}#adding-domain`
      ]
    };
  },
  e53({ availableContainers }: { availableContainers: string[] }): ReturnedError {
    return {
      type: 'CLI',
      message: `You must specify a container to run using the ${tuiManager.prettyOption(
        'container'
      )} option.\nAvailable containers: ${availableContainers.map(tuiManager.makeBold).join(', ')}`
    };
  },
  e55({ invalidEmail }: { invalidEmail: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error: Invalid email address ${tuiManager.makeBold(invalidEmail)}.`
    };
  },
  e56({ email, region }: { email: string; region: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error: Cannot use email address ${tuiManager.makeBold(
        email
      )} for sending notification. The email is not verified for using within your AWS account.`,
      hint: hintMessages.awsSesEmailVerification({ region })
    };
  },
  e57({ email, region }: { email: string; region: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error: This account's email service (AWS SES) is in the sandbox which means emails(notifications) can only be send to verified emails. Email ${tuiManager.makeBold(
        email
      )} is not verified for using within your AWS account.`,
      hint: hintMessages
        .awsSesEmailVerification({ region })
        .concat([
          'To learn more about "sandbox" limitations and moving out of it, refer to AWS docs: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html'
        ])
    };
  },
  e58({ alarmName, stpResourceName }: { alarmName: string; stpResourceName: string }): ReturnedError {
    const alarmType: AlarmDefinition['trigger']['type'] = 'database-free-storage';
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error: Alarm ${tuiManager.makeBold(
        alarmName
      )} with trigger of type ${alarmType} cannot be used with ${tuiManager.makeBold(
        stpResourceName
      )}, which uses aurora engine. Storage size for aurora databases is automatically scaled based on the demand.`
    };
  },
  e59({ alarmName, stpResourceName }: { alarmName: string; stpResourceName: string }): ReturnedError {
    const alarmType: AlarmDefinition['trigger']['type'] = 'database-free-memory';
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error: Alarm ${tuiManager.makeBold(
        alarmName
      )} with trigger of type ${alarmType} cannot be used with ${tuiManager.makeBold(
        stpResourceName
      )}, which uses aurora serverless engine. Memory for aurora serverless databases is automatically scaled based on the demand.`
    };
  },
  e62({ stpContainerWorkloadName }: { stpContainerWorkloadName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in multi-container-workload ${tuiManager.makeBold(
        stpContainerWorkloadName
      )}: You need to specify ${tuiManager.makeBold('testListenerPort')} when using ${tuiManager.makeBold(
        'beforeAllowTrafficFunction'
      )} and load balancer with custom listeners`
    };
  },
  e64({
    stackName,
    projectName,
    invocationId,
    buildId,
    stage
  }: {
    stackName: string;
    projectName: string;
    invocationId: string;
    buildId: string;
    stage: string;
  }): ReturnedError {
    return {
      type: 'CODEBUILD',
      message: `Deployment of stack ${tuiManager.makeBold(
        stackName
      )} through codebuild failed (buildId: ${buildId}). Inspect logs for further information.`,
      hint: `Deployment logs: https://console.stacktape.com/projects/${projectName}/${stage}/deployment-detail/${invocationId}?tab=logs`
    };
  },
  e65({
    accountName,
    organizationName,
    connectedAwsAccounts
  }: {
    accountName: string;
    organizationName: string;
    connectedAwsAccounts: GlobalStateConnectedAwsAccount[];
  }): ReturnedError {
    return {
      type: 'AWS_ACCOUNT',
      message: `There is no AWS account named ${tuiManager.makeBold(
        accountName
      )} connected to your organization ${tuiManager.makeBold(organizationName)}.`,
      hint: [
        `Available AWS accounts: ${
          connectedAwsAccounts?.map(({ name }) => tuiManager.makeBold(name)).join(', ') || 'none'
        }`
      ]
    };
  },
  e66({ organizationName }: { organizationName: string }): ReturnedError {
    return {
      type: 'AWS_ACCOUNT',
      message: `There is no AWS account connected to your organization ${tuiManager.makeBold(organizationName)}.`,
      hint: [
        `You can connect AWS account to your Stacktape organization in ${tuiManager.getLink(
          'connectedAwsAccounts',
          'console'
        )}`
      ]
    };
  },
  e67({
    organizationName,
    connectedAwsAccounts
  }: {
    organizationName: string;
    connectedAwsAccounts: GlobalStateConnectedAwsAccount[];
  }): ReturnedError {
    return {
      type: 'AWS_ACCOUNT',
      message: `There is more than one AWS account connected to your organization ${tuiManager.makeBold(
        organizationName
      )}. Please specify which account you wish to use by using option ${tuiManager.prettyOption('awsAccount')}`,
      hint: [`Available AWS accounts: ${connectedAwsAccounts.map(({ name }) => tuiManager.makeBold(name)).join(', ')}`]
    };
  },
  e84({
    sqsQueueReferencerStpName,
    sqsQueueReferencerStpType
  }: {
    sqsQueueReferencerStpName: string;
    sqsQueueReferencerStpType: StpResourceType;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType(sqsQueueReferencerStpType)} ${tuiManager.prettyResourceName(
        sqsQueueReferencerStpName
      )}. When referencing sqs queue you must specify exactly one of ${tuiManager.prettyConfigProperty(
        'sqsQueueName'
      )} or ${tuiManager.prettyConfigProperty('sqsQueueArn')} properties.`
    };
  },
  e85({
    snsTopicReferencerStpName,
    snsTopicReferencerStpType
  }: {
    snsTopicReferencerStpName: string;
    snsTopicReferencerStpType: StpResourceType;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType(snsTopicReferencerStpType)} ${tuiManager.prettyResourceName(
        snsTopicReferencerStpName
      )}. When referencing sns topic you must specify exactly one of ${tuiManager.prettyConfigProperty(
        'snsTopicName'
      )} or ${tuiManager.prettyConfigProperty('snsTopicArn')} properties.`
    };
  },
  e86({
    snsTopicReferencerStpName,
    snsTopicReferencerStpType,
    snsTopicStpName
  }: {
    snsTopicReferencerStpName: string;
    snsTopicReferencerStpType: StpResourceType;
    snsTopicStpName: string;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType(snsTopicReferencerStpType)} ${tuiManager.prettyResourceName(
        snsTopicReferencerStpName
      )}. You cannot reference ${tuiManager.prettyResourceType('sns-topic')} ${tuiManager.prettyResourceName(
        snsTopicStpName
      )} in the event, because it has fifo enabled.`
    };
  },
  e88({ domainName }: { domainName: string }): ReturnedError {
    return {
      type: 'DOMAIN_MANAGEMENT',
      message: `Cannot use domain name ${tuiManager.makeBold(domainName)}. DNS records for ${tuiManager.makeBold(
        getApexDomain(domainName)
      )} are not delegated to your AWS account, or the domain is not configured in Stacktape yet.`,
      hint: [
        `If you want Stacktape to manage DNS and certificates, configure and verify the domain in Stacktape Console: ${STACKTAPE_DOMAINS_CONSOLE_URL}`,
        `If you manage DNS yourself, set ${tuiManager.prettyConfigProperty(
          'disableDnsRecordCreation'
        )} to ${tuiManager.makeBold('true')} and specify ${tuiManager.prettyConfigProperty('customCertificateArn')}.`,
        `Docs: ${DOMAINS_DOCS_URL}`
      ].join('\n')
    };
  },
  e96({ err }: { err: Error }): ReturnedError {
    return {
      type: 'SCRIPT',
      message: `Error when starting bastion tunnel session.\n${err}`
    };
  },
  e97(_arg: null): ReturnedError {
    return {
      type: 'NON_EXISTING_RESOURCE',
      message: `Cannot perform operation, because no resource of type ${tuiManager.prettyResourceType(
        'bastion'
      )} was found in your stack.`,
      hint: ['See Stacktape docs on how to add and use bastion: https://docs.stacktape.com/resources/bastion-servers/']
    };
  },
  e98({ stpResourceName }: { stpResourceName: string }): ReturnedError {
    return {
      type: 'NON_EXISTING_RESOURCE',
      message: `No resource with name ${tuiManager.prettyResourceName(stpResourceName)} was found in your stack.`,
      hint: ['See Stacktape docs on how to add and use bastion: https://docs.stacktape.com/resources/bastion-servers/']
    };
  },
  e99({
    stpResourceName,
    stpResourceType
  }: {
    stpResourceName: string;
    stpResourceType: StpResourceType;
  }): ReturnedError {
    return {
      type: 'UNSUPPORTED_RESOURCE',
      message: `Resource with name ${tuiManager.prettyResourceName(
        stpResourceName
      )} if of type ${tuiManager.prettyResourceType(
        stpResourceType
      )}. This resource type is not supported for bastion tunneling.`,
      hint: [
        `Supported resource types are: ${(
          [
            'relational-database',
            'redis-cluster',
            'application-load-balancer',
            'private-service (with loadBalancing type application-load-balancer)'
          ] as StpResourceType[]
        )
          .map(tuiManager.prettyResourceType)
          .join(', ')} `
      ]
    };
  },
  e100({
    command,
    stackName,
    stackStatus
  }: {
    command: Subtype<
      StacktapeCommand,
      'deploy' | 'delete' | 'dev' | 'rollback' | 'cf:rollback' | 'deployment-script:run'
    >;
    stackName: string;
    stackStatus: StackStatus;
  }): ReturnedError {
    return {
      type: 'EXISTING_STACK',
      message: `Cannot perform operation ${tuiManager.prettyCommand(command)} on stack ${tuiManager.prettyStackName(
        stackName
      )} because it is currently in state ${tuiManager.colorize('red', stackStatus)}`,
      hint: [
        `To perform ${tuiManager.prettyCommand(
          command
        )} operation, stack must be in one of the following states: ${(command === 'cf:rollback'
          ? STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS
          : STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS
        )
          .map((status) => `${tuiManager.colorize('blue', status)}`)
          .join(', ')}`
      ]
        .concat(
          stackStatus === StackStatus.DELETE_FAILED
            ? [`Delete the stack fully using ${tuiManager.prettyCommand('delete')} command, then recreate it.`]
            : []
        )
        .concat(
          STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS.includes(stackStatus as any)
            ? [
                `To rollback your stack to previously working state, try using ${tuiManager.prettyCommand(
                  'cf:rollback'
                )} command.`
              ]
            : []
        )
    };
  },
  e103(_arg: null): ReturnedError {
    return {
      type: 'INPUT',
      message: `Invalid arguments. Please specify ${tuiManager.prettyOption('projectName')} option.`
    };
  },
  e108({ reason, command }: { reason?: string; command: StacktapeCommand }) {
    return {
      type: 'CONFIRMATION_REQUIRED',
      message: `Operation ${tuiManager.prettyCommand(command)} requires confirmation.${reason ? `Reason:\n${reason}` : ''} `,
      hint: `To automatically provide confirmation use auto-confirm option (${tuiManager.prettyOption('autoConfirmOperation')}) during this operation.`
    };
  },
  e110({
    databaseStpResourceName,
    currentDatabaseVersion,
    availableVersions
  }: {
    databaseStpResourceName: string;
    currentDatabaseVersion?: string;
    availableVersions: string[];
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('relational-database')} ${tuiManager.prettyResourceName(
        databaseStpResourceName
      )}. You must specify engine ${tuiManager.prettyConfigProperty('version')} in engine properties.${currentDatabaseVersion ? `Currently, your database uses version ${tuiManager.colorize('gray', currentDatabaseVersion)}.\nOther available versions are:` : '\nAvailable versions are:'} ${availableVersions
        .sort((v1, v2) => v2.localeCompare(v1))
        .map((version) => tuiManager.colorize('gray', version))
        .join(', ')}`
    };
  },
  e111({
    databaseStpResourceName,
    chosenDatabaseVersion,
    availableVersions
  }: {
    databaseStpResourceName: string;
    chosenDatabaseVersion: string;
    availableVersions: string[];
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('relational-database')} ${tuiManager.prettyResourceName(
        databaseStpResourceName
      )}. Specified engine ${tuiManager.prettyConfigProperty('version')} ${tuiManager.makeBold(chosenDatabaseVersion)} is not a valid available version for this engine.\n Available versions are: ${availableVersions
        .sort((v1, v2) => v2.localeCompare(v1))
        .map((version) => tuiManager.colorize('gray', version))
        .join(', ')}`
    };
  },
  e113({ providerType }: { providerType: 'Upstash' | 'Atlas Mongo' }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: [
        `Error in the config. When using third-party resources from ${tuiManager.makeBold(providerType)} you must provide credentials for the ${tuiManager.makeBold(providerType)} provider in one of these ways:`,
        `  1. Create credentials for 3rd party integration in the stacktape console ${tuiManager.getLink('console', 'here')}`,
        `  2. Specify credentials in the ${tuiManager.prettyConfigProperty('providerConfig')} section in your stacktape config file.`
      ].join('\n')
    };
  },
  e114({
    instanceType,
    originalResourceType,
    stpResourceName,
    requestedMemory,
    availableMemory
  }: {
    instanceType: string;
    originalResourceType: StpResourceType;
    stpResourceName: string;
    requestedMemory: number;
    availableMemory: number;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: [
        `Error in the ${tuiManager.prettyResourceType(originalResourceType)} resource ${tuiManager.prettyResourceName(stpResourceName)}:`,
        `Chosen instance ${tuiManager.makeBold(instanceType)} does not have enough memory to run workload with ${tuiManager.makeBold(requestedMemory)} MB of memory. Available memory for this instance is ${tuiManager.makeBold(availableMemory)} (accounting for OS and background processes).`
      ].join('\n')
    };
  },
  e122({
    stpResourceName,
    stpResourceType
  }: {
    stpResourceName: string;
    stpResourceType: StpResourceType;
  }): ReturnedError {
    const supportedResourceTypes: StpResourceType[] = [
      'function',
      'batch-job',
      'worker-service',
      'web-service',
      'private-service',
      'multi-container-workload',
      'nextjs-web'
    ];
    return {
      type: 'UNSUPPORTED_RESOURCE',
      message: `Cannot retrieve execution role for resource ${tuiManager.prettyResourceName(stpResourceName)} of type ${tuiManager.prettyResourceType(stpResourceType)}.`,
      hint: `Supported resource types are: ${supportedResourceTypes.map((type) => tuiManager.prettyResourceType(type)).join(', ')}.`
    };
  },
  e127({ stpLoadBalancerName }: { stpLoadBalancerName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `No valid target container services found for load balancer ${tuiManager.prettyResourceName(stpLoadBalancerName)}. Cannot create unhealthy targets alarm.`
    };
  },
  e130({ port }: { port: string | number }): ReturnedError {
    return {
      type: 'INPUT',
      message: `Unable to use local port ${tuiManager.makeBold(String(port))} for tunneling because it is already in use.`,
      hint: `If you do not specify ${tuiManager.prettyOption('localTunnelingPort')} option, Stacktape will automatically find a free port.`
    };
  },
  e501({ operation }: { operation: string }): ReturnedError {
    return {
      type: 'API_KEY',
      message: `Operation "${operation}" requires a Stacktape API key configured on your system.`,
      hint: `You can get your API key in the ${tuiManager.getLink('apiKeys', 'console')}.`
    };
  },
  e502({ message }: { message: string }): ReturnedError {
    return {
      type: 'SUBSCRIPTION_REQUIRED',
      message,
      hint: `You can upgrade your subscription plan in the ${tuiManager.getLink('subscription', 'console')}.`
    };
  },
  e503({ message }: { message: string }): ReturnedError {
    return {
      type: 'API_SERVER',
      message,
      hint: `You can get your API key in the ${tuiManager.getLink('apiKeys', 'console')}.`
    };
  },
  e506({ projectId }: { projectId: string }): ReturnedError {
    return {
      type: 'CLI',
      message: `Starter project ${projectId} does not exist.`
    };
  },
  e509({ templateId }: { templateId: string }): ReturnedError {
    return {
      type: 'INPUT',
      message: `Can't find template with ID ${templateId}.`
    };
  },
  e1005({ firewallName }: { firewallName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('web-app-firewall')} ${tuiManager.prettyResourceName(
        firewallName
      )}: Firewall ${tuiManager.prettyConfigProperty(
        'scope'
      )} can't be changed after the firewall is created. Delete the existing firewall and create a new one with ${tuiManager.prettyConfigProperty(
        'scope'
      )}.`
    };
  },
  e1006({ domainName }: { domainName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('open-search-domain')} ${tuiManager.prettyResourceName(
        domainName
      )}: Properties ${tuiManager.prettyConfigProperty('storage.iops')} and ${tuiManager.prettyConfigProperty(
        'storage.throughput'
      )} can be used only with instances supporting EBS gp3 storage.`
    };
  },
  e1007({ domainName }: { domainName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('open-search-domain')} ${tuiManager.prettyResourceName(
        domainName
      )}: Property ${tuiManager.prettyConfigProperty(
        'storage'
      )} can be used only with instances that support EBS (not with the instances that have dedicated storage space).`
    };
  },
  e141({ stackName, stage }: { stackName: string; stage: string }): ReturnedError {
    return {
      type: 'CLI',
      message: `Stack ${tuiManager.colorize('cyan', stackName)} is a dev stack and cannot be deployed using ${tuiManager.prettyCommand('deploy')}.`,
      hint: `Dev stacks are created and managed by ${tuiManager.prettyCommand('dev')}. To deploy a production stack, use a different stage name (e.g., --stage production).
If you want to delete the dev stack, run: ${tuiManager.prettyCommand(`delete --stage ${stage}`)}`
    };
  },
  e999({ message, hint }: { message: string; hint: string }): ReturnedError {
    return {
      type: 'STACK',
      message,
      hint
    };
  }
} as const;

export const stpErrors = wrap(errors);

const sharedErrorMessages = {
  resourceNotDeployed({
    resourceName,
    stackName,
    resourceType
  }: {
    resourceName: string;
    stackName: string;
    resourceType?: StpResourceType;
  }) {
    return `Resource ${tuiManager.prettyResourceName(resourceName)}${
      resourceType ? ` of type ${tuiManager.prettyResourceType(resourceType)} ` : ' '
    }is not deployed as part of stack ${tuiManager.prettyStackName(stackName)}.`;
  }
};

export const hintMessages = {
  awsSesEmailVerification({ region }: { region: string }): string[] {
    return [
      `You can verify your email (or entire domain) using the AWS console: ${consoleLinks.createSesIdentity(region)}`
    ];
  },
  mustFullDeployResourceBeforeCommand({ resourceType }: { resourceType: StpResourceType }): string[] {
    return [
      `If you are creating a new ${tuiManager.prettyResourceType(
        resourceType
      )}, deploy it with the full stack using ${tuiManager.prettyCommand('deploy')}.`
    ];
  },
  configPathHint(): string[] {
    return [`You can specify the config file with ${tuiManager.prettyOption('configPath')}.`];
  },
  incorrectAwsAccount({
    organizationName,
    awsAccountName
  }: {
    organizationName: string;
    awsAccountName: string;
  }): string[] {
    return [
      `Are you sure you are using correct Stacktape organization and AWS account? Current organization: ${tuiManager.makeBold(
        organizationName
      )} and AWS account ${tuiManager.makeBold(awsAccountName)}.`,
      `You can check which AWS accounts are connected to your organization in ${tuiManager.getLink(
        'connectedAwsAccounts',
        'console'
      )}`
    ];
  },
  weakCredentials({ credentials, profile }: { credentials: ValidatedAwsCredentials; profile: string }): string[] {
    return [
      `Credentials might not have enough permissions to perform operation. Credentials were retrieved via ${tuiManager.makeBold(
        credentials.source
      )}${
        credentials.source === 'credentialsFile' ? ` - profile "${profile}"` : ''
      } and belong to entity ${tuiManager.makeBold(credentials.identity.arn)}`
    ];
  },
  buyDomainHint(): string[] {
    return [
      `If you do not own a domain, you can register/buy a domain in the AWS console: https://us-east-1.console.aws.amazon.com/route53/home#DomainRegistration:
Prices of domains start at $3/year for ${tuiManager.colorize('gray', '.click')} domains.
After purchase, configure and verify the domain in Stacktape Console: ${STACKTAPE_DOMAINS_CONSOLE_URL}`
    ];
  }
};

type ReturnedError = {
  type: ErrorCategory;
  message: string;
  hint?: string | string[];
  stack?: string;
  userStackTrace?: string;
  errorDetails?: { title: string; codeFrame?: string };
};

export type ErrorCode = keyof typeof errors;
