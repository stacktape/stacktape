import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { RECORDED_STACKTAPE_COMMANDS } from '@config';
import { budgetManager } from '@domain-services/budget-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cloudformationRegistryManager } from '@domain-services/cloudformation-registry-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { cloudfrontManager } from '@domain-services/cloudfront-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { domainManager } from '@domain-services/domain-manager';
import { ec2Manager } from '@domain-services/ec2-manager';
import { notificationManager } from '@domain-services/notification-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { sesManager } from '@domain-services/ses-manager';
import { templateManager } from '@domain-services/template-manager';
import { thirdPartyProviderManager } from '@domain-services/third-party-provider-credentials-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { stpErrors } from '@errors';
import { redirectPlugin, retryPlugin } from '@shared/aws/sdk-manager/utils';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { dependencyInstaller } from '@shared/utils/dependency-installer';
import { settleAllBeforeThrowing } from '@shared/utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { getErrorHandler, loggingPlugin } from '@utils/aws-sdk-manager/utils';
import { logCollectorStream } from '@utils/log-collector';

export const initializeAllStackServices = async ({
  commandModifiesStack,
  commandRequiresDeployedStack,
  loadGlobalConfig,
  requiresSubscription
}: {
  commandModifiesStack?: boolean;
  commandRequiresDeployedStack?: boolean;
  loadGlobalConfig?: boolean;
  requiresSubscription?: boolean;
}) => {
  tuiManager.setHeader({
    action: globalStateManager.command === 'delete' ? 'DELETING' : 'DEPLOYING',
    projectName: globalStateManager.args.projectName || globalStateManager.targetStack?.projectName || 'project',
    stageName: globalStateManager.stage || 'stage',
    region: globalStateManager.region || 'region'
  });
  eventManager.setPhase('INITIALIZE');

  await loadUserCredentials();
  await recordStackOperationStart();

  if (requiresSubscription) {
    const { message, canDeploy } = await stacktapeTrpcApiManager.apiClient.canDeploy();
    if (!canDeploy) {
      throw stpErrors.e502({ message });
    }
  }
  await globalStateManager.loadTargetStackInfo();
  await configManager.init({ configRequired: true });

  if (loadGlobalConfig) {
    await configManager.loadGlobalConfig();
  }

  // Start the parent event for loading AWS metadata
  await eventManager.startEvent({
    eventType: 'LOAD_METADATA_FROM_AWS',
    description: 'Loading metadata from AWS',
    phase: 'INITIALIZE'
  });

  // we are using allSettled instead of all because we want all operations to finish before throwing (especially startStackOperationRecording)
  // at the same time we want to make execution as fast and parallel as possible
  await settleAllBeforeThrowing([
    stackManager.init({
      stackName: globalStateManager.targetStack.stackName,
      commandModifiesStack,
      commandRequiresDeployedStack,
      parentEventType: 'LOAD_METADATA_FROM_AWS'
    }),
    ec2Manager.init({
      instanceTypes: configManager.allUsedEc2InstanceTypes,
      openSearchInstanceTypes: configManager.allUsedOpenSearchVersionsAndInstanceTypes
    }),
    vpcManager.init({
      reuseVpc: configManager.reuseVpcConfig,
      resourcesRequiringPrivateSubnet: configManager.allResourcesRequiringPrivateSubnets
    }),
    budgetManager.init({ parentEventType: 'LOAD_METADATA_FROM_AWS' }),
    domainManager.init({
      stackName: globalStateManager.targetStack.stackName,
      domains: configManager.allUsedDomainsInConfig,
      fromParameterStore: true,
      parentEventType: 'LOAD_METADATA_FROM_AWS'
    }),
    startStackOperationRecording({
      stackName: globalStateManager.targetStack.stackName,
      projectName: globalStateManager.targetStack.projectName
    }),
    sesManager.init({ identities: configManager.allEmailsUsedInAlertNotifications }),
    thirdPartyProviderManager.init({
      requireAtlasCredentialsParameter: configManager.requireAtlasCredentialsParameter,
      requireUpstashCredentialsParameter: configManager.requireUpstashCredentialsParameter
    }),
    notificationManager.init(configManager.deploymentNotifications)
  ]);
  await Promise.all([
    templateManager.init({ stackDetails: stackManager.existingStackDetails }),
    deployedStackOverviewManager.init({
      stackDetails: stackManager.existingStackDetails,
      stackResources: stackManager.existingStackResources,
      budgetInfo: budgetManager.getBudgetInfoForSpecifiedStack({ stackName: globalStateManager.targetStack.stackName })
    }),
    calculatedStackOverviewManager.init(),
    cloudfrontManager.init(),
    deploymentArtifactManager.init({
      accountId: globalStateManager.targetAwsAccount.awsAccountId,
      globallyUniqueStackHash: globalStateManager.targetStack.globallyUniqueStackHash,
      stackActionType: stackManager.stackActionType,
      parentEventType: 'LOAD_METADATA_FROM_AWS'
    }),
    packagingManager.init(),
    cloudformationRegistryManager.init()
  ]);

  // Finish the parent event for loading AWS metadata
  await eventManager.finishEvent({ eventType: 'LOAD_METADATA_FROM_AWS' });

  await eventManager.registerHooks(configManager.hooks);
  if (globalStateManager.command !== 'codebuild:deploy') {
    await dependencyInstaller.install({
      rootProjectDirPath: globalStateManager.workingDir,
      progressLogger: eventManager
    });
  }
  await eventManager.processHooks({ captureType: 'START' });
};

