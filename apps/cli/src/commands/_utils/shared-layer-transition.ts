import AdmZip from 'adm-zip';
import { readFile } from 'node:fs/promises';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { existsSync } from 'node:fs';
import {
  buildSharedLayerTransitions,
  unzippedSize
} from '@domain-services/deployment-artifact-manager/shared-layer-transition';
import {
  describeFastDeploymentLayerVersion,
  replaceSharedLayerArns
} from '@domain-services/deployment-artifact-manager/shared-layers';
import type { getLambdaFunctionHotswapInformation, SharedLayerHotswapInformation } from './fn-deployment';

type FunctionUpdate = ReturnType<typeof getLambdaFunctionHotswapInformation>;

/** Prepare every bridge before changing any function, so size or publication failures leave serving code alone. */
export const prepareSharedLayerTransitions = async (
  functions: FunctionUpdate[],
  layers: SharedLayerHotswapInformation[]
): Promise<Map<string, string[]>> => {
  const downloads = new Map<string, Promise<AdmZip>>();
  const publications = new Map<string, Promise<string>>();
  const download = (key: string, location: () => Promise<string | undefined>) => {
    if (!downloads.has(key))
      downloads.set(
        key,
        (async () => {
          return new AdmZip(await awsSdkManager.lambda.downloadArtifact({ location: await location() }));
        })()
      );
    return downloads.get(key)!;
  };
  const transitions = new Map<string, string[]>();
  // Keep memory bounded when a stack has many large function archives. Layer downloads and bridge publications reuse
  // one promise per version/content; they are not repeated for every consumer.
  for (const fn of functions.filter(({ codeChanged, changedLayers }) => codeChanged && changedLayers.length)) {
    const deployed = await awsSdkManager.lambda.getFunctionDeployment({ lambdaResourceName: fn.lambdaResourceName });
    const currentArns = (deployed.Configuration?.Layers ?? []).flatMap(({ Arn }) => (Arn ? [Arn] : []));
    const functionZip = await download(fn.lambdaResourceName, async () => deployed.Code?.Location);
    const currentLayers = await Promise.all(
      currentArns.map(async (arn) => ({
        arn,
        zip: await download(arn, async () => (await awsSdkManager.lambda.getLayerVersion({ arn })).Content?.Location)
      }))
    );
    const changed = fn.changedLayers.map(({ layerNumber }) =>
      layers.find((layer) => layer.layerNumber === layerNumber)!
    );
    const nextLayers = await Promise.all(
      changed.map(async ({ layerNumber, layerName }) => {
        const artifact = packagingManager.getLayerArtifacts().find((layer) => layer.layerNumber === layerNumber)!;
        if (!existsSync(`${artifact.layerPath}.zip`)) await packagingManager.publishSharedLayer([artifact]);
        return { layerNumber, layerName, zip: new AdmZip(await readFile(`${artifact.layerPath}.zip`)) };
      })
    );
    const nextZip = new AdmZip(
      fn.artifactInfo.artifactPath
        ? await readFile(fn.artifactInfo.artifactPath)
        : Buffer.from(
            await awsSdkManager.s3.getObjectBytes({
              bucketName: deploymentArtifactManager.deploymentBucketName,
              s3Key: fn.artifactInfo.s3Key
            })
          )
    );
    const bridges = buildSharedLayerTransitions({
      functionZip,
      nextFunctionSize: unzippedSize(nextZip),
      currentLayers,
      nextLayers
    });
    const replacements = await Promise.all(
      bridges.map(async ({ layerNumber, identity, zip }) => {
        const layer = changed.find((candidate) => candidate.layerNumber === layerNumber)!;
        const key = `${layer.layerName}:${identity}`;
        if (!publications.has(key))
          publications.set(
            key,
            awsSdkManager.lambda
              .publishLayerVersion({
                layerName: layer.layerName,
                description: describeFastDeploymentLayerVersion(layer.description, identity),
                compatibleRuntimes: layer.compatibleRuntimes,
                zipFile: zip
              })
              .then(({ LayerVersionArn }) => LayerVersionArn!)
          );
        return { layerName: layer.layerName, arn: await publications.get(key)! };
      })
    );
    transitions.set(fn.lambdaResourceName, replaceSharedLayerArns(currentArns, replacements));
  }
  return transitions;
};
