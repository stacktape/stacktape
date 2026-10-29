import { packagingManager } from '@domain-services/packaging-manager';
import { resetDomainServiceInitialization } from '@utils/decorators';
import { resolveAllResources } from '@domain-services/calculated-stack-overview-manager/synthesize';
import http from 'node:http';
import https from 'node:https';
import { applicationManager } from '@application-services/application-manager';
import { operationReporter, operationSession } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { domainManager } from '@domain-services/domain-manager';
import { ec2Manager } from '@domain-services/ec2-manager';
import { vpcManager, type SharedNetwork } from '@domain-services/vpc-manager';
import { templateManager } from '@domain-services/template-manager';
import { finalizeTemplate } from '@domain-services/template-manager/finalize';
import { assertLocalAwsEndpoint, type MiniStackClientConfig } from '@stacktape/ministack/fixture';
import type { StackContext } from '@domain-services/stack-context';
import type { EnrichedStackResourceInfo } from '@domain-services/cloudformation-stack-manager/types';
import type { DevNetworkPlacement } from '@domain-services/dev-network/placement';
import type { CompiledStacktapeConfig } from '@stacktape/config-authoring';
import type { SupportedAWSRegion as AWSRegion } from '@stacktape/config/aws-regions';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { getConfigManagerContext } from '../../src/commands/_utils/initialization';

/**
 * The stack identity a fixture synthesizes under. Physical names and the globally unique stack hash derive from it, so
 * a test that compares against a template produced elsewhere (for example by the v3 CLI) must pass the same identity.
 */
export type SynthesisIdentity = {
  accountId: string;
  region: AWSRegion;
  projectName: string;
  stage: string;
};

export const defaultSynthesisIdentity: SynthesisIdentity = {
  accountId: '123456789999',
  region: 'eu-west-1',
  projectName: 'characterization',
  stage: 'baseline'
};

/**
 * The resources a stack deployed from `template` lists, as `stackManager` holds them; all of them, or `logicalIds`.
 * Databases report the engine version their template names.
 */
export const existingResourcesOf = (
  template: CloudFormationTemplate,
  logicalIds: string[] = Object.keys(template.Resources ?? {})
): EnrichedStackResourceInfo[] =>
  logicalIds.map((logicalId) => {
    const deployed = template.Resources?.[logicalId] as
      | { Type: string; Properties?: { EngineVersion?: string } }
      | undefined;
    const engineDetail = { EngineVersion: deployed?.Properties?.EngineVersion };
    return {
      LogicalResourceId: logicalId,
      PhysicalResourceId: logicalId,
      ResourceType: deployed?.Type ?? 'AWS::CloudFormation::CustomResource',
      ResourceStatus: 'CREATE_COMPLETE',
      LastUpdatedTimestamp: new Date(0),
      ...(deployed?.Type === 'AWS::RDS::DBInstance' && { rdsInstanceDetail: engineDetail }),
      ...(deployed?.Type === 'AWS::RDS::DBCluster' && { auroraClusterDetail: engineDetail })
    } as EnrichedStackResourceInfo;
  });