export const initializeStackServicesForLocalResolve = async () => {
  await loadUserCredentials();
  await recordStackOperationStart();

  await globalStateManager.loadTargetStackInfo();
  await configManager.init({ configRequired: true });

  await settleAllBeforeThrowing([
    startStackOperationRecording({
      stackName: globalStateManager.targetStack.stackName,
      projectName: globalStateManager.targetStack.projectName
    }),
    stackManager.init({
      stackName: globalStateManager.targetStack.stackName,
      commandModifiesStack: false,
      commandRequiresDeployedStack: false
    }),
    vpcManager.init({
      reuseVpc: configManager.reuseVpcConfig,
      resourcesRequiringPrivateSubnet: configManager.allResourcesRequiringPrivateSubnets
    })
  ]);
  await notificationManager.init(configManager.deploymentNotifications);
  await Promise.all([
    templateManager.init({ stackDetails: stackManager.existingStackDetails }),
    deployedStackOverviewManager.init({
      stackDetails: stackManager.existingStackDetails,
      stackResources: stackManager.existingStackResources
    }),
    calculatedStackOverviewManager.init(),
    packagingManager.init()
  ]);
  await eventManager.registerHooks(configManager.hooks);
  await eventManager.processHooks({ captureType: 'START' });
};

export const initializeStackServicesForHotSwapDeploy = async () => {
  await loadUserCredentials();
  await recordStackOperationStart();

  await globalStateManager.loadTargetStackInfo();
  await configManager.init({ configRequired: true });

  await settleAllBeforeThrowing([
    startStackOperationRecording({
      stackName: globalStateManager.targetStack.stackName,
      projectName: globalStateManager.targetStack.projectName
    }),
    stackManager.init({
      stackName: globalStateManager.targetStack.stackName,
      commandModifiesStack: false,
      commandRequiresDeployedStack: false
    }),
    ec2Manager.init({
      instanceTypes: configManager.allUsedEc2InstanceTypes,
      openSearchInstanceTypes: configManager.allUsedOpenSearchVersionsAndInstanceTypes
    }),
    vpcManager.init({
      reuseVpc: configManager.reuseVpcConfig,
      resourcesRequiringPrivateSubnet: configManager.allResourcesRequiringPrivateSubnets
    })
  ]);
  await notificationManager.init(configManager.deploymentNotifications);
  await Promise.all([
    deployedStackOverviewManager.init({
      stackDetails: stackManager.existingStackDetails,
      stackResources: stackManager.existingStackResources
    }),
    calculatedStackOverviewManager.init(),
    packagingManager.init(),
    deploymentArtifactManager.init({
      globallyUniqueStackHash: globalStateManager.targetStack.globallyUniqueStackHash,
      accountId: globalStateManager.targetAwsAccount.awsAccountId,
      stackActionType: globalStateManager.command as any
    })
  ]);
  await eventManager.registerHooks(configManager.hooks);
  await eventManager.processHooks({ captureType: 'START' });
};

