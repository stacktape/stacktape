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
import { templateManager } from '@domain-services/template-manager';
import { finalizeTemplate } from '@domain-services/template-manager/finalize';
import type { StackContext } from '@domain-services/stack-context';
import type { CompiledStacktapeConfig } from '@stacktape/config-authoring';
import type { SupportedAWSRegion as AWSRegion } from '@stacktape/config/aws-regions';
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

export const synthesizeFixture = async ({
  compiledConfig,
  configPath,
  workingDir,
  synthesisContext,
  beforeFinalize,
  command = 'synth',
  remoteResources,
  identity: identityOverride
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
      await domainManager.init({
        stackName: stackContext.stackName,
        domains: [],
        loadDefaultDomainsFromControlPlane: false
      });
    }

    deploymentArtifactManager.setPackagingSource(packagingManager);
    deploymentArtifactManager.deploymentBucketName = `stp-deployment-bucket-${globallyUniqueStackHash}`;
    deploymentArtifactManager.repositoryName = identityOverride
      ? awsResourceNames.deploymentEcrRepo(globallyUniqueStackHash)
      : 'xxxxxxxx-stp-container-repository';
    deploymentArtifactManager.repositoryUrl = `${identity.accountId}.dkr.ecr.${identity.region}.amazonaws.com/${deploymentArtifactManager.repositoryName}`;

    await stackManager.init({
      stackName: globalStateManager.targetStack.stackName,
      commandModifiesStack: false,
      commandRequiresDeployedStack: false
    });

    await Promise.all([
      templateManager.init({ stackDetails: undefined, stackName: stackContext.stackName }),
      calculatedStackOverviewManager.init({
        context: stackContext
      })
    ]);
    await resolveAllResources();
    beforeFinalize?.();
    await finalizeTemplate();
    return templateManager.getTemplate();
  });
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

export const withCredentiallessSynthesisBoundary = async <Result>(operation: () => Promise<Result>) => {
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
    async (input: Parameters<typeof fetch>[0]) => {
      const destination = input instanceof Request ? input.url : String(input);
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
