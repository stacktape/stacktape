import { tuiManager } from '@application-services/tui-manager';
import { StackStatus } from '@aws-sdk/client-cloudformation';
import { VALID_CONFIG_PATHS } from '@config';
import {
  STACK_IS_READY_FOR_MODIFYING_OPERATION_STATUS,
  STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS
} from '@shared/aws/cloudformation';
import { consoleLinks } from '@shared/naming/console-links';
import { getError } from '@shared/utils/misc';
import { getApexDomain } from '@utils/domains';

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
      message: `Resource ${tuiManager.prettyResourceName(resourceName)} is not defined in the configuration.`
    };
  },
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
  e4(_arg: null): ReturnedError {
    return {
      type: 'BUDGET',
      message: 'Budget control is not enabled for your AWS account.',
      hint: [
        `To enable budget control for stacks in your account, please complete the tutorial at ${tuiManager.colorize(
          'yellow',
          'https://docs.stacktape.com/user-guides/enabling-budgeting'
        )}.`,
        'If you already completed the tutorial, it can take up to 24 hours to become available.'
      ]
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
  e8(): ReturnedError {
    return {
      type: 'NOT_YET_IMPLEMENTED',
      message: 'This command is not yet implemented'
    };
  },
  e10({ functionName }: { functionName: string }): ReturnedError {
    return {
      type: 'CONFIG',
      message: `Lambda function ${tuiManager.prettyResourceName(functionName)} must have ${tuiManager.prettyConfigProperty(
        'handler'
      )} property specified when using custom-artifact packaging type.`
    };
  },
  e11({ functionName }: { functionName: string }): ReturnedError {
    return {
      type: 'CONFIG',
      message: `Lambda function ${tuiManager.prettyResourceName(
        functionName
      )} must set ${tuiManager.prettyConfigProperty('runtime')} when using custom-artifact packaging type.`
    };
  },
  e12(): ReturnedError {
    return {
      type: 'CLI',
      message: 'Invalid options provided.',
      hint: [
        `For sync via config, provide both ${tuiManager.prettyOption('stage')} and ${tuiManager.prettyOption(
          'resourceName'
        )}. Bucket ID is resolved from the deployed stack and directory from your config.`,
        `For sync by bucket ID, provide ${tuiManager.prettyOption('bucketId')} (AWS physical ID or bucket name) and ${tuiManager.prettyOption(
          'sourcePath'
        )}. If the bucket is deployed by Stacktape, you can get the bucket ID using ${tuiManager.prettyCommand(
          'stack:info'
        )}.`
      ]
    };
  },
  e13({ directoryPath }): ReturnedError {
    return {
      type: 'CLI',
      message: `Directory ${tuiManager.prettyFilePath(directoryPath)} is not accessible or is not a directory.`
    };
  },
  e14({ configPath }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `File ${tuiManager.prettyFilePath(configPath)} doesn't exist or is not accessible.`
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
        'This command requires a Stacktape config. Provide it in one of these ways:',
        ` - Stacktape auto-detects config files named ${VALID_CONFIG_PATHS.map(tuiManager.makeBold).join(', ')} in your project root.`,
        ` - Specify the config path using ${tuiManager.prettyOption('configPath')}.`,
        ` - Specify a console template ID using ${tuiManager.prettyOption('templateId')}.`
      ].join('\n'),
      hint: [
        // ...hintMessages.configPathHint(),
        `Either manually create your stacktape configuration, or use ${tuiManager.prettyCommand(
          'init'
        )}.\nThe ${tuiManager.prettyCommand(
          'init'
        )} command can bootstrap config for your project or pick a starter template.`
      ]
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
  e19({ directoryPath }): ReturnedError {
    return {
      type: 'SYNC_BUCKET',
      message: `Directory ${tuiManager.prettyFilePath(directoryPath)} doesn't exist or is not accessible.`
    };
  },
  e20({ scriptName }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Script ${tuiManager.makeBold(scriptName)} is not defined in the 'scripts' section of the configuration.`
    };
  },
  e21(_arg: null): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `You must set the ${tuiManager.makeBold('upstash')} provider in ${tuiManager.prettyConfigProperty(
        'providerConfig'
      )} when using ${tuiManager.colorize('cyan', 'upstash')} resources.`
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
  e23({ stpResourceName, stackName }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Upstash Redis database ${tuiManager.prettyResourceName(
        stpResourceName
      )} is already deployed in stack ${tuiManager.prettyStackName(
        stackName
      )} with TLS enabled.\nYou cannot disable TLS once it was enabled.`
    };
  },
  e24({ stpResourceName, stackName }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Upstash Redis database ${tuiManager.prettyResourceName(
        stpResourceName
      )} is already deployed in stack ${tuiManager.prettyStackName(
        stackName
      )} with multi-zone replication enabled.\nYou cannot disable multi-zone replication once it was enabled.`
    };
  },
  e25({ stpResourceName }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Strong consistency for Upstash Redis database ${tuiManager.prettyResourceName(
        stpResourceName
      )} can only be set during initial database creation.\nStrong consistency cannot be enabled/disabled during updates.`
    };
  },
  e26({ stpResourceName, stackName, currentNumberOfPartitions }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Upstash Kafka topic ${tuiManager.prettyResourceName(
        stpResourceName
      )} is already deployed in stack ${tuiManager.prettyStackName(
        stackName
      )} with ${tuiManager.makeBold(currentNumberOfPartitions)} partitions.\nYou cannot change partition count after creation.`
    };
  },
  e27({ stpResourceName, stackName, currentClusterId }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Upstash Kafka topic ${tuiManager.prettyResourceName(
        stpResourceName
      )} is already deployed in stack ${tuiManager.prettyStackName(
        stackName
      )} in cluster ${tuiManager.makeBold(currentClusterId)}.\nYou cannot change the cluster after creation.`
    };
  },
  e28({ stpResourceName, stackName, currentCleanupPolicy }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Upstash Kafka topic ${tuiManager.prettyResourceName(
        stpResourceName
      )} is already deployed in stack ${tuiManager.prettyStackName(
        stackName
      )} with cleanup policy ${tuiManager.makeBold(
        currentCleanupPolicy
      )}.\nYou cannot change cleanup policy after creation.`
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
    command
  }: {
    stackName: string;
    organizationName: string;
    awsAccountName: string;
    command: StacktapeCommand;
  }): ReturnedError {
    return {
      type: 'NON_EXISTING_STACK',
      message: `Cannot retrieve stack details for ${tuiManager.prettyStackName(stackName)}. Stack not found.`,
      hint: [
        ...hintMessages.incorrectAwsAccount({ organizationName, awsAccountName }),
        ...(command === 'stack:info'
          ? [
              `When using ${tuiManager.prettyCommand(
                command
              )} for a non-deployed stack, provide config and use ${tuiManager.prettyOption(
                'detailed'
              )} to see what would be created.`
            ]
          : [])
      ]
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
  e33({ region }: { region: string }): ReturnedError {
    return {
      type: 'BUDGET',
      message: `Using budget control is not currently supported for this region (${tuiManager.makeBold(region)}).`
    };
  },
  e34(_arg: null): ReturnedError {
    return {
      type: 'MISSING_PREREQUISITE',
      message: 'To use this starter project, install Node.js and a JavaScript package manager (yarn, npm, or pnpm).'
    };
  },
  e35({ err }): ReturnedError {
    return {
      type: 'CLI',
      message: `Failed to install dependencies. Error:\n${err}`
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
      message: `Referenced resource with name ${tuiManager.prettyResourceName(stpResourceName)}${
        stpResourceType ? ` of type ${tuiManager.prettyResourceType(stpResourceType as StpResourceType)}` : ''
      } could not be resolved in the config (referenced from ${tuiManager.prettyResourceName(referencedFrom)}${
        referencedFromType ? `(${tuiManager.prettyResourceType(referencedFromType as StpResourceType)})` : ''
      }).`,
      hint:
        validResourcePath && invalidRestResourcePath
          ? [
              `Resource ${tuiManager.prettyResourceName(validResourcePath)} does not contain nested resource "${
                invalidRestResourcePath.split('.')[0]
              }"`
            ].concat(
              possibleNestedResources.length
                ? `Possible nested resources: ${possibleNestedResources.map(tuiManager.prettyResourceName).join(', ')}`
                : []
            )
          : incorrectResourceType
            ? `Referenced resource does not have the correct type (${tuiManager.prettyResourceType(
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
      message: `Domain ${tuiManager.makeBold(domainName)} is not a valid root domain name.`,
      hint: `When using ${tuiManager.prettyCommand(
        'domain:add'
      )}, enter the apex (root) domain, e.g. ${tuiManager.colorize('blue', 'example.com')} or ${tuiManager.colorize(
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
      message: `No suitable TLS certificate found for domain ${tuiManager.makeBold(fullDomainName)} in region ${region}.\n`,
      hint: [
        'Depending on your goal:',
        `1. If you want Stacktape to manage DNS and TLS certificates, run ${tuiManager.prettyCommand(
          'domain:add'
        )} to see next steps.`,
        `2. If you want to use a custom certificate, set ${tuiManager.prettyConfigProperty('customCertificateArn')}.`,
        'Refer to Stacktape docs for more information: https://docs.stacktape.com/other-resources/domains-and-certificates/'
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
        `Run ${tuiManager.prettyCommand('domain:add')} to refresh status and see next steps.`,
        'If you added the domain recently, validation can take a few minutes.'
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
      message: `Cannot use domain ${tuiManager.makeBold(
        fullDomainName
      )} with automatically generated Stacktape certificate.\nCurrently, the automatically generated certificate for the domain ${tuiManager.makeBold(
        getApexDomain(fullDomainName)
      )} does not support more than one level of subdomain.`,
      hint: [
        `Until we resolve this limitation, you can manually create your certificate here: ${tuiManager.colorize(
          'blue',
          consoleLinks.createCertificateUrl(attachingTo, region)
        )} and reference it using ${tuiManager.prettyConfigProperty('customCertificateArn')}.`,
        `You can try using alternative domain name such as ${tuiManager.colorize(
          'blue',
          [domainLevelSplit.slice(0, -2).join('-'), domainLevelSplit.slice(-2).join('.')].join('.')
        )}`
      ]
    };
  },
  e42({ stpLoadBalancerName }: { stpLoadBalancerName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in application-load-balancer ${tuiManager.makeBold(
        stpLoadBalancerName
      )}.\nYou cannot use property ${tuiManager.makeBold('listeners')} in combination with property ${tuiManager.makeBold(
        'useHttps'
      )}`,
      hint: [
        `Property ${tuiManager.makeBold(
          'useHttps'
        )} only takes effect if you do NOT specify listeners and default listeners are used.`
      ]
    };
  },
  e43({ stpLoadBalancerName }: { stpLoadBalancerName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in application-load-balancer ${tuiManager.makeBold(
        stpLoadBalancerName
      )}.\nIf you specify property ${tuiManager.makeBold('useHttps')}, you also need to specify ${tuiManager.makeBold(
        'customDomain'
      )}. This is due to TLS certificates.`,
      hint: [
        ...hintMessages.buyDomainHint(),
        `Optionally you can configure your own listeners with your custom certificates using ${tuiManager.makeBold(
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
        `Error in ${referencedFromType ? `${referencedFromType} ` : ''}resource ${tuiManager.makeBold(
          referencedFrom
        )} when referencing application-load-balancer ${tuiManager.makeBold(stpLoadBalancerName)}.\n` +
        `You cannot specify ${tuiManager.makeBold(
          'listenerPort'
        )} property when application-load-balancer does not use custom ${tuiManager.makeBold('listeners')}.`
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
        `Error in ${referencedFromType || ''} resource ${tuiManager.makeBold(referencedFrom)}.\n` +
        `Referenced application-load-balancer ${tuiManager.makeBold(
          stpLoadBalancerName
        )} does NOT have listener on port ${tuiManager.makeBold(listenerPort)}.`
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
        `Error in ${referencedFromType ? `${referencedFromType} ` : ''}resource ${tuiManager.makeBold(
          referencedFrom
        )} when referencing application-load-balancer ${tuiManager.makeBold(stpLoadBalancerName)}.\n` +
        `You need to specify ${tuiManager.makeBold(
          'listenerPort'
        )} property when application-load-balancer uses custom ${tuiManager.makeBold('listeners')}.`
    };
  },
  e47({ fullDomainName, associations }: { fullDomainName: string; associations: string[] }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `You are trying to associate single domain (${tuiManager.makeBold(
        fullDomainName
      )}) to multiple resources.\nAssociated resources: ${associations
        .map((resource) => `${tuiManager.makeBold(resource)}`)
        .join(', ')}`,
      hint: 'Single domain can be associated only to single resource.'
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
              ? `Change name servers to following values \n${tuiManager.colorize(
                  'cyan',
                  desiredNameServers.map((ns) => `- ${ns}`).join('\n')
                )}`
              : ''
          ),
        `Use command ${tuiManager.prettyCommand(
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
      message: `Resource ${tuiManager.prettyResourceName(resourceName)} of type ${tuiManager.prettyResourceType(
        resourceType
      )} can't run in development mode.`,
      hint: 'At the moment, you can locally run only lambda functions and container workloads.'
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
  e54({
    stpResourceName,
    resourceType
  }: {
    stpResourceName: string;
    resourceType: StpContainerWorkload['configParentResourceType'];
  }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType(resourceType)} ${tuiManager.prettyResourceName(
        stpResourceName
      )}: The compute resource must use application-load-balancer ${tuiManager.makeBold(
        'event'
      )} integration to use ${tuiManager.prettyConfigProperty('deployment')}.`
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
      message: `Alarm ${tuiManager.makeBold(alarmReference)} referenced from ${tuiManager.makeBold(referencedFrom)} ${
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
      message: `Error in ${tuiManager.prettyResourceType(resourceType)} ${tuiManager.makeBold(
        stpResourceName
      )}: Only one container of compute resource can be targeted by exactly one application-load-balancer listener when using ${tuiManager.makeBold(
        'deployment'
      )} property.`
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
  e63({
    phase,
    phaseStatus,
    message,
    projectName,
    invocationId,
    stage
  }: {
    phase: string;
    phaseStatus: string;
    message: string;
    projectName: string;
    invocationId: string;
    stage: string;
  }): ReturnedError {
    return {
      type: 'CODEBUILD',
      message: `Start of codebuild deployment failed in phase ${tuiManager.makeBold(phase)} with status ${tuiManager.colorize(
        'red',
        phaseStatus
      )} before logs could be retrieved.${message ? `\nAdditional message: ${message}.` : ''}`,
      hint: `Deployment logs: https://console.stacktape.com/projects/${projectName}/${stage}/deployment-detail/${invocationId}?tab=logs`
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
  e68({
    accountInfo,
    organizationName
  }: {
    accountInfo: GlobalStateConnectedAwsAccount;
    organizationName: string;
  }): ReturnedError {
    return {
      type: 'AWS_ACCOUNT',
      message: `AWS account ${tuiManager.makeBold(accountInfo.name)} (account id: ${
        accountInfo.awsAccountId
      }) connected to your organization ${tuiManager.makeBold(organizationName)} is currently in ${tuiManager.makeBold(
        accountInfo.state
      )} state and cannot be used.`,
      hint:
        accountInfo.state === 'PENDING'
          ? [
              `Please finalize account connecting in the ${tuiManager.getLink(
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
      message: `AWS credentials (retrieved via ${tuiManager.makeBold(credentials.source)}${
        credentials.source === 'credentialsFile' ? ` - profile "${profile}"` : ''
      }) do not belong to the target AWS account ${tuiManager.makeBold(accountInfo.name)}(id: ${
        accountInfo.awsAccountId
      }). Retrieved credentials originated from ${tuiManager.makeBold(
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
      message: `Error in construct ${tuiManager.makeBold(
        constructName
      )}: Unable to import construct class (export "${tuiManager.makeBold(
        constructExportName
      )}") exported from file ${tuiManager.makeBold(constructFilePath)}.\nRoot cause: ${rootError}`,
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
      message: `Error in construct ${tuiManager.makeBold(constructName)}: Export "${tuiManager.makeBold(
        constructExportName
      )}" from file ${tuiManager.makeBold(constructFilePath)} is not a valid construct.`,
      hint: 'Are you sure you are referencing correct export?'
    };
  },
  e72({ constructName, rootError }: { constructName: string; rootError: Error }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error when synthesizing CDK construct ${tuiManager.makeBold(constructName)}\nRoot cause: ${rootError}`
    };
  },
  e73({ constructName, constructClassName }: { constructName: string; constructClassName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `AWS CDK construct ${tuiManager.makeBold(
        constructName
      )} is of type (${constructClassName} extends Stack). Currently, we do not allow using "Stack" constructs in ${tuiManager.makeBold(
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
      message: `Error in construct ${tuiManager.makeBold(
        constructName
      )}: Unable to instantiate imported construct class (export "${tuiManager.makeBold(
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
      message: `Error in ${tuiManager.prettyResourceType(workloadType)} ${tuiManager.makeBold(
        workloadName
      )}: Property "${tuiManager.makeBold('deployment')}" cannot be used when using "service-connect" events.`
    };
  },
  e76({ stackName, command }: { stackName: string; command: StacktapeCommand }): ReturnedError {
    return {
      type: 'STACK',
      message: `Cannot execute command ${tuiManager.prettyCommand(command)} on stack ${tuiManager.makeBold(
        stackName
      )} at the moment because the stack is in "${tuiManager.makeBold('DELETE_FAILED')}" state.`,
      hint: [`Delete the stack fully using ${tuiManager.prettyCommand('delete')} before retrying the command.`]
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
      message: `Parameter ${tuiManager.prettyConfigProperty(
        resourceParamName
      )} is not referenceable on the resource ${tuiManager.prettyResourceName(
        resourceName
      )} of type ${tuiManager.prettyResourceType(resourceType)}.`,
      hint: [
        `Referenceable params of the resource: ${referenceableParams
          .map((param) => tuiManager.prettyConfigProperty(param))
          .join(', ')}.`
      ]
    };
  },
  e79({ webServiceName }: { webServiceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('web-service')} ${tuiManager.prettyResourceName(
        webServiceName
      )}. When using ${tuiManager.prettyConfigProperty(
        'deployment'
      )} property, you must use load balancing type "application-load-balancer".`
    };
  },
  e80({ webServiceName }: { webServiceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('web-service')} ${tuiManager.prettyResourceName(
        webServiceName
      )}. You can only use ${tuiManager.prettyConfigProperty(
        'alarms'
      )} compatible with web service load balancing type (i.e ${tuiManager.prettyResourceType(
        'application-load-balancer'
      )} alarms for ${tuiManager.prettyResourceType('application-load-balancer')} and ${tuiManager.prettyResourceType(
        'http-api-gateway'
      )} alarms for ${tuiManager.prettyResourceType('http-api-gateway')}).`
    };
  },
  e81({ stpSqsQueueName }: { stpSqsQueueName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('sqs-queue')} ${tuiManager.prettyResourceName(
        stpSqsQueueName
      )}. Properties ${tuiManager.prettyConfigProperty('fifoHighThroughput')} and ${tuiManager.prettyConfigProperty(
        'contentBasedDeduplication'
      )} can only be used when fifo is enabled(property ${tuiManager.prettyConfigProperty(
        'fifoEnabled'
      )} is set to ${tuiManager.makeBold('true')}).`
    };
  },
  e82({ stpSqsQueueName }: { stpSqsQueueName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('sns-topic')} ${tuiManager.prettyResourceName(
        stpSqsQueueName
      )}. Property ${tuiManager.prettyConfigProperty(
        'contentBasedDeduplication'
      )} can only be used when fifo is enabled(property ${tuiManager.prettyConfigProperty(
        'fifoEnabled'
      )} is set to ${tuiManager.makeBold('true')}).`
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
      message: `Error in ${tuiManager.prettyResourceType(eventBusReferencerStpType)} ${tuiManager.prettyResourceName(
        eventBusReferencerStpName
      )}. When referencing event bus you must specify exactly one of ${tuiManager.prettyConfigProperty(
        'eventBusName'
      )}, ${tuiManager.prettyConfigProperty('eventBusArn')} or ${tuiManager.prettyConfigProperty(
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
        `Error in ${tuiManager.prettyResourceType(workloadType)} ${tuiManager.makeBold(
          workloadName
        )}: When configuring ${tuiManager.prettyConfigProperty('resources')} you must choose one of:`,
        `1. Specify ${tuiManager.prettyConfigProperty('cpu')} and ${tuiManager.prettyConfigProperty(
          'memory'
        )} properties only (FARGATE launch type will be used).`,
        `2. Specify ${tuiManager.prettyConfigProperty(
          'instanceTypes'
        )} property (EC2 launch type will be used). You can optionally also configure ${tuiManager.prettyConfigProperty(
          'cpu'
        )} and ${tuiManager.prettyConfigProperty('memory')}`
      ].join('\n'),
      hint: [
        `See resource docs to learn more: https://docs.stacktape.com/compute-resources/${workloadType}s/#resources`
      ]
    };
  },
  e88({ domainName }: { domainName: string }): ReturnedError {
    return {
      type: 'DOMAIN_MANAGEMENT',
      message: `Cannot use domain name ${tuiManager.makeBold(domainName)}. DNS records of the domain ${tuiManager.makeBold(
        getApexDomain(domainName)
      )} are not under control of your AWS account or the domain was not yet configured to be used with Stacktape.`,
      hint: [
        'Depending on your goal:',
        `1. If you want Stacktape to be able to manage your domain names (DNS) and TLS certificates, run command ${tuiManager.prettyCommand('domain:add')} to see next steps.`,
        `2. If you wish to manage DNS records on your own, set ${tuiManager.prettyConfigProperty('disableDnsRecordCreation')} to ${tuiManager.makeBold('true')} and specify ${tuiManager.prettyConfigProperty('customCertificateArn')}`,
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
      message: `Error in ${tuiManager.prettyResourceType(workloadType)} ${tuiManager.makeBold(
        workloadName
      )}: When configuring ${tuiManager.prettyConfigProperty('scaling')} you must specify ${tuiManager.prettyConfigProperty(
        'maxInstances'
      )} property(it also must be higher or equal to ${tuiManager.prettyConfigProperty('minInstances')}).`
    };
  },
  // e90(_arg: null): ReturnedError {
  //   return {
  //     type: 'CLI',
  //     message: `You must specify one of:\n1. ${tuiManager.prettyOption('stackName')} option\n2. ${tuiManager.prettyOption(
  //       'stage'
  //     )} and ${tuiManager.prettyOption('configPath')} options.`,
  //     hint: `If you use ${tuiManager.prettyOption('stage')} and ${tuiManager.prettyOption(
  //       'configPath'
  //     )} options, stack name will be derived from the supplied configuration. If you use ${tuiManager.prettyOption(
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
      message: `Error in ${tuiManager.prettyResourceType(workloadType)} ${tuiManager.prettyResourceName(workloadName)}:
You have specified ${tuiManager.makeBold('app_variable')} "${appVariable}" in your ${tuiManager.prettyConfigProperty(
        'entryfilePath'
      )}. In this case, you must also specify ${tuiManager.prettyConfigProperty(
        'runAppAs'
      )} property in the ${tuiManager.prettyConfigProperty('languageSpecificConfig')}`
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
      message: `Error in event integrations of ${tuiManager.prettyResourceType(
        'http-api-gateway'
      )} ${tuiManager.prettyResourceName(
        stpHttpApiGatewayName
      )}. Events on two different resources(${tuiManager.prettyResourceName(
        stpResourceName1
      )} and ${tuiManager.prettyResourceName(stpResourceName2)}) are using the same ${tuiManager.prettyConfigProperty(
        'path'
      )} and ${tuiManager.prettyConfigProperty('method')} which is not allowed.`
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
      message: `Error in event integrations of ${tuiManager.prettyResourceType(
        'application-load-balancer'
      )} ${tuiManager.prettyResourceName(
        stpApplicationLoadBalancerName
      )}. Events on two different resources(${tuiManager.prettyResourceName(
        stpResourceName1
      )} and ${tuiManager.prettyResourceName(stpResourceName2)}) are using the same ${tuiManager.prettyConfigProperty(
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
      message: `Error in ${tuiManager.makeBold('script')}. You cannot use script of type ${tuiManager.makeBold(
        scriptType
      )} if resource of type ${tuiManager.prettyResourceType('bastion')} does not exist in the config.`
    };
  },
  e95({ stpResourceName }: { stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.makeBold('bastion tunnel')}. Resource ${tuiManager.prettyResourceName(
        stpResourceName
      )} cannot be targeted by bastion tunnel.\nOnly the following resource types can be used as a target for bastion tunnel: ${(
        [
          'relational-database',
          'redis-cluster',
          'application-load-balancer',
          'private-service (with loadBalancing type application-load-balancer)'
        ] as StpResourceType[]
      )
        .map(tuiManager.prettyResourceType)
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
    command: Subtype<StacktapeCommand, 'deploy' | 'delete' | 'dev' | 'rollback' | 'deployment-script:run'>;
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
        )} operation, stack must be in one of the following states: ${(command === 'rollback'
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
          STACK_IS_READY_FOR_ROLLBACK_OPERATION_STATUS.includes(stackStatus)
            ? [
                `To rollback your stack to previously working state, try using ${tuiManager.prettyCommand(
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
      message: `Cloudformation resource "${cfLogicalName}" is not a valid child resource of stacktape resource ${tuiManager.prettyResourceName(
        stpResourceName
      )}.\nValid child resources are: ${childResources.join(', ')}.`
    };
  },
  e102({ functionName }: { functionName: string }): ReturnedError {
    return {
      type: 'CONFIG',
      message: `${tuiManager.prettyConfigProperty('Handler')} property of lambda function ${tuiManager.prettyResourceName(
        functionName
      )} has invalid format.`,
      hint: `Handler must be in shape ${tuiManager.makeBold('{{filePath}}:{{handlerFunction}}')}`
    };
  },
  e103(_arg: null): ReturnedError {
    return {
      type: 'INPUT',
      message: `Invalid arguments. Please specify ${tuiManager.prettyOption('projectName')} option.`
    };
  },
  e104({ serviceName }: { serviceName: string }): ReturnedError {
    return {
      type: 'CONFIG',
      message: `Using ${tuiManager.prettyConfigProperty(
        'serviceName'
      )} in your config is deprecated. Use ${tuiManager.prettyOption(
        'projectName'
      )} instead (e.g. ${tuiManager.prettyOption('projectName')} ${serviceName}).`,
      hint: `Use your current ${tuiManager.prettyConfigProperty(
        'serviceName'
      )} value as ${tuiManager.prettyOption('projectName')} to keep using the same stack.`
    };
  },
  e105({ stpResourceName }: { stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceName(stpResourceName)} (${tuiManager.prettyResourceType('nextjs-web')}) Cannot use edge lambdas ${tuiManager.prettyConfigProperty('useEdgeLambda')} together with streaming responses ${tuiManager.prettyConfigProperty('streamingEnabled')}.`
    };
  },
  e106({ directoryPath, stpResourceName }: { directoryPath: string; stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceName(stpResourceName)} resource: Specified directory "${tuiManager.prettyFilePath(directoryPath)}" is not accessible or not a directory.`
    };
  },
  e107({ directoryPath, stpResourceName }: { directoryPath: string; stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceName(stpResourceName)} resource: Specified directory "${tuiManager.prettyFilePath(directoryPath)}" does not seem to contain Next.js project (does not contain next.config.(js/ts)).`
    };
  },
  e108({ reason, command }: { reason?: string; command: StacktapeCommand }) {
    return {
      type: 'CONFIRMATION_REQUIRED',
      message: `Operation ${tuiManager.prettyCommand(command)} requires confirmation.${reason ? `Reason:\n${reason}` : ''} `,
      hint: `To automatically provide confirmation use auto-confirm option (${tuiManager.prettyOption('autoConfirmOperation')}) during this operation.`
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
      message: `Error in ${tuiManager.prettyResourceType(eventBusReferencerStpType)} ${tuiManager.prettyResourceName(
        eventBusReferencerStpName
      )}. When using ${tuiManager.prettyConfigProperty(
        'onDeliveryFailure'
      )} for event bus integration, you must specify exactly one of ${tuiManager.prettyConfigProperty(
        'sqsQueueName'
      )} or ${tuiManager.prettyConfigProperty('sqsQueueArn')} properties.`
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
      )}. You must specify engine ${tuiManager.prettyConfigProperty('version')} in engine properties.${currentDatabaseVersion ? `Currently, your database uses version ${tuiManager.colorize('gray', currentDatabaseVersion, true)}.\nOther available versions are:` : '\nAvailable versions are:'} ${availableVersions
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
  e112({ sqsQueueReferencerStpName }: { sqsQueueReferencerStpName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('sqs-queue')} ${tuiManager.prettyResourceName(
        sqsQueueReferencerStpName
      )}. When referencing target sqs queue in redrive policy, you must specify exactly one of ${tuiManager.prettyConfigProperty(
        'targetSqsQueueName'
      )} or ${tuiManager.prettyConfigProperty('targetSqsQueueArn')} properties.`
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
  e115({ stpResourceName }: { stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: [
        `Error in ${tuiManager.prettyResourceType('open-search-domain')} resource ${tuiManager.prettyResourceName(stpResourceName)}:`,
        `Data node instance count (property ${tuiManager.prettyConfigProperty('clusterConfig.instanceCount')}) must be higher than 1 to enable MultiAZ awareness (property ${tuiManager.prettyConfigProperty('multiAzEnabled')}).`
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
      message: `Error in network load-balancer ${tuiManager.prettyResourceName(
        stpLoadBalancerName
      )}. Listener with port ${port} has ${referencingWorkloadNames.length} integrations (${referencingWorkloadNames.join(
        ', '
      )}). Each network load balancer listener must have exactly one integration.`
    };
  },
  e117({ webServiceName }: { webServiceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('web-service')} ${tuiManager.prettyResourceName(
        webServiceName
      )}. CDN can only be used with web services that use ${tuiManager.prettyConfigProperty('http-api-gateway')} (default) or ${tuiManager.prettyConfigProperty('application-load-balancer')} load balancing types.`
    };
  },
  e118({ webServiceName }: { webServiceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('web-service')} ${tuiManager.prettyResourceName(
        webServiceName
      )}. If you disable DNS record creation for your domain, you must specify ${tuiManager.prettyConfigProperty('customCertificateArn')} property.`
    };
  },
  e119({ containerResourceName }: { containerResourceName: string }): ReturnedError {
    return {
      type: 'NON_EXISTING_RESOURCE',
      message: `Error when running ${tuiManager.prettyCommand('container:session')}. Resource ${tuiManager.prettyResourceName(
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
      message: `Error when running ${tuiManager.prettyCommand('container:session')}. Resource ${tuiManager.prettyResourceName(
        containerResourceName
      )} contains the following containers: ${availableContainers
        .map((name) => tuiManager.makeBold(name))
        .join(', ')}. Specify which container to connect to using ${tuiManager.prettyOption('container')}.`
    };
  },
  e121({ lambdaStpResourceName }: { lambdaStpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('function')} ${tuiManager.prettyResourceName(lambdaStpResourceName)}: When using ${tuiManager.prettyConfigProperty(
        'volumeMounts'
      )}, the property ${tuiManager.prettyConfigProperty('joinDefaultVpc')} must be set to ${tuiManager.makeBold('true')}.`,
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
      message: `Cannot retrieve execution role for resource ${tuiManager.prettyResourceName(stpResourceName)} of type ${tuiManager.prettyResourceType(stpResourceType)}.`,
      hint: `Supported resource types are: ${supportedResourceTypes.map((type) => tuiManager.prettyResourceType(type)).join(', ')}.`
    };
  },
  e123({ stpResourceName }: { stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('relational-database')} ${tuiManager.prettyResourceName(stpResourceName)}. Preferred maintenance window must be in format "day:hour:minute-day:hour:minute" (e.g. ${tuiManager.makeBold('Sun:02:00-Sun:04:00')}).`
    };
  },
  e124({ stpResourceName }: { stpResourceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('nextjs-web')} ${tuiManager.prettyResourceName(stpResourceName)}. You cannot use ${tuiManager.prettyConfigProperty('joinDefaultVpc')} property when using edge lambda.`
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
      message: `Error in ${tuiManager.prettyResourceType(stpResourceType)} ${tuiManager.prettyResourceName(stpResourceName)}. Property ${tuiManager.prettyConfigProperty('enableWarmPool')} can only be used when you specify exactly one instance type in ${tuiManager.prettyConfigProperty('instanceTypes')}. Warm pools are not supported with mixed instance types.`
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
      message: `Error in ${tuiManager.prettyResourceType(stpResourceType)} ${tuiManager.prettyResourceName(stpResourceName)}. Property ${tuiManager.prettyConfigProperty('cpuArchitecture')} cannot be used when ${tuiManager.prettyConfigProperty('instanceTypes')} is specified.`,
      hint: `Property ${tuiManager.prettyConfigProperty('cpuArchitecture')} is only used when using Fargate launch type (when ${tuiManager.prettyConfigProperty('instanceTypes')} is not specified). When using EC2 launch type, CPU architecture is determined by the instance type.`
    };
  },
  e127({ stpLoadBalancerName }: { stpLoadBalancerName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `No valid target container services found for load balancer ${tuiManager.prettyResourceName(stpLoadBalancerName)}. Cannot create unhealthy targets alarm.`
    };
  },
  e128({ configPath }: { configPath: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `When loading config from ${tuiManager.prettyFilePath(configPath)}: Export ${tuiManager.makeBold('getConfig')} must be a function.`
    };
  },
  e129({ configPath, config }: { configPath: string; config: any }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Could not load valid config object from file ${tuiManager.prettyFilePath(configPath)}. Returned value: ${config}`
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
  e504({ sourceCodePath }: { sourceCodePath: string }): ReturnedError {
    return {
      type: 'CONFIG_GENERATION',
      message: `No suitable Stacktape configuration can be generated for project in ${tuiManager.prettyFilePath(
        sourceCodePath
      )}.`
    };
  },
  e505({ sourceCodePath }: { sourceCodePath: string }): ReturnedError {
    return {
      type: 'CONFIG_GENERATION',
      message: `The specified directory (${tuiManager.prettyFilePath(
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
      message: `Using ${tuiManager.makeBold(feature)} requires ${missingLibs.join(', ')} to be installed in the project.`
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
      message: `Can't find template with ID ${templateId}.`
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
      message: `Error in ${tuiManager.prettyResourceType(workloadType)} ${tuiManager.prettyResourceName(workloadName)}:
If you want to run the app as WSGI/ASGI, specify the app variable (WSGI/ASGI callable) in ${tuiManager.prettyConfigProperty(
        'entryfilePath'
      )}, e.g. ${tuiManager.prettyFilePath(`${entryfilePath}:<<app_variable>>`)}.`,
      hint: `${tuiManager.makeBold('Typical paths')} for common frameworks:
Django: ${tuiManager.prettyFilePath('project/asgi.py:application')}
Flask: ${tuiManager.prettyFilePath('project/app.py:application')}
FastAPI: ${tuiManager.prettyFilePath('project/main.py:app')}`
    };
  },
  e1002({ workloadType, workloadName }: { workloadType: StpResourceType; workloadName: string }): ReturnedError {
    return {
      type: 'PACKAGING_CONFIG',
      message: `Error in ${tuiManager.prettyResourceType(workloadType)} ${tuiManager.prettyResourceName(workloadName)}:
Property ${tuiManager.prettyConfigProperty('runAppAs')} can be specified only for ${tuiManager.prettyConfigProperty(
        'stacktape-image-buildpack'
      )} packaging type.`
    };
  },
  e1003({ webServiceName }: { webServiceName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('web-service')} ${tuiManager.prettyResourceName(
        webServiceName
      )}. You can only use ${tuiManager.prettyConfigProperty('useFirewall')} with ${tuiManager.prettyResourceType(
        'application-load-balancer'
      )} load balancing type.`
    };
  },
  e1004({ firewallName }: { firewallName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Error in ${tuiManager.prettyResourceType('web-app-firewall')} ${tuiManager.prettyResourceName(
        firewallName
      )}. Firewall with ${tuiManager.prettyConfigProperty(
        'scope: cdn'
      )} can't be used with regional resources without CDN, and firewall with ${tuiManager.prettyConfigProperty(
        'scope: regional'
      )} can't be used with resources using CDN.`
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
  e131({ stackName }: { stackName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Stack cannot reuse VPC from stack ${tuiManager.prettyStackName(
        stackName
      )} because no valid VPC was found.`,
      hint: 'You can only reuse VPC from other Stacktape stacks that have been deployed.'
    };
  },
  e132(_arg: null): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Invalid ${tuiManager.prettyConfigProperty(
        'stackConfig.vpc.reuseVpc'
      )} configuration. Specify either ${tuiManager.prettyConfigProperty('vpcId')} or both ${tuiManager.prettyConfigProperty(
        'projectName'
      )} and ${tuiManager.prettyConfigProperty('stage')}, but not both methods.`
    };
  },
  e133({ vpcId, foundCount }: { vpcId: string; foundCount: number }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `VPC ${tuiManager.makeBold(vpcId)} does not have enough public subnets. Found ${tuiManager.makeBold(
        String(foundCount)
      )}; at least ${tuiManager.makeBold('3')} are required.`,
      hint: 'Public subnets are identified by having a route to an Internet Gateway (0.0.0.0/0 -> igw-*) in their associated route table.'
    };
  },
  e134({ vpcId, cidrBlock }: { vpcId: string; cidrBlock: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `VPC ${tuiManager.makeBold(vpcId)} has an invalid CIDR block ${tuiManager.makeBold(
        cidrBlock
      )}. VPC must use a private IP range.`,
      hint: `Valid private IP ranges are: ${tuiManager.makeBold('10.0.0.0/8')}, ${tuiManager.makeBold('172.16.0.0/12')}, and ${tuiManager.makeBold('192.168.0.0/16')} (RFC 1918).`
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
      message: `VPC ${tuiManager.makeBold(vpcId)} does not have enough private subnets. Found ${tuiManager.makeBold(
        String(foundCount)
      )}; at least ${tuiManager.makeBold('2')} are required when resources use ${tuiManager.prettyConfigProperty(
        'usePrivateSubnetsWithNAT'
      )}.`,
      hint: `The following resources require private subnets: ${requiringResources.map((r) => tuiManager.prettyResourceName(r)).join(', ')}. Private subnets are identified by NOT having a direct route to an Internet Gateway in their route table.`
    };
  },
  e136({ configPath, packageName }: { configPath: string; packageName: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Cannot find package ${tuiManager.makeBold(packageName)} when loading config from ${tuiManager.prettyFilePath(configPath)}.`,
      hint: `Install it with ${tuiManager.makeBold(`npm install ${packageName}`)} or ${tuiManager.makeBold(
        `bun add ${packageName}`
      )}.`
    };
  },
  e137({ configPath, errorMessage }: { configPath: string; errorMessage: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Syntax error in TypeScript config ${tuiManager.prettyFilePath(configPath)}.`,
      hint: `Error details: ${errorMessage}`
    };
  },
  e138({ configPath, errorMessage }: { configPath: string; errorMessage: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Failed to execute TypeScript config ${tuiManager.prettyFilePath(configPath)}.`,
      hint: `Error details: ${errorMessage}`
    };
  },
  e139({ configPath }: { configPath: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `TypeScript config ${tuiManager.prettyFilePath(configPath)} must export a default function (using ${tuiManager.makeBold('defineConfig')}) or a ${tuiManager.makeBold('getConfig')} function.`,
      hint: `Example:\n${tuiManager.makeBold(`import { defineConfig } from 'stacktape';\nexport default defineConfig(({ stage }) => ({ resources: {} }));`)}`
    };
  },
  e140({ configPath, exportValue }: { configPath: string; exportValue: string }): ReturnedError {
    return {
      type: 'CONFIG_VALIDATION',
      message: `Config function in ${tuiManager.prettyFilePath(configPath)} must return an object, but returned ${tuiManager.makeBold(exportValue)}.`,
      hint: `Make sure your config function returns a valid Stacktape configuration object with at least a ${tuiManager.makeBold('resources')} property.`
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
After buying the domain, run the ${tuiManager.prettyCommand(
        'domain:add'
      )} to prepare the domain to be usable with Stacktape.`
    ];
  }
};

type ReturnedError = ArgType<typeof getError>;

export type ErrorCode = keyof typeof errors;