export const synthesizeFixture = async ({
  compiledConfig,
  configPath,
  workingDir,
  synthesisContext,
  beforeFinalize,
  command = 'synth',
  remoteResources,
  identity: identityOverride,
  deployedTemplate,
  localAws,
  devNetwork,
  devSkippedFunctions,
  sharedNetwork,
  existingStackResources = deployedTemplate && existingResourcesOf(deployedTemplate)
}: {
  /** An already compiled TypeScript-style config. Mutually exclusive with `configPath`. */
  compiledConfig?: CompiledStacktapeConfig;
  /** A YAML or TypeScript config file loaded through the real config resolver. Mutually exclusive with `compiledConfig`. */
  configPath?: string;
  workingDir: string;
  synthesisContext?: Partial<StackContext>;
  beforeFinalize?: () => void;
  command?: 'dev' | 'synth';
  remoteResources?: string[];
  identity?: Partial<SynthesisIdentity>;
  /** The template of the stack as deployed, for an update of an existing stack. Default domains read it only with `identity`. */
  deployedTemplate?: CloudFormationTemplate;
  /** Explicit synthetic clients for runtime directives; every other network request stays forbidden. */
  localAws?: MiniStackClientConfig;
  /** The dev network placement `stacktape dev` decides before it synthesizes a dev stack. */
  devNetwork?: DevNetworkPlacement;
  /** The functions a dev session leaves out; the dev stack keeps them without triggers. */
  devSkippedFunctions?: string[];
  /** The resources of the stack as deployed, for an update of an existing stack. Defaults to `deployedTemplate`'s. */
  existingStackResources?: EnrichedStackResourceInfo[];
  /** The shared non-production network the stage runs in, as `prepareStageNetwork` decides before synthesis. */
  sharedNetwork?: { network: SharedNetwork; usesNat: boolean };
}) => {
  if (!compiledConfig === !configPath) {
    throw new Error('synthesizeFixture needs exactly one of compiledConfig or configPath.');
  }
  const identity = { ...defaultSynthesisIdentity, ...identityOverride };
  const stackName = `${identity.projectName}-${identity.stage}`;
  // The historical hash formula; the characterization default keeps the fixed placeholder hash older fixtures expect.
  const globallyUniqueStackHash = identityOverride
    ? getGloballyUniqueStackHash({ region: identity.region, stackName, accountId: identity.accountId })
    : 'xxxxxxxx';
  if (localAws) {
    assertLocalAwsEndpoint(localAws.endpoint);
    awsSdkManager.init({ ...localAws, region: identity.region, plugins: [] });
  }
  return withCredentiallessSynthesisBoundary(async () => {
    calculatedStackOverviewManager.reset();
    configManager.reset();
    templateManager.reset();
    operationSession.reset();
    operationReporter.setSilentMode(true);

    await applicationManager.init();
    const helperLambda = {
      digest: 'characterization',
      artifactPath: 'characterization-helper.zip',
      handler: 'index.default',
      size: 10
    };
    globalStateManager.operationStart = new Date();
    globalStateManager.rawCommands = [command];
    globalStateManager.rawArgs = {
      stage: identity.stage,
      region: identity.region,
      projectName: identity.projectName,
      currentWorkingDirectory: workingDir,
      ...(configPath ? { configPath } : {}),
      ...(remoteResources ? { remoteResources } : {})
    };
    globalStateManager.additionalArgs = {};
    globalStateManager.configPath = configPath ?? null;
    globalStateManager.presetConfig = compiledConfig?.config;
    globalStateManager.persistedState = {
      systemId: 'characterization-system',
      cliArgsDefaults: {},
      otherDefaults: {}
    };
    globalStateManager.systemId = globalStateManager.persistedState.systemId;
    globalStateManager.awsConfigFileContent = {};
    globalStateManager.availableAwsProfiles = [];
    globalStateManager.helperLambdaDetails = {
      batchJobTriggerLambda: helperLambda,
      stacktapeServiceLambda: helperLambda,
      cdnOriginRequestLambda: helperLambda,
      cdnOriginResponseLambda: helperLambda,
      uptimeProber: helperLambda
    };
    globalStateManager.localTargetAwsAccount = {
      id: 'characterization-account',
      organizationId: 'characterization-organization',
      awsAccountId: identity.accountId,
      connectionMode: 'BASIC',
      name: 'characterization',
      state: 'ACTIVE',
      primaryRegions: [identity.region],
      defaultRegion: identity.region
    };
    resetDomainServiceInitialization();
    globalStateManager.isInitialized = true;
    globalStateManager.targetStack = {
      stackName,
      globallyUniqueStackHash,
      stage: identity.stage,
      projectName: identity.projectName,
      projectId: 'characterization-project'
    };
    const stackContext: StackContext = {
      accountId: globalStateManager.targetAwsAccount.awsAccountId,
      command: globalStateManager.command,
      globallyUniqueStackHash: globalStateManager.targetStack.globallyUniqueStackHash,
      invocationId: globalStateManager.invocationId,
      projectName: globalStateManager.targetStack.projectName,
      region: globalStateManager.region,
      stackName: globalStateManager.targetStack.stackName,
      stage: globalStateManager.targetStack.stage,
      workingDir: globalStateManager.workingDir,
      ...synthesisContext
    };
    await configManager.init({ configRequired: true, context: getConfigManagerContext(stackContext) });
    configManager.setDevNetworkPlacement(devNetwork);
    configManager.setDevSkippedFunctions(devSkippedFunctions ?? []);
    if (compiledConfig) {
      configManager.transforms = compiledConfig.transforms ?? {};
      configManager.finalTransform = compiledConfig.finalTransform;
    }
    await ec2Manager.init({
      instanceTypes: configManager.allUsedEc2InstanceTypes,
      openSearchInstanceTypes: configManager.allUsedOpenSearchVersionsAndInstanceTypes
    });

    if (identityOverride) {
      // Default domains derive from the stack identity. Without this the domain manager stays in its placeholder
      // mode and every default domain name reads `project-stage-xxxxxxxx`, which would look like a replacement
      // against a template produced by a real invocation.
      await domainManager.loadDefaultDomainsInfo({
        stackName: stackContext.stackName,
        deployedTemplate,
        fromControlPlane: false
      });
    }

    deploymentArtifactManager.setPackagingSource(packagingManager);
    deploymentArtifactManager.deploymentBucketName = awsResourceNames.deploymentBucket(globallyUniqueStackHash);
    deploymentArtifactManager.repositoryName = identityOverride
      ? awsResourceNames.deploymentEcrRepo(globallyUniqueStackHash)
      : 'xxxxxxxx-stp-container-repository';
    deploymentArtifactManager.repositoryUrl = `${identity.accountId}.dkr.ecr.${identity.region}.amazonaws.com/${deploymentArtifactManager.repositoryName}`;

    await stackManager.init({
      stackName: globalStateManager.targetStack.stackName,
      commandModifiesStack: false,
      commandRequiresDeployedStack: false
    });
    if (existingStackResources) stackManager.existingStackResources = existingStackResources;

    await Promise.all([
      templateManager.init({ stackDetails: undefined, stackName: stackContext.stackName }),
      calculatedStackOverviewManager.init({
        context: stackContext
      })
    ]);
    if (deployedTemplate) templateManager.oldTemplate = deployedTemplate;
    vpcManager.useSharedNetwork(sharedNetwork?.network, { usesNat: sharedNetwork?.usesNat });
    try {
      await resolveAllResources();
    } finally {
      // Later fixtures in the same process synthesize stages with a VPC of their own.
      if (sharedNetwork) vpcManager.useSharedNetwork(undefined);
    }
    beforeFinalize?.();
    await finalizeTemplate();
    return templateManager.getTemplate();
  }, localAws?.endpoint);
};

