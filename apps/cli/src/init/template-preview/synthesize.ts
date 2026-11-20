import http from 'node:http';
import https from 'node:https';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { operationReporter, operationSession } from '@application-services/operation-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveAllResources } from '@domain-services/calculated-stack-overview-manager/synthesize';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { ec2Manager } from '@domain-services/ec2-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import type { StackContext } from '@domain-services/stack-context';
import { templateManager } from '@domain-services/template-manager';
import { finalizeTemplate } from '@domain-services/template-manager/finalize';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { SupportedAWSRegion } from '@stacktape/config/aws-regions';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { resetDomainServiceInitialization } from '@utils/decorators';
import { fsPaths } from 'src/config/runtime-paths';
import { loadHelperLambdaDetailsFromDir, type HelperLambdaData, type HelperLambdaDetails } from '@utils/helper-lambdas';
import { getConfigManagerContext } from '../../commands/_utils/initialization';
import type { TemplatePreviewRequest } from './protocol';

/** Stands in for the account when the wizard does not know it yet. Names derived from it say so. */
export const PLACEHOLDER_ACCOUNT_ID = '000000000000';

const PLACEHOLDER_HELPER: HelperLambdaData = {
  digest: 'preview',
  artifactPath: 'preview.zip',
  handler: 'index.default'
};

/** The helper Lambdas the CLI ships, for their digests in the template; placeholders where none are on disk. */
const helperLambdas = async (): Promise<HelperLambdaDetails> => {
  const loaded = await loadHelperLambdaDetailsFromDir({ helperLambdasDir: fsPaths.helperLambdasDir() }).catch(
    () => ({}) as Partial<HelperLambdaDetails>
  );
  return {
    batchJobTriggerLambda: loaded.batchJobTriggerLambda ?? PLACEHOLDER_HELPER,
    stacktapeServiceLambda: loaded.stacktapeServiceLambda ?? PLACEHOLDER_HELPER,
    cdnOriginRequestLambda: loaded.cdnOriginRequestLambda ?? PLACEHOLDER_HELPER,
    cdnOriginResponseLambda: loaded.cdnOriginResponseLambda ?? PLACEHOLDER_HELPER,
    uptimeProber: loaded.uptimeProber ?? PLACEHOLDER_HELPER
  } as HelperLambdaDetails;
};

/**
 * The CloudFormation template `stacktape deploy` would create for a configuration, compiled on this machine without
 * AWS, without the Stacktape API and without building anything.
 *
 * The same synthesis `stacktape synth` runs, set up the way the characterization tests set it up: a stack that does
 * not exist yet, placeholders for what only AWS knows (the deployment bucket's contents, package digests), and every
 * network request refused. A configuration that needs AWS to compile (a lookup of an existing resource) fails with the
 * error that lookup raises, which the wizard shows.
 *
 * It sets the CLI's process-wide managers, so it runs in a process of its own (`child.ts`), never inside the wizard's.
 */
