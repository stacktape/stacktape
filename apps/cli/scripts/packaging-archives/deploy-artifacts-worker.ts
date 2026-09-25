/**
 * One deployment's packaging and artifact upload, run through the CLI's own deploy code, for the production cache
 * scenario of the Lambda archive acceptance.
 *
 * `prepareArtifactsForStackDeployment` packages every workload and finalizes the template, and
 * `DeploymentArtifactManager.uploadAllArtifacts` uploads what changed. These are the calls, on the same managers, that
 * decide in a real deployment which functions are rebuilt, which objects are reused and which layers are uploaded.
 * Only what lies outside the CLI is replaced:
 *
 * - the deployment bucket is a local directory holding one file per S3 key, listed and written through the CLI's S3
 *   calls;
 * - CloudFormation reports an existing stack whose last deployment is `lastVersion`;
 * - Docker is the fixture's stand-in on PATH (see `split-project-fixture.ts`);
 * - any other AWS request is refused before it leaves the process.
 *
 * Start it in the project directory, with the CLI's test preload, which also refuses non-local network access:
 *
 *   bun --preload <cli>/scripts/test-preload.ts <cli>/scripts/packaging-archives/deploy-artifacts-worker.ts <request.json>
 */
import type { StackDetails } from '@domain-services/cloudformation-stack-manager/types';
import type { StackContext } from '@domain-services/stack-context';
import type { Pluggable } from '@aws-sdk/types';
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { parseBucketObjectS3Key } from '@domain-services/deployment-artifact-manager/utils';
import { ec2Manager } from '@domain-services/ec2-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { templateManager } from '@domain-services/template-manager';
import { prepareTemplateForDeploy } from '@domain-services/template-manager/finalize';
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '@stacktape/config-authoring';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { outputNames } from '@stacktape/naming/stack-output-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { fsPaths } from 'src/config/runtime-paths';
import { getConfigManagerContext } from '../../src/commands/_utils/initialization';
import { prepareArtifactsForStackDeployment } from '../../src/commands/deploy';
import { SPLIT_FUNCTIONS } from './split-project-fixture';

export type DeployArtifactsRequest = {
  /** The deployment bucket: one file per S3 key. */
  bucketDirectory: string;
  /** The deployment version the stack reports as its last one, such as `v000001`. */
  lastVersion: string;
  resultPath: string;
  /** `deploymentConfig.previousVersionsToKeep`, for a scenario about retention; the default otherwise. */
  previousVersionsToKeep?: number;
};

export type DeployArtifactsResult = {
  stackActionType: string;
  /** The version this deployment's new objects are named with. */
  version: string;
  jobs: { jobName: string; digest: string; skipped: boolean }[];
  layers: { layerNumber: number; layerPath: string; contentHash: string; s3Key: string }[];
  /** Every object written to the bucket, in upload order. */
  uploadedKeys: string[];
  /**
   * The manager's record of stored objects this deployment must keep (`previouslyUploadedS3KeysUsedInDeployment`),
   * which retention consults before deleting: every reused layer, helper function and user function.
   */
  retentionProtectedKeys: string[];
  /** The stored objects retention would delete after this deployment (`getObsoleteItems` of the listed objects). */
  obsoleteKeys: string[];
  /** When `uploadAllArtifacts` ran, in `performance.now()` milliseconds: the clock of the CLI's timing spans. */
  upload: { startMs: number; endMs: number };
  /** Per function, from the finalized template: its code object and the objects of its layers, in attachment order. */
  functions: Record<string, { s3Key: string; layerKeys: string[] }>;
  /** Each split function's build directory. */
  functionDirectories: Record<string, string>;
};

const REGION = 'eu-west-1';
const STACK_HASH = 'acceptx1';
const PROJECT_NAME = 'archive-acceptance';
const STAGE = 'cache';
const STACK_NAME = `${PROJECT_NAME}-${STAGE}`;

