import { StackStatus } from '@aws-sdk/client-cloudformation';
import { VALID_CONFIG_PATHS } from '@config';
import {
  STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS,
  STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS
} from '@shared/aws/cloudformation';
import { consoleLinks } from '@shared/naming/console-links';
import { getError } from '@shared/utils/misc';
import { getApexDomain } from '@utils/domains';
import { printer } from '@utils/printer';

const wrap = (
  errorsObj: typeof errors
): {
  [errorCode in ErrorCode]: (arg: ArgType<(typeof errors)[errorCode]>) => StacktapeError;
} => {
  const res = {};
  for (const errCode in errorsObj) {
    res[errCode] = (props) => {
      return getError({ ...errorsObj[errCode](props), code: errCode });
    };
  }
  return res as any;
};

const errors = {
  e1({ resourceName }: { resourceName: string }): ReturnedError {
    return {
      type: 'NON_EXISTING_RESOURCE',
      message: `Resource ${printer.colorize('cyan', resourceName)} is not defined in the configuration.`
    };
  },
  e2({ container, resourceName }: { container: string; resourceName: string }): ReturnedError {
    return {
      type: 'CONFIG',
      message: `Container with name ${printer.colorize(
        'cyan',
        container
      )} is not defined in the container compute resource ${printer.colorize('cyan', resourceName)}.`
    };
  },
  e3({ region, stage }): ReturnedError {
    return {
      type: 'STACK',
      message: `Stack with stage ${printer.colorize('cyan', stage)} is not deployed in the region ${printer.colorize(
        'cyan',
        region
      )}.`,
      hint: `To use the local emulation (inject parameters, use the same IAM permission), you first need to deploy your stack.
If you want to disable local emulation, use the ${printer.prettyOption('disableEmulation')} flag.`
    };
  },
  e4(_arg: null): ReturnedError {
    return {
      type: 'BUDGET',
      message: 'Using budget control is currently not enabled for your AWS account.',
      hint: [
        `To enable budget control for stacks in your account, please complete the tutorial at ${printer.colorize(
          'yellow',
          'https://docs.stacktape.com/user-guides/enabling-budgeting'
        )}.`,
        'If you have already completed the tutorial, it might take up to 24 hours for budgeting to become available for your account.'
      ]
    };
  },
  e5({ resourceName, resourceType }: { resourceName: string; resourceType: StpResourceType }): ReturnedError {
    return {
      type: 'NON_EXISTING_RESOURCE',
      message: `Resource ${printer.colorize('cyan', resourceName)} is not defined in the configuration.`,
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
  e8(): ReturnedError {
    return {
      type: 'NOT_YET_IMPLEMENTED',
      message: 'This command is not yet implemented'
    };
  },
  e10({ functionName }: { functionName: string }): ReturnedError {
    return {
      type: 'CONFIG',
      message: `Lambda function ${printer.prettyResourceName(functionName)} must have ${printer.prettyConfigProperty(
        'handler'
      )} property specified when using custom-artifact packaging type.`
    };
  },
  e11({ functionName }: { functionName: string }): ReturnedError {
    return {
      type: 'CONFIG',
      message: `Lambda function ${printer.colorize(
        'cyan',
        functionName
      )} must have 'runtime' specified when using custom-artifact packaging type.`
    };
  },
  e12(): ReturnedError {
    return {
      type: 'CLI',
      message: 'Wrong options supplied.',
      hint: [
        `When syncing using stacktape configuration, you must supply both ${printer.makeBold(
          'stage'
        )} and ${printer.makeBold(
          'resourceName'
        )}. Bucket id is then determined from the deployed stack and directory to sync from stacktape configuration file.`,
        `When syncing using bucket id, you must specify a valid ${printer.makeBold(
          'bucketId'
        )} (AWS physical resource id, or "name" of the bucket) and ${printer.makeBold(
          'sourcePath'
        )}. Specified directory is then synced to the specified bucket. If the bucket is deployed using Stacktape, you can get bucketId using ${printer.prettyCommand(
          'stack:info'
        )} command.`
      ]
    };
  },
  e13({ directoryPath }): ReturnedError {
    return {
      type: 'CLI',
      message: `Specified directory at ${directoryPath} is not accessible or not a directory`
    };
  },
  e14({ configPath }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `The file at '${configPath}' doesn't exist or is not accessible.`
    };
  },
  e15({ matchingConfigPaths }: { matchingConfigPaths: string[] }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Found multiple matching config files: ${matchingConfigPaths.join(', ')}. You need to supply only one.`,
      hint: hintMessages.configPathHint()
    };
  },
  e16(): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: [
        'This command requires a stacktape template(config). You can provide it in following ways:',
        ` - stacktape automatically detects template file with names ${VALID_CONFIG_PATHS.map(printer.makeBold).join(', ')} in the root of your project.`,
        ` - specify path to your stacktape template file using ${printer.prettyOption('configPath')},`,
        ` - specify id of template created in console using ${printer.prettyOption('templateId')}.`
      ].join('\n'),
      hint: [
        // ...hintMessages.configPathHint(),
        `Either manually create your stacktape configuration, or use ${printer.prettyCommand(
          'init'
        )}.\nThe init command allows you to bootstrap Stacktape config for your current project or select one of 25+ pre-made starter projects.`
      ]
    };
  },
  e17({ scriptName }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Script ${printer.makeBold(scriptName)} is not defined in the 'scripts' section of the configuration.`
    };
  },
  e18({ absoluteScriptPath }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Script at ${printer.prettyFilePath(absoluteScriptPath)} doesn't exists or is not accessible.`
    };
  },
  e19({ directoryPath }): ReturnedError {
    return {
      type: 'SYNC_BUCKET',
      message: `Directory at ${printer.prettyFilePath(directoryPath)} doesn't exists or is not accessible.`
    };
  },
  e20({ scriptName }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Script ${printer.makeBold(scriptName)} is not defined in the 'scripts' section of the configuration.`
    };
  },
  e21(_arg: null): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `You need to specify ${printer.makeBold('upstash')} provider in ${printer.makeBold(
        'providerConfig'
      )} section of you config when using ${printer.colorize('cyan', 'upstash')} resources.`
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
        `There is already a stack with name ${printer.makeBold(stackName)} deployed in ${printer.makeBold(
          region
        )} which uses ${moduleType} resources in major version "${printer.colorize(
          'yellow',
          moduleMajorVersionDeployed
        )}".\n` +
        `This version of stacktape uses major version "${printer.colorize(
          'yellow',
          moduleMajorVersionUsedByStacktape
        )}". Updating stack might result in replacement of resources and data-loss.`
    };
  },
  e23({ stpResourceName, stackName }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Upstash redis database ${printer.makeBold(
        stpResourceName
      )} is already deployed in stack ${printer.makeBold(
        stackName
      )} with TLS enabled.\nYou cannot disable TLS once it was enabled.`
    };
  },
  e24({ stpResourceName, stackName }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Upstash redis database ${printer.makeBold(
        stpResourceName
      )} is already deployed in stack ${printer.makeBold(
        stackName
      )} with multi-zone replication enabled.\nYou cannot disable multi-zone replication once it was enabled.`
    };
  },
  e25({ stpResourceName }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Strong consistency for Upstash redis database ${printer.makeBold(
        stpResourceName
      )} can only be set during initial database creation.\nStrong consistency cannot be enabled/disabled during updates.`
    };
  },
  e26({ stpResourceName, stackName, currentNumberOfPartitions }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Upstash kafka topic ${printer.makeBold(
        stpResourceName
      )} is already deployed in stack ${printer.makeBold(stackName)} with ${printer.makeBold(
        currentNumberOfPartitions
      )} partitions.\nYou cannot update number of partitions of the topic.`
    };
  },
  e27({ stpResourceName, stackName, currentClusterId }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Upstash kafka topic ${printer.makeBold(
        stpResourceName
      )} is already deployed in stack ${printer.makeBold(stackName)} in cluster with ID ${printer.makeBold(
        currentClusterId
      )}.\nYou cannot change cluster after topic is created.`
    };
  },
  e28({ stpResourceName, stackName, currentCleanupPolicy }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Upstash kafka topic ${printer.makeBold(
        stpResourceName
      )} is already deployed in stack ${printer.makeBold(stackName)} with cleanup policy set to ${printer.makeBold(
        currentCleanupPolicy
      )}.\nYou cannot change cleanup policy after topic is created.`
    };
  },
  // e29({ stpResourceName, referencedFrom, referencedFromType }): ReturnedError {
  //   return {
  //     type: 'CONFIG_VALIDATION',
  //     message: `Upstash kafka topic ${printer.makeBold(stpResourceName)} referenced by ${
  //       referencedFromType || ''
  //     } ${printer.makeBold(referencedFrom)} is not defined in this config.`
  //   };
  // },
  e30({
    stackName,
    organizationName,
    awsAccountName,
    command
  }: {
    stackName: string;
    organizationName: string;
    awsAccountName: string;
    command: StacktapeCommand;
  }): ReturnedError {
    return {
      type: 'NON_EXISTING_STACK',
      message: `Cannot retrieve stack detail of stack with name "${printer.makeBold(
        stackName
      )}". Stack does not exist.`,
      hint: [
        ...hintMessages.incorrectAwsAccount({ organizationName, awsAccountName }),
        ...(command === 'stack:info'
          ? [
              `When using ${printer.prettyCommand(
                command
              )} command for non-deployed stack, provide config and use the ${printer.prettyOption(
                'detailed'
              )} option to get overview of which resources will be created.`
            ]
          : [])
      ]
    };
  },
  e31({ stackName }): ReturnedError {
    return {
      type: 'MISSING_OUTPUT',
      message: `Cannot retrieve stack overview map of stack "${printer.makeBold(
        stackName
      )}". Stack does not seem to be deployed using Stacktape.`,
      hint: ['If the stack was deployed using Stacktape, try re-deploying the stack.']
    };
  },
  e32({ stackName, stage, organizationName, awsAccountName }): ReturnedError {
    return {
      type: 'NON_EXISTING_STACK',
      message: `Stack ${printer.makeBold(stackName)}${stage ? ` (stage ${stage})` : ''} is not deployed.`,
      hint: hintMessages.incorrectAwsAccount({ organizationName, awsAccountName })
    };
  },
  e33({ region }: { region: string }): ReturnedError {
    return {
      type: 'BUDGET',
      message: `Using budget control is not currently supported for this region (${printer.makeBold(region)}).`
    };
  },
  e34(_arg: null): ReturnedError {
    return {
      type: 'MISSING_PREREQUISITE',
      message:
        'To use this starter project, you must have Node.js and a javascript package manager installed (either yarn, npm or pnpm).'
    };
  },
  e35({ err }): ReturnedError {
    return {
      type: 'CLI',
      message: `Failed to install dependencies. Error\n:${err}`
    };
  },
  e36({
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
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Referenced resource with name ${printer.prettyResourceName(stpResourceName)}${
        stpResourceType ? ` of type ${printer.prettyResourceType(stpResourceType as StpResourceType)}` : ''
      } could not be resolved in the config (referenced from ${printer.prettyResourceName(referencedFrom)}${
        referencedFromType ? `(${printer.prettyResourceType(referencedFromType as StpResourceType)})` : ''
      }).`,
      hint:
        validResourcePath && invalidRestResourcePath
          ? [
              `Resource ${printer.prettyResourceName(validResourcePath)} does not contain nested resource "${
                invalidRestResourcePath.split('.')[0]
              }"`
            ].concat(
              possibleNestedResources.length
                ? `Possible nested resources: ${possibleNestedResources.map(printer.prettyResourceName).join(', ')}`
                : []
            )
          : incorrectResourceType
            ? `Referenced resource does not have the correct type (${printer.prettyResourceType(
                stpResourceType as StpResourceType
              )})`
            : undefined
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
      message: `Resource ${printer.makeBold(
        stpResourceName
      )} of type edge-lambda-function cannot use "connectTo" with resource ${printer.makeBold(
        referencedResourceStpName
      )} of type ${referencedResourceType}.`
    };
  },
  e38({ domainName }: { domainName: string }): ReturnedError {
    return {
      type: 'DOMAIN_MANAGEMENT',
      message: `Domain ${printer.makeBold(domainName)} is not a valid root domain name`,
      hint: `When using ${printer.prettyCommand(
        'domain:add'
      )} command, enter the apex(root) domain, i.e ${printer.colorize('blue', 'example.com')} or ${printer.colorize(
        'blue',
        'mydomain.net'
      )}. After domain is added, you can also use its subdomains (such as my-subdomain.example.com).`
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
      message: `Could not find suitable TLS certificate for domain ${printer.makeBold(fullDomainName)} in the region ${region}.\n`,
      hint: [
        'Depending on your goal:',
        `1. If you want Stacktape to be able to manage your domain names (DNS) and TLS certificates, run command ${printer.prettyCommand('domain:add')} to see next steps.`,
        `2. If you wish to use a custom certificate specify ${printer.prettyConfigProperty('customCertificateArn')}`,
        'Refer to Stacktape docs for more information: https://docs.stacktape.com/other-resources/domains-and-certificates/'
      ].join('\n')
    };
  },
  e40({ fullDomainName, certificateStatus }: { fullDomainName: string; certificateStatus: string }): ReturnedError {
    return {
      type: 'DOMAIN_MANAGEMENT',
      message: `Certificate for domain ${printer.makeBold(
        fullDomainName
      )} is not yet validated. Current certificate status is ${certificateStatus}`,
      hint: [
        `Run command ${printer.prettyCommand('domain:add')} to refresh certificate status and see next steps.`,
        'If you added domain only recently it can take a few minutes before certificates are validated.'
      ]
    };
  },
  e41({
    fullDomainName,
    region,
    attachingTo
  }: {
    fullDomainName: string;
    region: string;
    attachingTo: StpDomainAttachableResourceType;
  }): ReturnedError {
    const domainLevelSplit = fullDomainName.split('.');
    return {
      type: 'DOMAIN_MANAGEMENT',
      message: `Cannot use domain ${printer.makeBold(
        fullDomainName
      )} with automatically generated Stacktape certificate.\nCurrently, the automatically generated certificate for the domain ${printer.makeBold(
        getApexDomain(fullDomainName)
      )} does not support more than one level of subdomain.`,
      hint: [
        `Until we resolve this limitation, you can manually create your certificate here: ${printer.colorize(
          'blue',
          consoleLinks.createCertificateUrl(attachingTo, region)
        )} and reference it using ${printer.colorize('blue', 'customCertificateArn')} property`,
        `You can try using alternative domain name such as ${printer.colorize(
          'blue',
          [domainLevelSplit.slice(0, -2).join('-'), domainLevelSplit.slice(-2).join('.')].join('.')
        )}`
      ]
    };
  },
  e42({ stpLoadBalancerName }: { stpLoadBalancerName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in application-load-balancer ${printer.makeBold(
        stpLoadBalancerName
      )}.\nYou cannot use property ${printer.makeBold('listeners')} in combination with property ${printer.makeBold(
        'useHttps'
      )}`,
      hint: [
        `Property ${printer.makeBold(
          'useHttps'
        )} only takes effect if you do NOT specify listeners and default listeners are used.`
      ]
    };
  },
  e43({ stpLoadBalancerName }: { stpLoadBalancerName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in application-load-balancer ${printer.makeBold(
        stpLoadBalancerName
      )}.\nIf you specify property ${printer.makeBold('useHttps')}, you also need to specify ${printer.makeBold(
        'customDomain'
      )}. This is due to TLS certificates.`,
      hint: [
        ...hintMessages.buyDomainHint(),
        `Optionally you can configure your own listeners with your custom certificates using ${printer.makeBold(
          'listeners'
        )} property.`
      ]
    };
  },
  e44({
    stpLoadBalancerName,
    referencedFromType,
    referencedFrom
  }: {
    stpLoadBalancerName: string;
    referencedFromType?: StpResourceType | 'alarm';
    referencedFrom: string;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message:
        `Error in ${referencedFromType ? `${referencedFromType} ` : ''}resource ${printer.makeBold(
          referencedFrom
        )} when referencing application-load-balancer ${printer.makeBold(stpLoadBalancerName)}.\n` +
        `You cannot specify ${printer.makeBold(
          'listenerPort'
        )} property when application-load-balancer does not use custom ${printer.makeBold('listeners')}.`
    };
  },
  e45({
    stpLoadBalancerName,
    listenerPort,
    referencedFromType,
    referencedFrom
  }: {
    stpLoadBalancerName: string;
    listenerPort: number;
    referencedFromType?: StpResourceType | 'alarm';
    referencedFrom: string;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message:
        `Error in ${referencedFromType || ''} resource ${printer.makeBold(referencedFrom)}.\n` +
        `Referenced application-load-balancer ${printer.makeBold(
          stpLoadBalancerName
        )} does NOT have listener on port ${printer.makeBold(listenerPort)}.`
    };
  },
  e46({
    stpLoadBalancerName,
    referencedFromType,
    referencedFrom
  }: {
    stpLoadBalancerName: string;
    referencedFromType?: StpResourceType | 'alarm';
    referencedFrom: string;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message:
        `Error in ${referencedFromType ? `${referencedFromType} ` : ''}resource ${printer.makeBold(
          referencedFrom
        )} when referencing application-load-balancer ${printer.makeBold(stpLoadBalancerName)}.\n` +
        `You need to specify ${printer.makeBold(
          'listenerPort'
        )} property when application-load-balancer uses custom ${printer.makeBold('listeners')}.`
    };
  },
  e47({ fullDomainName, associations }: { fullDomainName: string; associations: string[] }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `You are trying to associate single domain (${printer.makeBold(
        fullDomainName
      )}) to multiple resources.\nAssociated resources: ${associations
        .map((resource) => `${printer.makeBold(resource)}`)
        .join(', ')}`,
      hint: 'Single domain can be associated only to single resource.'
    };
  },
  e48({ domainName }: { domainName: string }): ReturnedError {
    return {
      type: 'DOMAIN_MANAGEMENT',
      message: `Cannot use domain ${printer.makeBold(domainName)}. The domain ${printer.makeBold(
        getApexDomain(domainName)
      )} is not registered.`,
      hint: hintMessages.buyDomainHint()
    };
  },
  e49({ domainName, desiredNameServers }: { domainName: string; desiredNameServers?: string[] }): ReturnedError {
    return {
      type: 'DOMAIN_MANAGEMENT',
      message: `Cannot use domain ${printer.makeBold(domainName)}. DNS records of the domain ${printer.makeBold(
        getApexDomain(domainName)
      )} are not under control of your AWS account.`,
      hint: [
        "You can transfer the control over domain's DNS records by changing name server configuration at your domain registrar.\n"
          .concat(
            'Changing name servers will transfer the control of the DNS records to the hosted zone in your AWS account.\n'
          )
          .concat(
            'Read https://docs.stacktape.com/other-resources/domains-and-certificates/#adding-domain before changing name servers.\n'
          )
          .concat(
            desiredNameServers
              ? `Change name servers to following values \n${printer.colorize(
                  'cyan',
                  desiredNameServers.map((ns) => `- ${ns}`).join('\n')
                )}`
              : ''
          ),
        `Use command ${printer.prettyCommand(
          'domain:add'
        )} which will guide you through the process of preparing domain to be used with Stacktape.`
      ]
    };
  },
  e50(): ReturnedError {
    return {
      type: 'MISSING_PREREQUISITE',
      message: 'Both ruby and bundler must be installed',
      hint: [
        'To install Ruby, refer to https://www.ruby-lang.org/en/documentation/installation/',
        'To install bundler, refer to https://bundler.io/'
      ]
    };
  },
  e51(): ReturnedError {
    return {
      type: 'MISSING_PREREQUISITE',
      message: 'Both Python (v3) and Poetry package manager must be installed',
      hint: [
        'To install Python, refer to https://www.python.org/',
        'To install Poetry, refer to https://python-poetry.org/docs/'
      ]
    };
  },
  e52({ resourceName, resourceType }: { resourceName: string; resourceType: StpResourceType }): ReturnedError {
    return {
      type: 'CLI',
      message: `Resource ${printer.colorize(
        'cyan',
        resourceName
      )} of type ${resourceType} is not runnable in a development mode.`,
      hint: 'At the moment, you can locally run only lambda functions and container workloads.'
    };
  },
  e53({ availableContainers }: { availableContainers: string[] }): ReturnedError {
    return {
      type: 'CLI',
      message: `You must specify a container to run using the ${printer.prettyOption(
        'container'
      )} option.\nAvailable containers: ${availableContainers.map(printer.makeBold).join(', ')}`
    };
  },
  e54({
    stpResourceName,
    resourceType
  }: {
    stpResourceName: string;
    resourceType: StpContainerWorkload['configParentResourceType'];
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType(resourceType)} ${printer.makeBold(
        stpResourceName
      )}: The compute resource must use application-load-balancer ${printer.makeBold(
        'event'
      )} integration if you wish to use ${printer.makeBold('deployment')} property`
    };
  },
  e55({ invalidEmail }: { invalidEmail: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error: Invalid email address ${printer.makeBold(invalidEmail)}.`
    };
  },
  e56({ email, region }: { email: string; region: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error: Cannot use email address ${printer.makeBold(
        email
      )} for sending notification. The email is not verified for using within your AWS account.`,
      hint: hintMessages.awsSesEmailVerification({ region })
    };
  },
  e57({ email, region }: { email: string; region: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error: This account's email service (AWS SES) is in the sandbox which means emails(notifications) can only be send to verified emails. Email ${printer.makeBold(
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
      message: `Error: Alarm ${printer.makeBold(
        alarmName
      )} with trigger of type ${alarmType} cannot be used with ${printer.makeBold(
        stpResourceName
      )}, which uses aurora engine. Storage size for aurora databases is automatically scaled based on the demand.`
    };
  },
  e59({ alarmName, stpResourceName }: { alarmName: string; stpResourceName: string }): ReturnedError {
    const alarmType: AlarmDefinition['trigger']['type'] = 'database-free-memory';
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error: Alarm ${printer.makeBold(
        alarmName
      )} with trigger of type ${alarmType} cannot be used with ${printer.makeBold(
        stpResourceName
      )}, which uses aurora serverless engine. Memory for aurora serverless databases is automatically scaled based on the demand.`
    };
  },
  e60({
    alarmReference,
    referencedFromType,
    referencedFrom
  }: {
    alarmReference: string;
    referencedFromType?: StpResourceType | 'alarm';
    referencedFrom: string;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Alarm ${printer.makeBold(alarmReference)} referenced from ${printer.makeBold(referencedFrom)} ${
        referencedFromType ? `(${referencedFromType})` : ''
      } is not defined in this config.`
    };
  },
  e61({
    stpResourceName,
    resourceType
  }: {
    stpResourceName: string;
    resourceType: StpContainerWorkload['configParentResourceType'];
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType(resourceType)} ${printer.makeBold(
        stpResourceName
      )}: Only one container of compute resource can be targeted by exactly one application-load-balancer listener when using ${printer.makeBold(
        'deployment'
      )} property.`
    };
  },
  e62({ stpContainerWorkloadName }: { stpContainerWorkloadName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in multi-container-workload ${printer.makeBold(
        stpContainerWorkloadName
      )}: You need to specify ${printer.makeBold('testListenerPort')} when using ${printer.makeBold(
        'beforeAllowTrafficFunction'
      )} and load balancer with custom listeners`
    };
  },
  e63({
    phase,
    phaseStatus,
    message,
    projectName,
    invocationId
  }: {
    phase: string;
    phaseStatus: string;
    message: string;
    projectName: string;
    invocationId: string;
  }): ReturnedError {
    return {
      type: 'CODEBUILD',
      message: `Start of codebuild deployment failed in phase ${printer.makeBold(phase)} with status ${printer.colorize(
        'red',
        phaseStatus
      )} before logs could be retrieved.${message ? `\nAdditional message: ${message}.` : ''}`,
      hint: `Deployment logs: https://console.stacktape.com/projects/${projectName}/deployment-detail/${invocationId}?tab=logs`
    };
  },
  e64({
    stackName,
    projectName,
    invocationId,
    buildId
  }: {
    stackName: string;
    projectName: string;
    invocationId: string;
    buildId: string;
  }): ReturnedError {
    return {
      type: 'CODEBUILD',
      message: `Deployment of stack ${printer.makeBold(
        stackName
      )} through codebuild failed (buildId: ${buildId}). Inspect logs for further information.`,
      hint: `Deployment logs: https://console.stacktape.com/projects/${projectName}/deployment-detail/${invocationId}?tab=logs`
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
      message: `There is no AWS account named ${printer.makeBold(
        accountName
      )} connected to your organization ${printer.makeBold(organizationName)}.`,
      hint: [
        `Available AWS accounts: ${
          connectedAwsAccounts?.map(({ name }) => printer.makeBold(name)).join(', ') || 'none'
        }`
      ]
    };
  },
  e66({ organizationName }: { organizationName: string }): ReturnedError {
    return {
      type: 'AWS_ACCOUNT',
      message: `There is no AWS account connected to your organization ${printer.makeBold(organizationName)}.`,
      hint: [
        `You can connect AWS account to your Stacktape organization in ${printer.getLink(
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
      message: `There is more than one AWS account connected to your organization ${printer.makeBold(
        organizationName
      )}. Please specify which account you wish to use by using option ${printer.prettyOption('awsAccount')}`,
      hint: [`Available AWS accounts: ${connectedAwsAccounts.map(({ name }) => printer.makeBold(name)).join(', ')}`]
    };
  },
  e68({
    accountInfo,
    organizationName
  }: {
    accountInfo: GlobalStateConnectedAwsAccount;
    organizationName: string;
  }): ReturnedError {
    return {
      type: 'AWS_ACCOUNT',
      message: `AWS account ${printer.makeBold(accountInfo.name)} (account id: ${
        accountInfo.awsAccountId
      }) connected to your organization ${printer.makeBold(organizationName)} is currently in ${printer.makeBold(
        accountInfo.state
      )} state and cannot be used.`,
      hint:
        accountInfo.state === 'PENDING'
          ? [
              `Please finalize account connecting in the ${printer.getLink(
                'connectedAwsAccounts',
                'stacktape console'
              )}`
            ]
          : ['Contact Stacktape support at info@stacktape.com or on Discord']
    };
  },
  e69({
    accountInfo,
    credentials,
    credentialsOriginArn,
    credentialsOriginAwsAccount,
    profile
  }: {
    accountInfo: GlobalStateConnectedAwsAccount;
    credentials: LoadedAwsCredentials;
    credentialsOriginArn: string;
    credentialsOriginAwsAccount: string;
    profile?: string;
  }): ReturnedError {
    return {
      type: 'AWS_ACCOUNT',
      message: `AWS credentials (retrieved via ${printer.makeBold(credentials.source)}${
        credentials.source === 'credentialsFile' ? ` - profile "${profile}"` : ''
      }) do not belong to the target AWS account ${printer.makeBold(accountInfo.name)}(id: ${
        accountInfo.awsAccountId
      }). Retrieved credentials originated from ${printer.makeBold(
        credentialsOriginArn
      )}(AWS account id: ${credentialsOriginAwsAccount}).`
    };
  },
  e70({
    constructName,
    constructExportName,
    constructFilePath,
    rootError
  }: {
    constructName: string;
    constructExportName: string;
    constructFilePath: string;
    rootError: Error;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in construct ${printer.makeBold(
        constructName
      )}: Unable to import construct class (export "${printer.makeBold(
        constructExportName
      )}") exported from file ${printer.makeBold(constructFilePath)}.\nRoot cause: ${rootError}`,
      hint: 'Are you sure you are referencing correct export?'
    };
  },
  e71({
    constructName,
    constructExportName,
    constructFilePath
  }: {
    constructName: string;
    constructExportName: string;
    constructFilePath: string;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in construct ${printer.makeBold(constructName)}: Export "${printer.makeBold(
        constructExportName
      )}" from file ${printer.makeBold(constructFilePath)} is not a valid construct.`,
      hint: 'Are you sure you are referencing correct export?'
    };
  },
  e72({ constructName, rootError }: { constructName: string; rootError: Error }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error when synthesizing CDK construct ${printer.makeBold(constructName)}\nRoot cause: ${rootError}`
    };
  },
  e73({ constructName, constructClassName }: { constructName: string; constructClassName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `AWS CDK construct ${printer.makeBold(
        constructName
      )} is of type (${constructClassName} extends Stack). Currently, we do not allow using "Stack" constructs in ${printer.makeBold(
        'aws-cdk-construct'
      )}.`,
      hint: ['Try wrapping your construct resources in a generic construct instead of a "Stack".']
    };
  },
  e74({
    constructName,
    constructExportName,
    rootError
  }: {
    constructName: string;
    constructExportName: string;
    rootError: Error;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in construct ${printer.makeBold(
        constructName
      )}: Unable to instantiate imported construct class (export "${printer.makeBold(
        constructExportName
      )}").\nRoot cause: ${rootError}`,
      hint: 'Is referenced export valid construct class?'
    };
  },
  e75({
    workloadName,
    workloadType
  }: {
    workloadName: string;
    workloadType: StpContainerWorkload['configParentResourceType'];
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType(workloadType)} ${printer.makeBold(
        workloadName
      )}: Property "${printer.makeBold('deployment')}" cannot be used when using "service-connect" events.`
    };
  },
  e76({ stackName, command }: { stackName: string; command: StacktapeCommand }): ReturnedError {
    return {
      type: 'STACK',
      message: `Cannot execute command ${printer.prettyCommand(command)} on stack ${printer.makeBold(
        stackName
      )} at the moment because the stack is in "${printer.makeBold('DELETE_FAILED')}" state.`,
      hint: [`Delete the stack fully using ${printer.prettyCommand('delete')} before retrying the command.`]
    };
  },
  e77({
    resourceName,
    stackName,
    resourceType
  }: {
    resourceName: string;
    stackName: string;
    resourceType?: StpResourceType;
  }): ReturnedError {
    return {
      type: 'NON_EXISTING_RESOURCE',
      message: sharedErrorMessages.resourceNotDeployed({ resourceName, stackName, resourceType })
    };
  },
  e78({
    resourceName,
    resourceParamName,
    resourceType,
    referenceableParams
  }: {
    resourceName: string;
    resourceParamName: string;
    resourceType: StpResourceType;
    referenceableParams: string[];
  }): ReturnedError {
    return {
      type: 'PARAMETER',
      message: `Parameter ${printer.prettyResourceParamName(
        resourceParamName
      )} is not referenceable on the resource ${printer.prettyResourceName(
        resourceName
      )} of type ${printer.prettyResourceType(resourceType)}.`,
      hint: [
        `Referenceable params of the resource: ${referenceableParams
          .map((param) => printer.prettyResourceParamName(param))
          .join(', ')}.`
      ]
    };
  },
  e79({ webServiceName }: { webServiceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType('web-service')} ${printer.prettyResourceName(
        webServiceName
      )}. When using ${printer.prettyConfigProperty(
        'deployment'
      )} property, you must use load balancing type "application-load-balancer".`
    };
  },
  e80({ webServiceName }: { webServiceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType('web-service')} ${printer.prettyResourceName(
        webServiceName
      )}. You can only use ${printer.prettyConfigProperty(
        'alarms'
      )} compatible with web service load balancing type (i.e ${printer.prettyResourceType(
        'application-load-balancer'
      )} alarms for ${printer.prettyResourceType('application-load-balancer')} and ${printer.prettyResourceType(
        'http-api-gateway'
      )} alarms for ${printer.prettyResourceType('http-api-gateway')}).`
    };
  },
  e81({ stpSqsQueueName }: { stpSqsQueueName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType('sqs-queue')} ${printer.prettyResourceName(
        stpSqsQueueName
      )}. Properties ${printer.prettyConfigProperty('fifoHighThroughput')} and ${printer.prettyConfigProperty(
        'contentBasedDeduplication'
      )} can only be used when fifo is enabled(property ${printer.prettyConfigProperty(
        'fifoEnabled'
      )} is set to ${printer.makeBold('true')}).`
    };
  },
  e82({ stpSqsQueueName }: { stpSqsQueueName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType('sns-topic')} ${printer.prettyResourceName(
        stpSqsQueueName
      )}. Property ${printer.prettyConfigProperty(
        'contentBasedDeduplication'
      )} can only be used when fifo is enabled(property ${printer.prettyConfigProperty(
        'fifoEnabled'
      )} is set to ${printer.makeBold('true')}).`
    };
  },
  e83({
    eventBusReferencerStpName,
    eventBusReferencerStpType
  }: {
    eventBusReferencerStpName: string;
    eventBusReferencerStpType: StpResourceType;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType(eventBusReferencerStpType)} ${printer.prettyResourceName(
        eventBusReferencerStpName
      )}. When referencing event bus you must specify exactly one of ${printer.prettyConfigProperty(
        'eventBusName'
      )}, ${printer.prettyConfigProperty('eventBusArn')} or ${printer.prettyConfigProperty(
        'useDefaultBus'
      )} properties.`
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
      message: `Error in ${printer.prettyResourceType(sqsQueueReferencerStpType)} ${printer.prettyResourceName(
        sqsQueueReferencerStpName
      )}. When referencing sqs queue you must specify exactly one of ${printer.prettyConfigProperty(
        'sqsQueueName'
      )} or ${printer.prettyConfigProperty('sqsQueueArn')} properties.`
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
      message: `Error in ${printer.prettyResourceType(snsTopicReferencerStpType)} ${printer.prettyResourceName(
        snsTopicReferencerStpName
      )}. When referencing sns topic you must specify exactly one of ${printer.prettyConfigProperty(
        'snsTopicName'
      )} or ${printer.prettyConfigProperty('snsTopicArn')} properties.`
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
      message: `Error in ${printer.prettyResourceType(snsTopicReferencerStpType)} ${printer.prettyResourceName(
        snsTopicReferencerStpName
      )}. You cannot reference ${printer.prettyResourceType('sns-topic')} ${printer.prettyResourceName(
        snsTopicStpName
      )} in the event, because it has fifo enabled.`
    };
  },
  e87({
    workloadName,
    workloadType
  }: {
    workloadName: string;
    workloadType: StpContainerWorkload['type'];
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: [
        `Error in ${printer.prettyResourceType(workloadType)} ${printer.makeBold(
          workloadName
        )}: When configuring ${printer.prettyConfigProperty('resources')} you must choose one of:`,
        `1. Specify ${printer.prettyConfigProperty('cpu')} and ${printer.prettyConfigProperty(
          'memory'
        )} properties only (FARGATE launch type will be used).`,
        `2. Specify ${printer.prettyConfigProperty(
          'instanceTypes'
        )} property (EC2 launch type will be used). You can optionally also configure ${printer.prettyConfigProperty(
          'cpu'
        )} and ${printer.prettyConfigProperty('memory')}`
      ].join('\n'),
      hint: [
        `See resource docs to learn more: https://docs.stacktape.com/compute-resources/${workloadType}s/#resources`
      ]
    };
  },
  e88({ domainName }: { domainName: string }): ReturnedError {
    return {
      type: 'DOMAIN_MANAGEMENT',
      message: `Cannot use domain name ${printer.makeBold(domainName)}. DNS records of the domain ${printer.makeBold(
        getApexDomain(domainName)
      )} are not under control of your AWS account or the domain was not yet configured to be used with Stacktape.`,
      hint: [
        'Depending on your goal:',
        `1. If you want Stacktape to be able to manage your domain names (DNS) and TLS certificates, run command ${printer.prettyCommand('domain:add')} to see next steps.`,
        `2. If you wish to manage DNS records on your own, set ${printer.prettyConfigProperty('disableDnsRecordCreation')} to ${printer.makeBold('true')} and specify ${printer.prettyConfigProperty('customCertificateArn')}`,
        'Refer to Stacktape docs for more information: https://docs.stacktape.com/other-resources/domains-and-certificates/'
      ].join('\n')
    };
  },
  e89({
    workloadName,
    workloadType
  }: {
    workloadName: string;
    workloadType: StpContainerWorkload['type'];
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType(workloadType)} ${printer.makeBold(
        workloadName
      )}: When configuring ${printer.prettyConfigProperty('scaling')} you must specify ${printer.prettyConfigProperty(
        'maxInstances'
      )} property(it also must be higher or equal to ${printer.prettyConfigProperty('minInstances')}).`
    };
  },
  // e90(_arg: null): ReturnedError {
  //   return {
  //     type: 'CLI',
  //     message: `You must specify one of:\n1. ${printer.prettyOption('stackName')} option\n2. ${printer.prettyOption(
  //       'stage'
  //     )} and ${printer.prettyOption('configPath')} options.`,
  //     hint: `If you use ${printer.prettyOption('stage')} and ${printer.prettyOption(
  //       'configPath'
  //     )} options, stack name will be derived from the supplied configuration. If you use ${printer.prettyOption(
  //       'stackName'
  //     )}, the stackName will be used.`
  //   };
  // },
  e91({
    workloadType,
    workloadName,
    appVariable
  }: {
    workloadType: StpResourceType;
    workloadName: string;
    appVariable: string;
  }): ReturnedError {
    return {
      type: 'PACKAGING_CONFIG',
      message: `Error in ${printer.prettyResourceType(workloadType)} ${printer.prettyResourceName(workloadName)}:
You have specified ${printer.makeBold('app_variable')} "${appVariable}" in your ${printer.prettyConfigProperty(
        'entryfilePath'
      )}. In this case, you must also specify ${printer.prettyConfigProperty(
        'runAppAs'
      )} property in the ${printer.prettyConfigProperty('languageSpecificConfig')}`
    };
  },
  e92({
    stpHttpApiGatewayName,
    stpResourceName1,
    stpResourceName2
  }: {
    stpHttpApiGatewayName: string;
    stpResourceName1: string;
    stpResourceName2: string;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in event integrations of ${printer.prettyResourceType(
        'http-api-gateway'
      )} ${printer.prettyResourceName(
        stpHttpApiGatewayName
      )}. Events on two different resources(${printer.prettyResourceName(
        stpResourceName1
      )} and ${printer.prettyResourceName(stpResourceName2)}) are using the same ${printer.prettyConfigProperty(
        'path'
      )} and ${printer.prettyConfigProperty('method')} which is not allowed.`
    };
  },
  e93({
    stpApplicationLoadBalancerName,
    stpResourceName1,
    stpResourceName2
  }: {
    stpApplicationLoadBalancerName: string;
    stpResourceName1: string;
    stpResourceName2: string;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in event integrations of ${printer.prettyResourceType(
        'application-load-balancer'
      )} ${printer.prettyResourceName(
        stpApplicationLoadBalancerName
      )}. Events on two different resources(${printer.prettyResourceName(
        stpResourceName1
      )} and ${printer.prettyResourceName(stpResourceName2)}) are using the same ${printer.prettyConfigProperty(
        'priority'
      )} which is not allowed.`
    };
  },
  e94({
    scriptType
  }: {
    scriptType: Subtype<Script['type'], 'bastion-script' | 'local-script-with-bastion-tunneling'>;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.makeBold('script')}. You cannot use script of type ${printer.makeBold(
        scriptType
      )} if resource of type ${printer.prettyResourceType('bastion')} does not exist in the config.`
    };
  },
  e95({ stpResourceName }: { stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.makeBold('bastion tunnel')}. Resource ${printer.prettyResourceName(
        stpResourceName
      )} cannot be targeted by bastion tunnel.\nOnly the following resource types can be used as a target for bastion tunnel: ${(
        [
          'relational-database',
          'redis-cluster',
          'application-load-balancer',
          'private-service (with loadBalancing type application-load-balancer)'
        ] as StpResourceType[]
      )
        .map(printer.prettyResourceType)
        .join(', ')}`
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
      message: `Cannot perform operation, because no resource of type ${printer.prettyResourceType(
        'bastion'
      )} was found in your stack.`,
      hint: ['See Stacktape docs on how to add and use bastion: https://docs.stacktape.com/resources/bastion-servers/']
    };
  },
  e98({ stpResourceName }: { stpResourceName: string }): ReturnedError {
    return {
      type: 'NON_EXISTING_RESOURCE',
      message: `No resource with name ${printer.prettyResourceName(stpResourceName)} was found in your stack.`,
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
      message: `Resource with name ${printer.prettyResourceName(
        stpResourceName
      )} if of type ${printer.prettyResourceType(
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
          .map(printer.prettyResourceType)
          .join(', ')} `
      ]
    };
  },
  e100({
    command,
    stackName,
    stackStatus
  }: {
    command: Subtype<StacktapeCommand, 'deploy' | 'delete' | 'dev' | 'rollback' | 'deployment-script:run'>;
    stackName: string;
    stackStatus: StackStatus;
  }): ReturnedError {
    return {
      type: 'EXISTING_STACK',
      message: `Cannot perform operation ${printer.prettyCommand(command)} on stack ${printer.prettyStackName(
        stackName
      )} because it is currently in state ${printer.colorize('red', stackStatus)}`,
      hint: [
        `To perform ${printer.prettyCommand(
          command
        )} operation, stack must be in one of the following states: ${(command === 'rollback'
          ? STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS
          : STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS
        )
          .map((status) => `${printer.colorize('blue', status)}`)
          .join(', ')}`
      ]
        .concat(
          stackStatus === StackStatus.DELETE_FAILED
            ? [`Delete the stack fully using ${printer.prettyCommand('delete')} command, then recreate it.`]
            : []
        )
        .concat(
          STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS.includes(stackStatus)
            ? [
                `To rollback your stack to previously working state, try using ${printer.prettyCommand(
                  'rollback'
                )} command.`
              ]
            : []
        )
    };
  },
  e101({
    stpResourceName,
    cfLogicalName,
    childResources
  }: {
    stpResourceName: string;
    cfLogicalName: string;
    childResources: string[];
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Cloudformation resource "${cfLogicalName}" is not a valid child resource of stacktape resource ${printer.prettyResourceName(
        stpResourceName
      )}.\nValid child resources are: ${childResources.join(', ')}.`
    };
  },
  e102({ functionName }: { functionName: string }): ReturnedError {
    return {
      type: 'CONFIG',
      message: `${printer.prettyConfigProperty('Handler')} property of lambda function ${printer.prettyResourceName(
        functionName
      )} has invalid format.`,
      hint: `Handler must be in shape ${printer.makeBold('{{filePath}}:{{handlerFunction}}')}`
    };
  },
  e103(_arg: null): ReturnedError {
    return {
      type: 'INPUT',
      message: `Invalid arguments. Please specify ${printer.prettyOption('projectName')} option.`
    };
  },
  e104({ serviceName }: { serviceName: string }): ReturnedError {
    return {
      type: 'CONFIG',
      message: `Using ${printer.prettyConfigProperty('serviceName')} in your config is deprecated. Use option "${printer.colorize('gray', `--projectName ${serviceName}`)}" instead.`,
      hint: `Use your current ${printer.prettyConfigProperty('serviceName')} as a ${printer.prettyOption('projectName')} to keep using the same stack.`
    };
  },
  e105({ stpResourceName }: { stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceName(stpResourceName)} (${printer.prettyResourceType('nextjs-web')}) Cannot use edge lambdas ${printer.prettyConfigProperty('useEdgeLambda')} together with streaming responses ${printer.prettyConfigProperty('streamingEnabled')}.`
    };
  },
  e106({ directoryPath, stpResourceName }: { directoryPath: string; stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceName(stpResourceName)} resource: Specified directory "${printer.prettyFilePath(directoryPath)}" is not accessible or not a directory.`
    };
  },
  e107({ directoryPath, stpResourceName }: { directoryPath: string; stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceName(stpResourceName)} resource: Specified directory "${printer.prettyFilePath(directoryPath)}" does not seem to contain Next.js project (does not contain next.config.(js/ts)).`
    };
  },
  e108({ reason, command }: { reason?: string; command: StacktapeCommand }) {
    return {
      type: 'CONFIRMATION_REQUIRED',
      message: `Operation ${printer.prettyCommand(command)} requires confirmation.${reason ? `Reason:\n${reason}` : ''} `,
      hint: `To automatically provide confirmation use auto-confirm option (${printer.prettyOption('autoConfirmOperation')}) during this operation.`
    };
  },
  e109({
    eventBusReferencerStpName,
    eventBusReferencerStpType
  }: {
    eventBusReferencerStpName: string;
    eventBusReferencerStpType: StpResourceType;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType(eventBusReferencerStpType)} ${printer.prettyResourceName(
        eventBusReferencerStpName
      )}. When using ${printer.prettyConfigProperty(
        'onDeliveryFailure'
      )} for event bus integration, you must specify exactly one of ${printer.prettyConfigProperty(
        'sqsQueueName'
      )} or ${printer.prettyConfigProperty('sqsQueueArn')} properties.`
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
      message: `Error in ${printer.prettyResourceType('relational-database')} ${printer.prettyResourceName(
        databaseStpResourceName
      )}. You must specify engine ${printer.prettyConfigProperty('version')} in engine properties.${currentDatabaseVersion ? `Currently, your database uses version ${printer.colorize('gray', currentDatabaseVersion, true)}.\nOther available versions are:` : '\nAvailable versions are:'} ${availableVersions
        .sort((v1, v2) => v2.localeCompare(v1))
        .map((version) => printer.colorize('gray', version))
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
      message: `Error in ${printer.prettyResourceType('relational-database')} ${printer.prettyResourceName(
        databaseStpResourceName
      )}. Specified engine ${printer.prettyConfigProperty('version')} ${printer.makeBold(chosenDatabaseVersion)} is not a valid available version for this engine.\n Available versions are: ${availableVersions
        .sort((v1, v2) => v2.localeCompare(v1))
        .map((version) => printer.colorize('gray', version))
        .join(', ')}`
    };
  },
  e112({ sqsQueueReferencerStpName }: { sqsQueueReferencerStpName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType('sqs-queue')} ${printer.prettyResourceName(
        sqsQueueReferencerStpName
      )}. When referencing target sqs queue in redrive policy, you must specify exactly one of ${printer.prettyConfigProperty(
        'targetSqsQueueName'
      )} or ${printer.prettyConfigProperty('targetSqsQueueArn')} properties.`
    };
  },
  e113({ providerType }: { providerType: 'Upstash' | 'Atlas Mongo' }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: [
        `Error in the config. When using third-party resources from ${printer.makeBold(providerType)} you must provide credentials for the ${printer.makeBold(providerType)} provider in one of these ways:`,
        `  1. Create credentials for 3rd party integration in the stacktape console ${printer.getLink('console', 'here')}`,
        `  2. Specify credentials in the ${printer.prettyConfigProperty('providerConfig')} section in your stacktape config file.`
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
        `Error in the ${printer.prettyResourceType(originalResourceType)} resource ${printer.prettyResourceName(stpResourceName)}:`,
        `Chosen instance ${printer.makeBold(instanceType)} does not have enough memory to run workload with ${printer.makeBold(requestedMemory)} MB of memory. Available memory for this instance is ${printer.makeBold(availableMemory)} (accounting for OS and background processes).`
      ].join('\n')
    };
  },
  e115({ stpResourceName }: { stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: [
        `Error in ${printer.prettyResourceType('open-search-domain')} resource ${printer.prettyResourceName(stpResourceName)}:`,
        `Data node instance count (property ${printer.prettyConfigProperty('clusterConfig.instanceCount')}) must be higher than 1 to enable MultiAZ awareness (property ${printer.prettyConfigProperty('multiAzEnabled')}).`
      ].join('\n')
    };
  },
  e116({
    stpLoadBalancerName,
    referencingWorkloadNames,
    port
  }: {
    stpLoadBalancerName: string;
    referencingWorkloadNames: string[];
    port: number;
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in network load-balancer ${printer.prettyResourceName(
        stpLoadBalancerName
      )}. Listener with port ${port} has ${referencingWorkloadNames.length} integrations (${referencingWorkloadNames.join(
        ', '
      )}). Each network load balancer listener must have exactly one integration.`
    };
  },
  e117({ webServiceName }: { webServiceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in web-service ${printer.prettyResourceName(
        webServiceName
      )}. CDN can only be used with web services that use ${printer.prettyConfigProperty('http-api-gateway')} (default) or ${printer.prettyConfigProperty('application-load-balancer')} load balancing types.`
    };
  },
  e118({ webServiceName }: { webServiceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in web-service ${printer.prettyResourceName(
        webServiceName
      )}. If you disable DNS record creation for your domain, you must specify ${printer.prettyConfigProperty('customCertificateArn')} property.`
    };
  },
  e119({ containerResourceName }: { containerResourceName: string }): ReturnedError {
    return {
      type: 'NON_EXISTING_RESOURCE',
      message: `Error when running ${printer.prettyCommand('container:session')}. Resource ${printer.prettyResourceName(
        containerResourceName
      )} is not a valid container based resource.`
    };
  },
  e120({
    containerResourceName,
    availableContainers
  }: {
    containerResourceName: string;
    availableContainers: string[];
  }): ReturnedError {
    return {
      type: 'NON_EXISTING_RESOURCE',
      message: `Error when running ${printer.prettyCommand('container:session')}. Resource ${printer.prettyResourceName(
        containerResourceName
      )} contains following containers: ${availableContainers.map((name) => printer.makeBold(name)).join(', ')}. Please specify which container you want to connect to using ${printer.prettyConfigProperty('--container')} argument.`
    };
  },
  e121({ lambdaStpResourceName }: { lambdaStpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType('function')} ${printer.prettyResourceName(lambdaStpResourceName)}: When using ${printer.prettyConfigProperty(
        'volumeMounts'
      )}, the property ${printer.prettyConfigProperty('joinDefaultVpc')} must be set to ${printer.makeBold('true')}.`,
      hint: 'Be aware that a Lambda function joined to a VPC cannot access the internet.'
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
      message: `Cannot retrieve execution role for resource ${printer.prettyResourceName(stpResourceName)} of type ${printer.prettyResourceType(stpResourceType)}.`,
      hint: `Supported resource types are: ${supportedResourceTypes.map((type) => printer.prettyResourceType(type)).join(', ')}.`
    };
  },
  e123({ stpResourceName }: { stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType('relational-database')} ${printer.prettyResourceName(stpResourceName)}. Preferred maintenance window must be in format "day:hour:minute-day:hour:minute" (e.g. ${printer.makeBold('Sun:02:00-Sun:04:00')}).`
    };
  },
  e124({ stpResourceName }: { stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType('nextjs-web')} ${printer.prettyResourceName(stpResourceName)}. You cannot use ${printer.prettyConfigProperty('joinDefaultVpc')} property when using edge lambda.`
    };
  },
  e125({
    stpResourceName,
    stpResourceType
  }: {
    stpResourceName: string;
    stpResourceType: StpContainerWorkload['configParentResourceType'];
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType(stpResourceType)} ${printer.prettyResourceName(stpResourceName)}. Property ${printer.prettyConfigProperty('enableWarmPool')} can only be used when you specify exactly one instance type in ${printer.prettyConfigProperty('instanceTypes')}. Warm pools are not supported with mixed instance types.`
    };
  },
  e126({
    stpResourceName,
    stpResourceType
  }: {
    stpResourceName: string;
    stpResourceType: StpContainerWorkload['configParentResourceType'];
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType(stpResourceType)} ${printer.prettyResourceName(stpResourceName)}. Property ${printer.prettyConfigProperty('cpuArchitecture')} cannot be used when ${printer.prettyConfigProperty('instanceTypes')} is specified.`,
      hint: `Property ${printer.prettyConfigProperty('cpuArchitecture')} is only used when using Fargate launch type (when ${printer.prettyConfigProperty('instanceTypes')} is not specified). When using EC2 launch type, CPU architecture is determined by the instance type.`
    };
  },
  e127({ stpLoadBalancerName }: { stpLoadBalancerName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `No valid target container services found for load balancer ${printer.prettyResourceName(stpLoadBalancerName)}. Cannot create unhealthy targets alarm.`
    };
  },
  e128({ configPath }: { configPath: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `When loading config from ${printer.prettyFilePath(configPath)}: Export ${printer.makeBold('getConfig')} must be a function.`
    };
  },
  e129({ configPath, config }: { configPath: string; config: any }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Could not load valid config object from file ${printer.prettyFilePath(configPath)}. Returned value: ${config}`
    };
  },
  e130({ port }: { port: string | number }): ReturnedError {
    return {
      type: 'INPUT',
      message: `Unable to use local port ${printer.makeBold(String(port))} for tunneling because it is already in use.`,
      hint: `If you do not specify ${printer.prettyOption('localTunnelingPort')} option, Stacktape will automatically find a free port.`
    };
  },
  e501({ operation }: { operation: string }): ReturnedError {
    return {
      type: 'API_KEY',
      message: `Operation '${operation}' requires Stacktape API Key to be configured on your system.`,
      hint: `You can get your API KEY in the ${printer.getLink('apiKeys', 'console')}.`
    };
  },
  e502({ message }: { message: string }): ReturnedError {
    return {
      type: 'SUBSCRIPTION_REQUIRED',
      message,
      hint: `You can upgrade your subscription plan in the ${printer.getLink('subscription', 'console')}.`
    };
  },
  e503({ message }: { message: string }): ReturnedError {
    return {
      type: 'API_SERVER',
      message
    };
  },
  e504({ sourceCodePath }: { sourceCodePath: string }): ReturnedError {
    return {
      type: 'CONFIG_GENERATION',
      message: `No suitable Stacktape configuration can be generated for project in directory ${sourceCodePath}`
    };
  },
  e505({ sourceCodePath }: { sourceCodePath: string }): ReturnedError {
    return {
      type: 'CONFIG_GENERATION',
      message: `The specified directory (${printer.prettyFilePath(
        sourceCodePath
      )}) is not a Next.js project. Missing package.json file.`
    };
  },
  e506({ projectId }: { projectId: string }): ReturnedError {
    return {
      type: 'CLI',
      message: `Starter project ${projectId} does not exist.`
    };
  },
  e507({ missingLibs, feature }: { missingLibs: string[]; feature: string }): ReturnedError {
    return {
      type: 'MISSING_PREREQUISITE',
      message: `Using ${printer.makeBold(feature)} requires ${missingLibs.join(', ')} to be installed in the project.`
    };
  },
  e508({ errorDetails }: { errorDetails: string }): ReturnedError {
    return {
      type: 'INPUT',
      message: `Failed to generate configuration using AI. Details: ${errorDetails}`
    };
  },
  e509({ templateId }: { templateId: string }): ReturnedError {
    return {
      type: 'INPUT',
      message: `Can't find template with id ${templateId}`
    };
  },

  e1001({
    entryfilePath,
    workloadType,
    workloadName
  }: {
    entryfilePath: string;
    workloadType: StpResourceType;
    workloadName: string;
  }): ReturnedError {
    return {
      type: 'PACKAGING_CONFIG',
      message: `Error in ${printer.prettyResourceType(workloadType)} ${printer.prettyResourceName(workloadName)}:
If you want to run app as WSGI/ASGI, please specify the app_variable(WSGI/ASGI callable) in the  ${printer.prettyConfigProperty(
        'entryfilePath'
      )} i.e ${printer.prettyFilePath(`${entryfilePath}:<<app_variable>>`)}.`,
      hint: `${printer.makeBold('Typical paths')} for most used frameworks:
Django: ${printer.prettyFilePath('project/asgi.py:application')}
Flask: ${printer.prettyFilePath('project/app.py:application')}
FastAPI: ${printer.prettyFilePath('project/main.py:app`')}`
    };
  },
  e1002({ workloadType, workloadName }: { workloadType: StpResourceType; workloadName: string }): ReturnedError {
    return {
      type: 'PACKAGING_CONFIG',
      message: `Error in ${printer.prettyResourceType(workloadType)} ${printer.prettyResourceName(workloadName)}:
Property ${printer.prettyConfigProperty('runAppAs')} can be specified only for ${printer.prettyConfigProperty(
        'stacktape-image-buildpack'
      )} packaging type`
    };
  },
  e1003({ webServiceName }: { webServiceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType('web-service')} ${printer.prettyResourceName(
        webServiceName
      )}. You can only use ${printer.prettyConfigProperty('useFirewall')} with ${printer.prettyResourceType(
        'application-load-balancer'
      )} load balancing type.`
    };
  },
  e1004({ firewallName }: { firewallName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType('web-app-firewall')} ${printer.prettyResourceName(
        firewallName
      )}. Firewall with ${printer.prettyConfigProperty(
        'scope: cdn'
      )}: can't be used with regional resources without CDN and firewall with ${printer.prettyConfigProperty(
        'scope: regional'
      )} can;t be used with resources using CDN.`
    };
  },
  e1005({ firewallName }: { firewallName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType('web-app-firewall')} ${printer.prettyResourceName(
        firewallName
      )}: Firewall ${printer.prettyConfigProperty(
        'scope'
      )}: can't be changed after firewall was created. Delete existing and create new with desired ${printer.prettyConfigProperty(
        'scope'
      )}.`
    };
  },
  e1006({ domainName }: { domainName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType('open-search-domain')} ${printer.prettyResourceName(
        domainName
      )}: Properties ${printer.prettyConfigProperty('storage.iops')} and ${printer.prettyConfigProperty(
        'storage.throughput'
      )} can be used only with instances supporting EBS gp3 storage.`
    };
  },
  e1007({ domainName }: { domainName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${printer.prettyResourceType('open-search-domain')} ${printer.prettyResourceName(
        domainName
      )}: Property ${printer.prettyConfigProperty(
        'storage'
      )} can be used only with instances that support EBS (not with the instances that have dedicated storage space).`
    };
  },
  e131({ stackName }: { stackName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Stack cannot reuse VPC from stack ${printer.makeBold(stackName)} because no valid VPC was found.`,
      hint: 'You can only reuse VPC from other Stacktape stacks that have been deployed.'
    };
  },
  e132(_arg: null): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Invalid ${printer.prettyConfigProperty('stackConfig.vpc.reuseVpc')} configuration. You must specify either ${printer.makeBold('vpcId')} OR both ${printer.makeBold('projectName')} and ${printer.makeBold('stage')}, but not both methods.`
    };
  },
  e133({ vpcId, foundCount }: { vpcId: string; foundCount: number }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `VPC ${printer.makeBold(vpcId)} does not have enough public subnets. Found ${printer.makeBold(String(foundCount))} public subnet(s), but at least ${printer.makeBold('3')} are required.`,
      hint: 'Public subnets are identified by having a route to an Internet Gateway (0.0.0.0/0 -> igw-*) in their associated route table.'
    };
  },
  e134({ vpcId, cidrBlock }: { vpcId: string; cidrBlock: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `VPC ${printer.makeBold(vpcId)} has an invalid CIDR block ${printer.makeBold(cidrBlock)}. VPC must use a private IP address range.`,
      hint: `Valid private IP ranges are: ${printer.makeBold('10.0.0.0/8')}, ${printer.makeBold('172.16.0.0/12')}, and ${printer.makeBold('192.168.0.0/16')} (RFC 1918).`
    };
  },
  e135({
    vpcId,
    foundCount,
    requiringResources
  }: {
    vpcId: string;
    foundCount: number;
    requiringResources: string[];
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `VPC ${printer.makeBold(vpcId)} does not have enough private subnets. Found ${printer.makeBold(String(foundCount))} private subnet(s), but at least ${printer.makeBold('2')} are required when resources use ${printer.makeBold('usePrivateSubnetsWithNAT')}.`,
      hint: `The following resources require private subnets: ${requiringResources.map((r) => printer.prettyResourceName(r)).join(', ')}. Private subnets are identified by NOT having a direct route to an Internet Gateway in their route table.`
    };
  },
  e136({ configPath, packageName }: { configPath: string; packageName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Cannot find package ${printer.makeBold(packageName)} when loading config from ${printer.prettyFilePath(configPath)}.`,
      hint: `Install the package by running: ${printer.makeBold(`npm install ${packageName}`)} or ${printer.makeBold(`bun add ${packageName}`)}`
    };
  },
  e137({ configPath, errorMessage }: { configPath: string; errorMessage: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Syntax error in TypeScript config ${printer.prettyFilePath(configPath)}.`,
      hint: `Error details: ${errorMessage}`
    };
  },
  e138({ configPath, errorMessage }: { configPath: string; errorMessage: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Failed to execute TypeScript config ${printer.prettyFilePath(configPath)}.`,
      hint: `Error details: ${errorMessage}`
    };
  },
  e139({ configPath }: { configPath: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `TypeScript config ${printer.prettyFilePath(configPath)} must export a default function (using ${printer.makeBold('defineConfig')}) or a ${printer.makeBold('getConfig')} function.`,
      hint: `Example:\n${printer.makeBold(`import { defineConfig } from 'stacktape';\nexport default defineConfig(({ stage }) => ({ resources: {} }));`)}`
    };
  },
  e140({ configPath, exportValue }: { configPath: string; exportValue: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Config function in ${printer.prettyFilePath(configPath)} must return an object, but returned ${printer.makeBold(exportValue)}.`,
      hint: `Make sure your config function returns a valid Stacktape configuration object with at least a ${printer.makeBold('resources')} property.`
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
    return `Resource ${printer.prettyResourceName(resourceName)}${
      resourceType ? ` of type ${printer.prettyResourceType(resourceType)} ` : ' '
    }is not deployed as a part of the ${printer.makeBold(stackName)} stack.`;
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
      `If you are creating a new ${resourceType}, it must be first deployed with the entire stack using the ${printer.prettyCommand(
        'deploy'
      )} command.`
    ];
  },
  configPathHint(): string[] {
    return ['You can specify the config file explicitly using the --configPath option.'];
  },
  incorrectAwsAccount({
    organizationName,
    awsAccountName
  }: {
    organizationName: string;
    awsAccountName: string;
  }): string[] {
    return [
      `Are you sure you are using correct Stacktape organization and AWS account? Current organization: ${printer.makeBold(
        organizationName
      )} and AWS account ${printer.makeBold(awsAccountName)}.`,
      `You can check which AWS accounts are connected to you organization in ${printer.getLink(
        'connectedAwsAccounts',
        'console'
      )}`
    ];
  },
  weakCredentials({ credentials, profile }: { credentials: ValidatedAwsCredentials; profile: string }): string[] {
    return [
      `Credentials might not have enough permissions to perform operation. Credentials were retrieved via ${printer.makeBold(
        credentials.source
      )}${
        credentials.source === 'credentialsFile' ? ` - profile "${profile}"` : ''
      } and belong to entity ${printer.makeBold(credentials.identity.arn)}`
    ];
  },
  buyDomainHint(): string[] {
    return [
      `If you do not own a domain, you can register/buy a domain in the AWS console: https://us-east-1.console.aws.amazon.com/route53/home#DomainRegistration:
Prices of domains start at $3/year for ${printer.colorize('gray', '.click')} domains.
After buying the domain, run the ${printer.prettyCommand(
        'domain:add'
      )} to prepare the domain to be usable with Stacktape.`
    ];
  }
};

type ReturnedError = ArgType<typeof getError>;

export type ErrorCode = keyof typeof errors;