export const synthesizeTemplatePreview = async (request: TemplatePreviewRequest): Promise<CloudFormationTemplate> => {
  const region = request.region as SupportedAWSRegion;
  const accountId = request.accountId ?? PLACEHOLDER_ACCOUNT_ID;
  const stackName = `${request.projectName}-${request.stage}`;
  const globallyUniqueStackHash = getGloballyUniqueStackHash({ region, stackName, accountId });

  return withoutNetwork(async () => {
    calculatedStackOverviewManager.reset();
    configManager.reset();
    templateManager.reset();
    operationSession.reset();
    operationReporter.setSilentMode(true);
    await applicationManager.init();

    globalStateManager.operationStart = new Date();
    globalStateManager.rawCommands = ['synth'];
    globalStateManager.rawArgs = {
      stage: request.stage,
      region,
      projectName: request.projectName,
      currentWorkingDirectory: request.workingDir
    };
    globalStateManager.additionalArgs = {};
    globalStateManager.configPath = null;
    // Checked against the schema by `configManager.init`, as a file's contents are.
    globalStateManager.presetConfig = request.config as unknown as typeof globalStateManager.presetConfig;
    globalStateManager.persistedState = { systemId: 'init-preview', cliArgsDefaults: {}, otherDefaults: {} };
    globalStateManager.systemId = globalStateManager.persistedState.systemId;
    globalStateManager.awsConfigFileContent = {};
    globalStateManager.availableAwsProfiles = [];
    globalStateManager.helperLambdaDetails = await helperLambdas();
    globalStateManager.localTargetAwsAccount = {
      id: 'init-preview',
      organizationId: 'init-preview',
      awsAccountId: accountId,
      connectionMode: 'BASIC',
      name: 'init-preview',
      state: 'ACTIVE',
      primaryRegions: [region],
      defaultRegion: region
    };
    resetDomainServiceInitialization();
    globalStateManager.isInitialized = true;
    globalStateManager.targetStack = {
      stackName,
      globallyUniqueStackHash,
      stage: request.stage,
      projectName: request.projectName,
      projectId: 'init-preview'
    };
    const stackContext: StackContext = {
      accountId,
      command: globalStateManager.command,
      globallyUniqueStackHash,
      invocationId: globalStateManager.invocationId,
      projectName: request.projectName,
      region,
      stackName,
      stage: request.stage,
      workingDir: globalStateManager.workingDir
    };
    await configManager.init({
      configRequired: true,
      context: { ...getConfigManagerContext(stackContext), consoleConnected: request.consoleConnected }
    });
    // Secrets are read from AWS at deploy time. The preview shows the reference a deploy writes for one that does not
    // exist yet, the same placeholder `stacktape validate` checks the template with.
    configManager.reportSecretsMissing(configManager.allSecretReferencesUsedInConfig.keys());
    configManager.reportSsmParamsMissing(configManager.allSsmParamReferencesUsedInConfig);
    await ec2Manager.init({
      instanceTypes: configManager.allUsedEc2InstanceTypes,
      openSearchInstanceTypes: configManager.allUsedOpenSearchVersionsAndInstanceTypes
    });
    deploymentArtifactManager.setPackagingSource(packagingManager);
    deploymentArtifactManager.deploymentBucketName = awsResourceNames.deploymentBucket(globallyUniqueStackHash);
    deploymentArtifactManager.repositoryName = awsResourceNames.deploymentEcrRepo(globallyUniqueStackHash);
    deploymentArtifactManager.repositoryUrl = `${accountId}.dkr.ecr.${region}.amazonaws.com/${deploymentArtifactManager.repositoryName}`;
    await stackManager.init({ stackName, commandModifiesStack: false, commandRequiresDeployedStack: false });
    await Promise.all([
      templateManager.init({ stackDetails: undefined, stackName }),
      calculatedStackOverviewManager.init({ context: stackContext })
    ]);
    await resolveAllResources();
    await finalizeTemplate();
    return templateManager.getTemplate();
  });
};

const AWS_ENVIRONMENT = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_PROFILE',
  'AWS_SHARED_CREDENTIALS_FILE',
  'AWS_CONFIG_FILE',
  'AWS_EC2_METADATA_DISABLED'
] as const;

/**
 * Runs `operation` with no AWS credentials and every network request refused, so a compile can only read this
 * machine. The process exits after one compile, so nothing is put back.
 */
const withoutNetwork = async <Result>(operation: () => Promise<Result>): Promise<Result> => {
  for (const name of AWS_ENVIRONMENT) process.env[name] = 'init-preview-forbidden';
  process.env.AWS_EC2_METADATA_DISABLED = 'true';
  if (!awsSdkManager.isInitialized) {
    awsSdkManager.init({
      credentials: { accessKeyId: 'init-preview-forbidden', secretAccessKey: 'init-preview-forbidden' },
      region: 'us-east-1'
    });
  }
  const refuse = (destination: unknown): never => {
    throw new Error(`The template preview does not contact AWS or the internet (asked for ${String(destination)}).`);
  };
  globalThis.fetch = Object.assign(async (input: Parameters<typeof fetch>[0]) => refuse(input), {
    preconnect: (input: Parameters<typeof fetch.preconnect>[0]) => refuse(input)
  });
  http.request = refuse as unknown as typeof http.request;
  http.get = refuse as unknown as typeof http.get;
  https.request = refuse as unknown as typeof https.request;
  https.get = refuse as unknown as typeof https.get;
  awsSdkManager.cloudFormation.getDetails = async () => null;
  awsSdkManager.cloudFormation.getResources = async () => [];
  return operation();
};