/**
 * Phase 1: Initialize credentials, config, and packagingManager.
 * This is enough to start building. Call phase 2 after (or in parallel) to fetch AWS stack data.
 */
export const initializeStackServicesForDevPhase1 = async () => {
  // Suppress eventManager logs - dev mode uses spinners instead
  eventManager.setSilentMode(true);

  await globalStateManager.loadUserCredentials();
  awsSdkManager.init({
    credentials: globalStateManager.credentials,
    region: globalStateManager.region,
    getErrorHandlerFn: getErrorHandler,
    plugins: [loggingPlugin, retryPlugin, redirectPlugin],
    printer: tuiManager
  });

  await globalStateManager.loadTargetStackInfo();
  await configManager.init({ configRequired: true });
  await packagingManager.init();
};

/**
 * Phase 2: Fetch AWS stack data (stackManager, deployedStackOverviewManager, deploymentArtifactManager).
 * Can run in parallel with build since it only needs credentials from phase 1.
 */
export const initializeStackServicesForDevPhase2 = async () => {
  await settleAllBeforeThrowing([
    stackManager.init({
      stackName: globalStateManager.targetStack.stackName,
      commandModifiesStack: false,
      commandRequiresDeployedStack: false
    }),
    vpcManager.init({
      reuseVpc: configManager.reuseVpcConfig,
      resourcesRequiringPrivateSubnet: configManager.allResourcesRequiringPrivateSubnets
    })
  ]);

  await Promise.all([
    deployedStackOverviewManager.init({
      stackDetails: stackManager.existingStackDetails,
      stackResources: stackManager.existingStackResources
    }),
    deploymentArtifactManager.init({
      accountId: globalStateManager.targetAwsAccount.awsAccountId,
      globallyUniqueStackHash: globalStateManager.targetStack.globallyUniqueStackHash,
      stackActionType: stackManager.stackActionType
    })
  ]);
};

export const initializeStackServicesForDev = async () => {
  await initializeStackServicesForDevPhase1();
  await initializeStackServicesForDevPhase2();
};

export const initializeStackServicesForWorkingWithDeployedStack = async ({
  commandModifiesStack,
  commandRequiresConfig
}: {
  commandModifiesStack: boolean;
  commandRequiresConfig: boolean;
}) => {
  await loadUserCredentials();
  await recordStackOperationStart();

  await globalStateManager.loadTargetStackInfo();
  await startStackOperationRecording({ stackName: globalStateManager.targetStack.stackName });

  await configManager.init({ configRequired: commandRequiresConfig });

  const stackName = globalStateManager.targetStack.stackName;

  await stackManager.init({
    stackName,
    commandModifiesStack,
    commandRequiresDeployedStack: true
  });

  await Promise.all([
    templateManager.init({ stackDetails: stackManager.existingStackDetails }),
    deployedStackOverviewManager.init({
      stackDetails: stackManager.existingStackDetails,
      stackResources: stackManager.existingStackResources
    })
  ]);

  const { existingStackDetails } = stackManager;
  const { stackInfoMap } = deployedStackOverviewManager;

  if (!existingStackDetails) {
    throw stpErrors.e30({
      stackName,
      organizationName: globalStateManager.organizationData?.name,
      awsAccountName: globalStateManager.targetAwsAccount.name,
      command: globalStateManager.command
    });
  }
  if (!stackInfoMap && stackManager.stackActionType !== 'delete') {
    throw stpErrors.e31({ stackName });
  }

  await deploymentArtifactManager.init({
    accountId: globalStateManager.targetAwsAccount.awsAccountId,
    globallyUniqueStackHash: globalStateManager.targetStack.globallyUniqueStackHash,
    stackActionType: stackManager.stackActionType
  });
};

