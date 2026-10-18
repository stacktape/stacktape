import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { PackagingOutput } from '@stacktape/packaging/runtime-contracts';
import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { arns } from '@stacktape/naming/arns';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { tagNames } from '@stacktape/naming/tag-names';
import { templateManager } from '@domain-services/template-manager';
import {
  describeFastDeploymentLayerVersion,
  formatSharedLayersTag,
  getDeployedSharedLayers,
  getTagValue,
  parseFastDeploymentLayerVersion,
  replaceSharedLayerArns,
  resolveTemplateLayerArns,
  selectSupersededLayerVersions,
  sharedLayerIdentity
} from '@domain-services/deployment-artifact-manager/shared-layers';
import { awsSdkManager } from '@utils/aws-sdk-manager';

export const buildAndUpdateFunctionCode = async (stpResourceName: string, options: { devMode?: boolean } = {}) => {
  const { devMode } = options;
  const lambdaProps = configManager.allLambdasEligibleForHotswap.find(({ name }) => name === stpResourceName);

  // Dev mode: use spinners for progress feedback
  const spinner = devMode ? tuiManager.createSpinner({ text: 'Packaging function' }) : null;

  if (!devMode) {
    await operationReporter.startEvent({
      eventType: 'PACKAGE_ARTIFACTS',
      description: 'Packaging function'
    });
  }

  const packagingOutput = (await packagingManager.packageWorkload({
    jobName: lambdaProps.name,
    packaging: lambdaProps.packaging,
    workloadName: lambdaProps.name,
    commandCanUseCache: false,
    target: 'lambda',
    dockerBuildOutputArchitecture: lambdaProps.architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64',
    ...(devMode && { customProgressLogger: tuiManager.createSpinnerProgressLogger(spinner, lambdaProps.name) })
  })) as PackagingOutput;

  if (!devMode) {
    await operationReporter.finishEvent({ eventType: 'PACKAGE_ARTIFACTS', finalMessage: 'Function packaged' });
  } else {
    spinner.success({ details: `${packagingOutput.size} MB` });
  }

  const { artifactInfo, lambdaResourceName, aliasName } = getLambdaFunctionHotswapInformation({
    lambdaProps,
    sharedLayers: []
  });

  // Upload phase
  const uploadSpinner = devMode ? tuiManager.createSpinner({ text: 'Uploading to S3' }) : null;

  if (!devMode) {
    await operationReporter.startEvent({
      eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
      description: 'Uploading deployment artifacts'
    });
  }

  await deploymentArtifactManager.uploadLambda(artifactInfo);

  if (!devMode) {
    await operationReporter.finishEvent({
      eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
      finalMessage: 'Function code uploaded'
    });
  } else {
    uploadSpinner.success();
  }

  // Hotswap update phase
  const updateSpinner = devMode ? tuiManager.createSpinner({ text: 'Updating function code' }) : null;

  if (!devMode) {
    await operationReporter.startEvent({
      eventType: 'HOTSWAP_UPDATE',
      description: 'Performing hotswap update'
    });
  }

  const { FunctionArn } = await updateFunctionCode({
    workloadName: lambdaProps.name,
    lambdaResourceName,
    artifactInfo,
    aliasName,
    devMode
  });

  if (!devMode) {
    await operationReporter.finishEvent({ eventType: 'HOTSWAP_UPDATE', finalMessage: 'Function code hot-swapped' });
  } else {
    updateSpinner.success();
  }

  return { packagingOutput, lambdaArn: FunctionArn };
};

export type SharedLayerHotswapInformation = {
  layerNumber: number;
  cfLogicalName: string;
  layerName: string;
  /** The content this deployment built, by the hash in its S3 key. */
  identity: string;
  s3Key: string;
  description?: string;
  compatibleRuntimes?: string[];
  /** The version CloudFormation manages and the content it was published from, when the stack has the layer. */
  cfnVersionArn?: string;
  cfnIdentity?: string;
};

type LayerVersionProperties = {
  LayerName?: unknown;
  Description?: unknown;
  CompatibleRuntimes?: unknown;
  Content?: { S3Key?: unknown };
};

const layerProperties = (template: { Resources?: Record<string, unknown> }, cfLogicalName: string) =>
  (template.Resources?.[cfLogicalName] as { Properties?: LayerVersionProperties } | undefined)?.Properties;

