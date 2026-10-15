import { MINISTACK_DEFAULT_ACCOUNT_ID } from '@stacktape/ministack/fixture';
import { resetDomainServiceInitialization } from '@utils/decorators';
/**
 * One packaging run, through the CLI's own `packageAllWorkloads`, for the Docker preparation acceptance.
 *
 * - `package` initializes what the package command does: configuration and packaging, no stack.
 * - `deploy` also reports an existing stack and initializes deployment artifacts, as the deploy command does before it
 *   packages. That is what makes image builds use the registry cache.
 * - `deploy` with `deployment` runs one deployment of a series: after packaging, the deploy command's own
 *   `uploadAllArtifacts` and `deleteAllObsoleteArtifacts`, the calls a deployment makes around its stack update.
 *
 * Only what lies outside the CLI is replaced:
 *
 * - Docker is whatever `docker` the acceptance put first on PATH: a stand-in or a guard;
 * - CloudFormation supplies the existing stack (`deploy` only) and S3 stores real artifacts on MiniStack; ECR
 *   authorization deliberately returns a fixture token;
 * - the image repository lists nothing, or, for a deployment, is the registry file the Docker stand-in pushes into:
 *   one `<tag> <digest>` line per image, `-` for an untagged one, as ECR lists them and deletes them by tag or digest;
 * - any other AWS request is refused before it leaves the process.
 *
 * Start it in the project directory, with the CLI's test preload, which also refuses non-local network access:
 *
 *   bun --preload <cli>/scripts/test-preload.ts <cli>/scripts/packaging-archives/docker-preparation-worker.ts <request.json>
 */
import type { StackContext } from '@domain-services/stack-context';
import type { StacktapeConfig } from '@stacktape/config';
import type { Pluggable } from '@aws-sdk/types';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { ec2Manager } from '@domain-services/ec2-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { seedArtifactStack } from './artifact-stack-fixture';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { fsPaths } from '../../src/config/runtime-paths';
import { getConfigManagerContext } from '../../src/commands/_utils/initialization';

export type DockerPreparationRequest = {
  command: 'package' | 'deploy';
  localAwsEndpoint?: string;
  stackHash?: string;
  resources: StacktapeConfig['resources'];
  resultPath: string;
  /** The `--disableLayerOptimization` argument. */
  disableLayerOptimization?: boolean;
  /** After packaging, zip the shared layers with the deploy command's own `publishSharedLayer`. */
  zipSharedLayers?: boolean;
  /** One deployment of a series; `command` is `deploy`. The stack reports `lastVersion` as its previous deployment. */
  deployment?: { registryPath: string; lastVersion: string; previousVersionsToKeep: number };
};

export type DockerPreparationResult = {
  outcome: 'packaged' | 'failed';
  /** The error that ended packaging: its stable code when it has one, and its message. */
  error: { code: string | null; message: string } | null;
  /** Every job the manager recorded as packaged, also after a failure: other jobs keep running until they settle. */
  jobs: { jobName: string; skipped: boolean; digest: string; sizeMb: number | null; artifactPath: string | null }[];
  /** The zipped shared layers, when the request asked for them and packaging succeeded. */
  sharedLayers: { layerNumber: number; zipPath: string }[];
  /** ECR authorization tokens the CLI asked for. */
  ecrAuthorizations: number;
  /** For a deployment: what it uploaded and deleted, and the registry once it finished. */
  deployment?: {
    uploadedKeys: string[];
    deletedImageTags: string[];
    deletedImageDigests: string[];
    registry: string[];
  };
};

type RegistryImage = { tag: string | undefined; digest: string };

const readRegistry = async (registryPath: string): Promise<RegistryImage[]> =>
  (await readFile(registryPath, 'utf8').catch(() => ''))
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [tag, digest] = line.split(' ');
      return { tag: tag === '-' ? undefined : tag, digest: digest! };
    });

const writeRegistry = (registryPath: string, images: RegistryImage[]) =>
  writeFile(registryPath, images.map(({ tag, digest }) => `${tag ?? '-'} ${digest}\n`).join(''));

const REGION = 'eu-west-1';
const ACCOUNT_ID = '123456789999';
const PROJECT_NAME = 'docker-preparation';
const STAGE = 'acceptance';

/** Rejects every AWS SDK request before it is signed or sent. */
const refuseAwsRequests: Pluggable<object, object> = {
  applyToStack: (stack) => {
    stack.add(
      (next, context) => async (args) => {
        if (['S3Client', 'CloudFormationClient'].includes(context.clientName)) return next(args);
        throw new Error(`The acceptance must not contact AWS (${context.clientName}.${context.commandName}).`);
      },
      { step: 'initialize', name: 'refuseAwsRequestsInAcceptance' }
    );
  }
};