/** Rejects every AWS SDK request before it is signed or sent. */
const refuseAwsRequests: Pluggable<object, object> = {
  applyToStack: (stack) => {
    stack.add(
      (_next, context) => async () => {
        throw new Error(`The acceptance must not contact AWS (${context.clientName}.${context.commandName}).`);
      },
      { step: 'initialize', name: 'refuseAwsRequestsInAcceptance' }
    );
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** The S3 key of a template's `Code` or `Content` value, when it names one directly. */
const s3KeyOf = (location: unknown) =>
  isRecord(location) && typeof location.S3Key === 'string' ? location.S3Key : undefined;

const listBucketKeys = async (directory: string): Promise<string[]> =>
  (await readdir(directory, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)).replace(/\\/g, '/'))
    .toSorted();

const main = async () => {
  const request = JSON.parse(await readFile(process.argv[2]!, 'utf8')) as DeployArtifactsRequest;
  const project = process.cwd();
  const bucketName = awsResourceNames.deploymentBucket(STACK_HASH);
  const uploadedKeys: string[] = [];

  awsSdkManager.init({
    credentials: { accessKeyId: 'acceptance-forbidden', secretAccessKey: 'acceptance-forbidden' },
    region: REGION,
    endpoint: 'http://127.0.0.1:9',
    plugins: [refuseAwsRequests]
  });
  const { cloudFormation, s3, ecr } = awsSdkManager;
  cloudFormation.getDetails = async () =>
    ({
      StackName: STACK_NAME,
      StackId: `arn:aws:cloudformation:${REGION}:123456789999:stack/${STACK_NAME}/acceptance`,
      StackStatus: 'UPDATE_COMPLETE',
      CreationTime: new Date(0),
      Outputs: [{ OutputKey: outputNames.deploymentVersion(), OutputValue: request.lastVersion }],
      stackOutput: { [outputNames.deploymentVersion()]: request.lastVersion }
    }) as StackDetails;
  cloudFormation.getResources = async () => [
    {
      LogicalResourceId: 'StpDeploymentBucket',
      PhysicalResourceId: bucketName,
      ResourceType: 'AWS::S3::Bucket',
      ResourceStatus: 'UPDATE_COMPLETE',
      LastUpdatedTimestamp: new Date(0)
    }
  ];
  // The previous template only feeds the change preview, never an artifact decision.
  cloudFormation.getTemplate = async () => ({ Resources: {} });
  s3.listObjects = async (listedBucket: string) => {
    if (listedBucket !== bucketName) throw new Error(`Unexpected bucket ${listedBucket}.`);
    return (await listBucketKeys(request.bucketDirectory)).map((Key) => ({ Key }));
  };
  s3.uploadFile = async ({ bucketName: uploadBucket, filePath, s3Key }) => {
    if (uploadBucket !== bucketName) throw new Error(`Unexpected bucket ${uploadBucket}.`);
    await mkdir(dirname(join(request.bucketDirectory, s3Key)), { recursive: true });
    await copyFile(filePath, join(request.bucketDirectory, s3Key));
    uploadedKeys.push(s3Key);
    return { $metadata: {}, Bucket: uploadBucket, Key: s3Key };
  };
  s3.waitForBucketExists = async () => {};
  ecr.listImages = async () => [];

  operationReporter.setSilentMode(true);
  const helperLambda = {
    // S3 keys separate the version from the digest at the first hyphen, so a digest has none.
    digest: 'acceptancehelper',
    artifactPath: join(dirname(request.resultPath), 'helper-lambda.zip'),
    handler: 'index.default',
    size: 1
  };
  await writeFile(helperLambda.artifactPath, 'helper lambdas are not part of this acceptance');
  const compiledConfig = defineConfig(() => ({
    ...(request.previousVersionsToKeep === undefined
      ? {}
      : { deploymentConfig: { previousVersionsToKeep: request.previousVersionsToKeep } }),
    resources: Object.fromEntries(
      SPLIT_FUNCTIONS.map((name) => [
        name,
        new LambdaFunction({
          packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: `./src/handlers/${name}.ts` })
        })
      ])
    )
  }))({
    projectName: PROJECT_NAME,
    stage: STAGE,
    region: REGION,
    cliArgs: {} as never,
    command: 'deploy',
    awsProfile: '',
    user: { id: 'acceptance', name: 'Acceptance', email: 'acceptance@example.com' }
  });
  globalStateManager.operationStart = new Date();
  globalStateManager.rawCommands = ['deploy'];
  // Registry caching needs an ECR login; it has no effect on which artifacts are built or reused.
  globalStateManager.rawArgs = {
    stage: STAGE,
    region: REGION,
    projectName: PROJECT_NAME,
    currentWorkingDirectory: project,
    disableDockerRemoteCache: true
  };
  globalStateManager.additionalArgs = {};
  globalStateManager.presetConfig = compiledConfig.config;
  globalStateManager.persistedState = { systemId: 'acceptance-system', cliArgsDefaults: {}, otherDefaults: {} };
  globalStateManager.systemId = 'acceptance-system';
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
    id: 'acceptance-account',
    organizationId: 'acceptance-organization',
    awsAccountId: '123456789999',
    connectionMode: 'BASIC',
    name: 'acceptance',
    state: 'ACTIVE',
    primaryRegions: [REGION],
    defaultRegion: REGION
  };
  globalStateManager.initializedDomainServices = [];
  globalStateManager.isInitialized = true;
  globalStateManager.targetStack = {
    stackName: STACK_NAME,
    globallyUniqueStackHash: STACK_HASH,
    stage: STAGE,
    projectName: PROJECT_NAME,
    projectId: 'acceptance-project'
  };
  const stackContext: StackContext = {
    accountId: '123456789999',
    command: globalStateManager.command,
    globallyUniqueStackHash: STACK_HASH,
    invocationId: globalStateManager.invocationId,
    projectName: PROJECT_NAME,
    region: REGION,
    stackName: STACK_NAME,
    stage: STAGE,
    workingDir: project
  };

  // The deploy command's initialization, limited to the managers packaging and artifact upload use.
  await configManager.init({ configRequired: true, context: getConfigManagerContext(stackContext) });
  await stackManager.init({ stackName: STACK_NAME, commandModifiesStack: true, commandRequiresDeployedStack: false });
  await ec2Manager.init({
    instanceTypes: configManager.allUsedEc2InstanceTypes,
    openSearchInstanceTypes: configManager.allUsedOpenSearchVersionsAndInstanceTypes
  });
  await Promise.all([
    templateManager.init({ stackDetails: stackManager.existingStackDetails, stackName: STACK_NAME }),
    calculatedStackOverviewManager.init({ context: stackContext }),
    deploymentArtifactManager.init({
      accountId: '123456789999',
      globallyUniqueStackHash: STACK_HASH,
      stackActionType: stackManager.stackActionType
    }),
    packagingManager.init()
  ]);

  const { packagedWorkloads } = await prepareArtifactsForStackDeployment({
    calculatedStackOverview: calculatedStackOverviewManager,
    packaging: packagingManager,
    prepareTemplateForDeploy,
    template: templateManager,
    tui: tuiManager
  });
  const uploadStartMs = performance.now();
  await deploymentArtifactManager.uploadAllArtifacts({ useHotswap: false });
  const uploadEndMs = performance.now();

  const resources = Object.entries(templateManager.getTemplate().Resources).map(([logicalName, resource]) => ({
    logicalName,
    type: resource.Type,
    properties: 'Properties' in resource && isRecord(resource.Properties) ? resource.Properties : {}
  }));
  const layerKeyByLogicalName = new Map(
    resources
      .filter(({ type }) => type === 'AWS::Lambda::LayerVersion')
      .map(({ logicalName, properties }) => [logicalName, s3KeyOf(properties.Content)])
  );
  const functions: DeployArtifactsResult['functions'] = {};
  for (const { type, properties } of resources) {
    const s3Key = s3KeyOf(properties.Code);
    if (type !== 'AWS::Lambda::Function' || !s3Key) continue;
    const { name } = parseBucketObjectS3Key(s3Key);
    const layers = Array.isArray(properties.Layers) ? properties.Layers : [];
    functions[name] = {
      s3Key,
      layerKeys: layers.map((layer: unknown) => {
        const reference = isRecord(layer) && Array.isArray(layer['Fn::GetAtt']) ? layer['Fn::GetAtt'][0] : undefined;
        const layerKey = typeof reference === 'string' ? layerKeyByLogicalName.get(reference) : undefined;
        if (!layerKey) throw new Error(`Function ${name} uses a layer this template does not define.`);
        return layerKey;
      })
    };
  }
  const result: DeployArtifactsResult = {
    stackActionType: stackManager.stackActionType,
    version: stackManager.nextVersion,
    jobs: packagedWorkloads.map(({ jobName, digest, skipped }) => ({ jobName, digest, skipped })),
    layers: packagingManager
      .getLayerArtifacts()
      .map(({ layerNumber, layerPath, contentHash, s3Key }) => ({ layerNumber, layerPath, contentHash, s3Key })),
    uploadedKeys,
    retentionProtectedKeys: deploymentArtifactManager.previouslyUploadedS3KeysUsedInDeployment,
    obsoleteKeys: deploymentArtifactManager
      .getObsoleteItems(deploymentArtifactManager.previousObjects)
      .map(({ s3Key }) => s3Key),
    upload: { startMs: uploadStartMs, endMs: uploadEndMs },
    functions,
    functionDirectories: Object.fromEntries(
      SPLIT_FUNCTIONS.map((name) => [
        name,
        fsPaths.absoluteLambdaArtifactFolderPath({ jobName: name, invocationId: globalStateManager.invocationId })
      ])
    )
  };
  await writeFile(request.resultPath, `${JSON.stringify(result, null, 2)}\n`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