/** Every shared chunk layer this deployment's template declares, with the version CloudFormation holds for it. */
export const getSharedLayerHotswapInformation = (): SharedLayerHotswapInformation[] =>
  packagingManager.getLayerArtifacts().flatMap(({ layerNumber, s3Key }) => {
    const cfLogicalName = cfLogicalNames.sharedChunkLayer(layerNumber);
    const properties = layerProperties(templateManager.getTemplate(), cfLogicalName);
    if (typeof properties?.LayerName !== 'string') return [];
    const deployedS3Key = layerProperties(templateManager.oldTemplate, cfLogicalName)?.Content?.S3Key;
    const compatibleRuntimes = properties.CompatibleRuntimes;
    return [
      {
        layerNumber,
        cfLogicalName,
        layerName: properties.LayerName,
        identity: sharedLayerIdentity(s3Key),
        s3Key,
        ...(typeof properties.Description === 'string' ? { description: properties.Description } : {}),
        ...(Array.isArray(compatibleRuntimes) ? { compatibleRuntimes: compatibleRuntimes as string[] } : {}),
        ...(() => {
          const cfnVersionArn = stackManager.existingStackResources.find(
            ({ LogicalResourceId }) => LogicalResourceId === cfLogicalName
          )?.PhysicalResourceId;
          return cfnVersionArn ? { cfnVersionArn } : {};
        })(),
        ...(typeof deployedS3Key === 'string' ? { cfnIdentity: sharedLayerIdentity(deployedS3Key) } : {})
      }
    ];
  });

export const getLambdaFunctionHotswapInformation = ({
  lambdaProps,
  sharedLayers
}: {
  lambdaProps: StpLambdaFunction;
  /** From `getSharedLayerHotswapInformation`; empty when the caller updates code alone, as `dev` does. */
  sharedLayers: SharedLayerHotswapInformation[];
}) => {
  const artifactInfo = deploymentArtifactManager.getLambdaS3UploadInfo({
    artifactName: lambdaProps.artifactName,
    packaging: lambdaProps.packaging
  });

  const deployedResource = stackManager.existingStackResources.find(
    ({ LogicalResourceId }) => LogicalResourceId === lambdaProps.cfLogicalName
  );
  const deployedLambdaDigest = getTagValue(deployedResource?.tags, tagNames.codeDigest());
  const deployedLayers = getDeployedSharedLayers({
    tags: deployedResource?.tags,
    deployedTemplate: templateManager.oldTemplate,
    functionLogicalName: lambdaProps.cfLogicalName
  });
  const layers = packagingManager
    .getLayerNumbersForLambda(lambdaProps.name)
    .flatMap((layerNumber) => sharedLayers.filter((layer) => layer.layerNumber === layerNumber));
  const changedLayers = layers.filter(({ layerNumber, identity }) => deployedLayers.get(layerNumber) !== identity);
  const codeChanged = deployedLambdaDigest !== artifactInfo.digest;

  // if alias is part of the current deployment, it means we will be updating
  const aliasName = stackManager.existingStackResources
    .find(({ LogicalResourceId }) => LogicalResourceId === cfLogicalNames.lambdaStpAlias(lambdaProps.name))
    ?.PhysicalResourceId?.split(':')?.[7];

  return {
    workloadName: lambdaProps.name,
    lambdaResourceName: lambdaProps.resourceName,
    cfLogicalName: lambdaProps.cfLogicalName,
    artifactInfo,
    codeChanged,
    /** The shared layers the function uses, and those whose content differs from what it runs. */
    layers,
    changedLayers,
    needsUpdate: codeChanged || changedLayers.length > 0,
    aliasName
  };
};

/**
 * The name of a Lambda the fast path does not update that uses one of the given shared layers, if there is one. Today
 * every split-bundled Lambda is updated directly; this keeps a future kind of Lambda from running stale shared code.
 */
export const findLambdaOutsideFastPathUsingLayers = ({
  config,
  layerNumbers
}: {
  config: Pick<typeof configManager, 'allLambdasEligibleForHotswap' | 'allLambdasToUpload'>;
  layerNumbers: number[];
}): string | undefined => {
  if (!layerNumbers.length) return undefined;
  const eligible = new Set(config.allLambdasEligibleForHotswap.map(({ name }) => name));
  const changed = new Set(layerNumbers);
  return config.allLambdasToUpload.find(
    ({ name }) =>
      !eligible.has(name) &&
      packagingManager.getLayerNumbersForLambda(name).some((layerNumber) => changed.has(layerNumber))
  )?.name;
};