const describeError = (error: unknown): NonNullable<DockerPreparationResult['error']> => {
  const code = (error as { code?: unknown } | null)?.code;
  return {
    code: typeof code === 'string' ? code : null,
    message: error instanceof Error ? error.message : String(error)
  };
};

const main = async () => {
  const request = JSON.parse(await readFile(process.argv[2]!, 'utf8')) as DockerPreparationRequest;
  const project = process.cwd();
  const STACK_HASH = request.stackHash ?? 'dockprep1';
  const STACK_NAME = `${PROJECT_NAME}-${STAGE}-${STACK_HASH}`;
  let ecrAuthorizations = 0;

  awsSdkManager.init({
    credentials: {
      accessKeyId: request.localAwsEndpoint ? MINISTACK_DEFAULT_ACCOUNT_ID : 'acceptance-forbidden',
      secretAccessKey: 'test'
    },
    region: REGION,
    endpoint: request.localAwsEndpoint ?? 'http://127.0.0.1:9',
    plugins: [refuseAwsRequests]
  });
  const { s3, ecr } = awsSdkManager;
  const { deployment } = request;
  const lastVersion = deployment?.lastVersion ?? 'v000001';
  const uploadedKeys: string[] = [];
  const deletedImageTags: string[] = [];
  const deletedImageDigests: string[] = [];
  if (request.command === 'deploy') {
    if (!request.localAwsEndpoint) throw new Error('Deploy fixture needs the shared MiniStack endpoint');
    await seedArtifactStack({
      endpoint: request.localAwsEndpoint,
      stackName: STACK_NAME,
      bucketName: awsResourceNames.deploymentBucket(STACK_HASH),
      lastVersion
    });
    const uploadFile = s3.uploadFile.bind(s3);
    s3.uploadFile = async (input) => {
      const result = await uploadFile(input);
      uploadedKeys.push(input.s3Key);
      return result;
    };
  }
  ecr.listImages = async () =>
    deployment
      ? (await readRegistry(deployment.registryPath)).map(({ tag, digest }) => ({
          ...(tag && { imageTag: tag }),
          imageDigest: digest
        }))
      : [];
  ecr.deleteImages = async (_repositoryName, imageTags, imageDigests) => {
    if (!deployment) throw new Error('Only a deployment deletes images.');
    deletedImageTags.push(...imageTags);
    deletedImageDigests.push(...imageDigests);
    const images = await readRegistry(deployment.registryPath);
    await writeRegistry(
      deployment.registryPath,
      images.filter(({ tag, digest }) => !(tag && imageTags.includes(tag)) && !imageDigests.includes(digest))
    );
  };
  ecr.getAuthorization = async () => {
    ecrAuthorizations += 1;
    // A fixture value: the stand-in receives it on standard input and discards it.
    return {
      user: 'AWS',
      password: 'acceptance-token',
      proxyEndpoint: `https://${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com`
    };
  };

  operationReporter.setSilentMode(true);
  globalStateManager.operationStart = new Date();
  globalStateManager.rawCommands = [request.command];
  globalStateManager.rawArgs = {
    stage: STAGE,
    region: REGION,
    projectName: PROJECT_NAME,
    currentWorkingDirectory: project,
    ...(request.disableLayerOptimization && { disableLayerOptimization: true })
  };
  globalStateManager.additionalArgs = {};
  globalStateManager.presetConfig = {
    resources: request.resources,
    ...(deployment && { deploymentConfig: { previousVersionsToKeep: deployment.previousVersionsToKeep } })
  } as StacktapeConfig;
  if (deployment) {
    // Every stack uploads the service helper Lambda; its artifact is a placeholder here.
    const helperLambda = {
      digest: 'acceptancehelper',
      artifactPath: join(dirname(request.resultPath), 'helper-lambda.zip'),
      handler: 'index.default',
      size: 1
    };
    await writeFile(helperLambda.artifactPath, 'helper Lambdas are not part of this acceptance');
    globalStateManager.helperLambdaDetails = {
      batchJobTriggerLambda: helperLambda,
      stacktapeServiceLambda: helperLambda,
      cdnOriginRequestLambda: helperLambda,
      cdnOriginResponseLambda: helperLambda,
      uptimeProber: helperLambda
    };
  }
  globalStateManager.persistedState = { systemId: 'acceptance-system', cliArgsDefaults: {}, otherDefaults: {} };
  globalStateManager.systemId = 'acceptance-system';
  globalStateManager.awsConfigFileContent = {};
  globalStateManager.availableAwsProfiles = [];
  globalStateManager.localTargetAwsAccount = {
    id: 'acceptance-account',
    organizationId: 'acceptance-organization',
    awsAccountId: ACCOUNT_ID,
    connectionMode: 'BASIC',
    name: 'acceptance',
    state: 'ACTIVE',
    primaryRegions: [REGION],
    defaultRegion: REGION
  };
  resetDomainServiceInitialization();
  globalStateManager.isInitialized = true;
  globalStateManager.targetStack = {
    stackName: STACK_NAME,
    globallyUniqueStackHash: STACK_HASH,
    stage: STAGE,
    projectName: PROJECT_NAME,
    projectId: 'acceptance-project'
  };
  const stackContext: StackContext = {
    accountId: ACCOUNT_ID,
    command: globalStateManager.command,
    globallyUniqueStackHash: STACK_HASH,
    invocationId: globalStateManager.invocationId,
    projectName: PROJECT_NAME,
    region: REGION,
    stackName: STACK_NAME,
    stage: STAGE,
    workingDir: project
  };

  await configManager.init({ configRequired: true, context: getConfigManagerContext(stackContext) });
  if (request.command === 'deploy') {
    await stackManager.init({ stackName: STACK_NAME, commandModifiesStack: true, commandRequiresDeployedStack: false });
    await ec2Manager.init({
      instanceTypes: configManager.allUsedEc2InstanceTypes,
      openSearchInstanceTypes: configManager.allUsedOpenSearchVersionsAndInstanceTypes
    });
    await deploymentArtifactManager.init({
      packagingSource: packagingManager,
      accountId: ACCOUNT_ID,
      globallyUniqueStackHash: STACK_HASH,
      stackActionType: stackManager.stackActionType
    });
  }
  await packagingManager.init();

  let error: DockerPreparationResult['error'] = null;
  let sharedLayers: DockerPreparationResult['sharedLayers'] = [];
  try {
    await packagingManager.packageAllWorkloads({ commandCanUseCache: request.command === 'deploy' });
    if (request.zipSharedLayers) {
      const layers = packagingManager.getLayerArtifacts();
      await packagingManager.publishSharedLayer(layers);
      sharedLayers = layers.map(({ layerNumber, layerPath }) => ({ layerNumber, zipPath: `${layerPath}.zip` }));
    }
    if (deployment) {
      // This scenario protects image caching and retention; template synthesis is exercised by the deploy loop.
      // Supply the template artifacts that the real S3 uploader requires instead of discarding its file reads.
      const cfPath = fsPaths.absoluteCfTemplateFilePath({ invocationId: globalStateManager.invocationId });
      const stpPath = fsPaths.absoluteStpTemplateFilePath({ invocationId: globalStateManager.invocationId });
      await mkdir(dirname(cfPath), { recursive: true });
      await Promise.all([
        writeFile(cfPath, 'Resources: {}\n'),
        writeFile(stpPath, JSON.stringify({ resources: request.resources }))
      ]);
      // As the deploy command does around the stack update, which is outside this acceptance.
      await deploymentArtifactManager.uploadAllArtifacts({ includeTemplates: true });
      await deploymentArtifactManager.deleteAllObsoleteArtifacts();
    }
  } catch (packagingError) {
    error = describeError(packagingError);
  }
  const jobNames = [
    ...configManager.allUserCodeLambdas.map(({ name }) => name),
    ...configManager.allContainersRequiringPackaging.map(({ jobName }) => jobName)
  ];
  const result: DockerPreparationResult = {
    outcome: error ? 'failed' : 'packaged',
    error,
    jobs: jobNames.flatMap((jobName) => {
      const output = packagingManager.getPackagingOutputForJob(jobName);
      return output
        ? [
            {
              jobName,
              skipped: output.skipped,
              digest: output.digest,
              sizeMb: output.size ?? null,
              artifactPath: output.artifactPath ?? null
            }
          ]
        : [];
    }),
    sharedLayers,
    ecrAuthorizations,
    ...(deployment && {
      deployment: {
        uploadedKeys,
        deletedImageTags,
        deletedImageDigests,
        registry: (await readRegistry(deployment.registryPath)).map(({ tag, digest }) => `${tag ?? '-'} ${digest}`)
      }
    })
  };
  await writeFile(request.resultPath, `${JSON.stringify(result, null, 2)}\n`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