export const loadUserCredentials = async () => {
  await eventManager.startEvent({ eventType: 'LOAD_USER_DATA', description: 'Loading user data' });
  await globalStateManager.loadUserCredentials();
  awsSdkManager.init({
    credentials: globalStateManager.credentials,
    region: globalStateManager.region,
    getErrorHandlerFn: getErrorHandler,
    plugins: [loggingPlugin, retryPlugin, redirectPlugin],
    printer: tuiManager
  });
  await eventManager.finishEvent({
    eventType: 'LOAD_USER_DATA',
    finalMessage: `User: ${tuiManager.makeBold(globalStateManager.userData.name)}. Organization: ${tuiManager.makeBold(
      globalStateManager.organizationData.name
    )}.`
  });
};

export const recordStackOperationStart = async () => {
  const isCommandToBeRecorded = RECORDED_STACKTAPE_COMMANDS.includes(
    globalStateManager.command as StacktapeRecordedCommand
  );
  if (isCommandToBeRecorded) {
    // stack operation start
    if (!globalStateManager.isExecutingInsideCodebuild) {
      await stacktapeTrpcApiManager.recordStackOperationStart({
        startingCodebuildOperation: globalStateManager.command === 'codebuild:deploy'
      });
    }
    if (globalStateManager.command !== 'codebuild:deploy') {
      // stack operation end
      applicationManager.registerCleanUpHook(async ({ success, interrupted, err }) => {
        await stacktapeTrpcApiManager.recordStackOperationEnd({
          stackName: globalStateManager.targetStack?.stackName,
          success,
          interrupted,
          error: err
        });
      });
    }
  }
};

export const startStackOperationRecording = async ({
  stackName,
  projectName
}: {
  stackName: string;
  projectName?: string;
}) => {
  // for recorded stacktape commands we are sending logs into cloudwatch
  // we are also recording the start and end of operation through Stacktape API
  const isCommandToBeRecorded = RECORDED_STACKTAPE_COMMANDS.includes(
    globalStateManager.command as StacktapeRecordedCommand
  );

  // const shouldRecordStackOperationProgress =
  //   isCommandToBeRecorded && !globalStateManager.command.startsWith('codebuild');

  // we are NOT collecting logs from local or within codebuild operation when we are doing "codebuild:deploy" as logs are automatically collected inside codebuild execution
  const shouldCollectLogs =
    isCommandToBeRecorded &&
    !globalStateManager.isExecutingInsideCodebuild &&
    !globalStateManager.command.startsWith('codebuild');

  // we are NOT recording stack operation end on cleanup in case this is local monitoring of codebuild operation (i.e command is codebuild:deploy)
  // stack operation end will be recorded inside the codebuild operation itself
  // for cases when operation fails before stacktape operation inside codebuild build even starts, we should record stack operation end manually (see commands/codebuild-deploy)
  const logStreamName = globalStateManager.getStackOperationLogStreamName({ stackName });

  if (isCommandToBeRecorded) {
    await stacktapeTrpcApiManager.recordStackOperationProgress({ stackName, projectName, logStreamName });
  }

  if (shouldCollectLogs) {
    logCollectorStream.init({
      awsSdkManager,
      logGroupName: awsResourceNames.stackOperationsLogGroup(),
      logStreamName
    });
    applicationManager.registerCleanUpHook(logCollectorStream.makeFinalSend);
  }
};