/**
 * A version of each layer with this deployment's content: CloudFormation's own when it has that content, a version an
 * earlier fast deployment published from it, or a new version published now. Returns the version ARN by layer number.
 */
export const resolveSharedLayerVersions = async (
  layers: SharedLayerHotswapInformation[]
): Promise<Map<number, string>> => {
  const arns = new Map<number, string>();
  await Promise.all(
    layers.map(async (layer) => {
      if (layer.cfnVersionArn && layer.cfnIdentity === layer.identity) {
        arns.set(layer.layerNumber, layer.cfnVersionArn);
        return;
      }
      const published = (await awsSdkManager.lambda.listLayerVersions({ layerName: layer.layerName })).find(
        ({ description }) => parseFastDeploymentLayerVersion(description) === layer.identity
      );
      if (published) {
        arns.set(layer.layerNumber, published.arn);
        return;
      }
      const logger = operationReporter.createChildLogger({
        parentEventType: 'HOTSWAP_UPDATE',
        instanceId: `shared-layer-${layer.layerNumber}`,
        label: `shared layer ${layer.layerNumber}`
      });
      await logger.startEvent({ eventType: 'PUBLISH_LAYER_VERSION', description: 'Publishing layer version' });
      const { LayerVersionArn } = await awsSdkManager.lambda.publishLayerVersion({
        layerName: layer.layerName,
        description: describeFastDeploymentLayerVersion(layer.description, layer.identity),
        compatibleRuntimes: layer.compatibleRuntimes,
        artifactBucketName: deploymentArtifactManager.deploymentBucketName,
        artifactS3Key: layer.s3Key
      });
      await logger.finishEvent({ eventType: 'PUBLISH_LAYER_VERSION' });
      arns.set(layer.layerNumber, LayerVersionArn);
    })
  );
  return arns;
};

/**
 * Deletes the layer versions fast deployments published that no function of the stack runs any more, so they do not
 * accumulate against the account's code storage. CloudFormation's versions are never touched. Best effort: a version
 * left behind costs storage, not correctness, and the next deployment tries again.
 */
export const deleteSupersededSharedLayerVersions = async ({
  layers,
  functionNames = stackManager.existingStackResources
    .filter(({ ResourceType }) => ResourceType === 'AWS::Lambda::Function')
    .map(({ PhysicalResourceId }) => PhysicalResourceId),
  knownLayerArns = new Map()
}: {
  layers: { layerName: string; cfnVersionArn?: string }[];
  /** The stack's functions; their layers are read unless `knownLayerArns` has them. None once the stack is deleted. */
  functionNames?: string[];
  /** The layer ARNs this deployment just gave a function, so they need not be read back. */
  knownLayerArns?: Map<string, string[]>;
}) => {
  try {
    const candidates = (
      await Promise.all(
        layers.map(async (layer) =>
          (await awsSdkManager.lambda.listLayerVersions({ layerName: layer.layerName }).catch(() => []))
            .filter(({ arn }) => arn !== layer.cfnVersionArn)
            .map((version) => ({ ...version, layerName: layer.layerName }))
        )
      )
    ).flat();
    if (!selectSupersededLayerVersions({ versions: candidates, arnsInUse: [] }).length) return;
    const arnsInUse = (
      await Promise.all(
        functionNames.map(
          (lambdaResourceName) =>
            knownLayerArns.get(lambdaResourceName) ?? awsSdkManager.lambda.getFunctionLayerArns({ lambdaResourceName })
        )
      )
    ).flat();
    const superseded = selectSupersededLayerVersions({ versions: candidates, arnsInUse });
    await Promise.all(
      superseded.map(({ layerName, version }) => awsSdkManager.lambda.deleteLayerVersion({ layerName, version }))
    );
    if (superseded.length) tuiManager.debug(`Deleted ${superseded.length} superseded shared layer version(s).`);
  } catch (error) {
    tuiManager.debug(`Could not delete superseded shared layer versions: ${error}`);
  }
};