const protectedAwsEnvironment = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_PROFILE',
  'AWS_SHARED_CREDENTIALS_FILE',
  'AWS_CONFIG_FILE',
  'AWS_EC2_METADATA_DISABLED'
] as const;

export const withCredentiallessSynthesisBoundary = async <Result>(
  operation: () => Promise<Result>,
  localAwsEndpoint?: string
) => {
  if (localAwsEndpoint) assertLocalAwsEndpoint(localAwsEndpoint);
  if (!awsSdkManager.isInitialized) {
    awsSdkManager.init({
      credentials: { accessKeyId: 'characterization-forbidden', secretAccessKey: 'characterization-forbidden' },
      region: 'eu-west-1'
    });
  }
  const cloudFormation = awsSdkManager.cloudFormation;
  const originalEnvironment = Object.fromEntries(
    protectedAwsEnvironment.map((name) => [name, process.env[name]])
  ) as Record<(typeof protectedAwsEnvironment)[number], string | undefined>;
  const originalFetch = globalThis.fetch;
  const originalHttpRequest = http.request;
  const originalHttpGet = http.get;
  const originalHttpsRequest = https.request;
  const originalHttpsGet = https.get;
  const originalGetStackDetails = cloudFormation.getDetails;
  const originalGetStackResources = cloudFormation.getResources;
  const openSearch = awsSdkManager.openSearch;
  const originalGetInstanceTypeLimits = openSearch.getInstanceTypeLimits;

  process.env.AWS_ACCESS_KEY_ID = 'characterization-forbidden';
  process.env.AWS_SECRET_ACCESS_KEY = 'characterization-forbidden';
  process.env.AWS_SESSION_TOKEN = 'characterization-forbidden';
  process.env.AWS_PROFILE = '__stacktape_characterization_forbidden__';
  process.env.AWS_SHARED_CREDENTIALS_FILE = '__stacktape_characterization_missing_credentials__';
  process.env.AWS_CONFIG_FILE = '__stacktape_characterization_missing_config__';
  process.env.AWS_EC2_METADATA_DISABLED = 'true';
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) => {
      const destination = input instanceof Request ? input.url : String(input);
      if (localAwsEndpoint && new URL(destination).origin === localAwsEndpoint) {
        return originalFetch(input, { ...options, redirect: 'error' });
      }
      throw new Error(`Unclassified network request during credential-free synthesis: ${destination}`);
    },
    {
      preconnect: (input: Parameters<typeof fetch.preconnect>[0]) => {
        throw new Error(`Unclassified network preconnect during credential-free synthesis: ${String(input)}`);
      }
    }
  );
  const rejectNodeRequest = ((input: unknown) => {
    const destination = input instanceof URL ? input.href : typeof input === 'string' ? input : JSON.stringify(input);
    throw new Error(`Unclassified Node HTTP request during credential-free synthesis: ${destination}`);
  }) as typeof http.request;
  http.request = rejectNodeRequest;
  http.get = rejectNodeRequest as typeof http.get;
  https.request = rejectNodeRequest as typeof https.request;
  https.get = rejectNodeRequest as typeof https.get;
  cloudFormation.getDetails = async () => null;
  cloudFormation.getResources = async () => [];
  // OpenSearch instance limits are looked up live during initialization; synthesis only needs to know that EBS gp3
  // storage is available, which every current-generation instance type supports.
  openSearch.getInstanceTypeLimits = async () => ({
    $metadata: {},
    LimitsByRole: {
      data: {
        StorageTypes: [{ StorageTypeName: 'ebs', StorageSubTypeName: 'gp3' }],
        InstanceLimits: { InstanceCountLimits: { MinimumInstanceCount: 1, MaximumInstanceCount: 80 } }
      }
    }
  });

  try {
    return await operation();
  } finally {
    globalThis.fetch = originalFetch;
    http.request = originalHttpRequest;
    http.get = originalHttpGet;
    https.request = originalHttpsRequest;
    https.get = originalHttpsGet;
    cloudFormation.getDetails = originalGetStackDetails;
    cloudFormation.getResources = originalGetStackResources;
    openSearch.getInstanceTypeLimits = originalGetInstanceTypeLimits;
    for (const name of protectedAwsEnvironment) {
      const value = originalEnvironment[name];
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
};