export const updateFunctionCode = async ({
  workloadName,
  lambdaResourceName,
  cfLogicalName,
  artifactInfo: { s3Key, digest },
  aliasName,
  codeChanged = true,
  layers,
  layerArns,
  deferFinalTags = false,
  devMode
}: {
  workloadName: string;
  lambdaResourceName: string;
  cfLogicalName?: string;
  artifactInfo: { s3Key: string; digest: string };
  aliasName?: string;
  /** False when only the function's shared layers changed; the code is then left alone. */
  codeChanged?: boolean;
  /** The shared layers the function uses after this update, for its tag. Omitted by `dev`, which leaves layers alone. */
  layers?: { layerNumber: number; layerName: string; identity: string }[];
  /** The version of every shared layer by number. Given only when the function's layers change. */
  layerArns?: Map<number, string>;
  /** Keep the update pending until the fast deployment has recorded its release. */
  deferFinalTags?: boolean;
  devMode?: boolean;
}) => {
  const updateWorkloadLogger = devMode
    ? null
    : operationReporter.createChildLogger({
        parentEventType: 'HOTSWAP_UPDATE',
        instanceId: workloadName,
        label: workloadName
      });

  if (!devMode) {
    await updateWorkloadLogger.startEvent({
      eventType: 'UPDATE_FUNCTION_CODE',
      description: 'Updating function code'
    });
  }

  // Invalidate both identities before changing code or layers. A failed final tag write must never leave the
  // function claiming to run the previous layer content.
  await awsSdkManager.lambda.tagFunction({
    lambdaArn: arns.lambdaFromFullName({
      accountId: globalStateManager.targetAwsAccount.awsAccountId,
      region: globalStateManager.region,
      lambdaAwsName: lambdaResourceName
    }),
    tags: [
      { key: tagNames.codeDigest(), value: 'updating' },
      ...(layerArns && layers?.length ? [{ key: tagNames.sharedLayers(), value: 'updating' }] : [])
    ]
  });
  let FunctionArn = arns.lambdaFromFullName({
    accountId: globalStateManager.targetAwsAccount.awsAccountId,
    region: globalStateManager.region,
    lambdaAwsName: lambdaResourceName
  });
  if (codeChanged) {
    ({ FunctionArn } = await awsSdkManager.lambda.updateFunctionCode({
      lambdaResourceName,
      artifactBucketName: awsResourceNames.deploymentBucket(globalStateManager.targetStack.globallyUniqueStackHash),
      artifactS3Key: s3Key
    }));
    await awsSdkManager.lambda.waitUntilUpdated({ lambdaResourceName });
  }
  // The layers follow the code: Lambda takes one update at a time, and the new code imports from the new layer.
  let updatedLayerArns: string[] | undefined;
  if (layerArns && layers?.length) {
    updatedLayerArns =
      (cfLogicalName && resolveTemplateLayerArns(templateManager.getTemplate(), cfLogicalName, layerArns)) ||
      replaceSharedLayerArns(
        await awsSdkManager.lambda.getFunctionLayerArns({ lambdaResourceName }),
        layers.flatMap(({ layerNumber, layerName }) => {
          const arn = layerArns.get(layerNumber);
          return arn ? [{ layerName, arn }] : [];
        })
      );
    await awsSdkManager.lambda.updateFunctionLayers({ lambdaResourceName, layerArns: updatedLayerArns });
    await awsSdkManager.lambda.waitUntilUpdated({ lambdaResourceName });
  }
  if (aliasName) {
    const { Version: version } = await awsSdkManager.lambda.publishVersion({ lambdaResourceName });
    await awsSdkManager.lambda.updateAlias({ lambdaResourceName, aliasName, version });
  }
  // Written last: the next deployment skips a function whose digest tag already matches its code. Without the tag the
  // next deployment updates the function again, so a failure here does not fail this one.
  const tagUpdatedFunction = () =>
    awsSdkManager.lambda
      .tagFunction({
        lambdaArn: FunctionArn,
        tags: [
          { key: tagNames.codeDigest(), value: digest },
          ...(layers?.length ? [{ key: tagNames.sharedLayers(), value: formatSharedLayersTag(layers) }] : [])
        ]
      })
      .catch((error) => tuiManager.warn(`Could not tag ${workloadName} with its code digest: ${error}`));
  if (!deferFinalTags) await tagUpdatedFunction();

  if (!devMode) {
    await updateWorkloadLogger.finishEvent({ eventType: 'UPDATE_FUNCTION_CODE' });
  }

  return { FunctionArn, updatedLayerArns, tagUpdatedFunction };
};
