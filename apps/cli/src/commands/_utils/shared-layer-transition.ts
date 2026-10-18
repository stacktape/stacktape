import AdmZip from 'adm-zip';
import {
  archiveFiles,
  createSharedLayerCompatibilityCheck
} from '@domain-services/deployment-artifact-manager/shared-layer-compatibility';
import { unionSharedLayerTransitions } from '@domain-services/deployment-artifact-manager/shared-layer-transition';
import { startTiming } from '@utils/timings';
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
): Promise<Map<string, { layerArns?: string[]; layerFirst?: boolean }>> => {
  const downloads = new Map<string, Promise<AdmZip>>();
  const publications = new Map<string, Promise<string>>();
  let activeDownloads = 0;
  const waiting: (() => void)[] = [];
  const download = (key: string, location: () => Promise<string | undefined>) => {
    if (!downloads.has(key))
      downloads.set(
        key,
        (async () => {
          await new Promise<void>((resolve) => {
            const start = () => {
              activeDownloads++;
              resolve();
            };
            if (activeDownloads < 4) start();
            else waiting.push(start);
          });
          try {
            return new AdmZip(await awsSdkManager.lambda.downloadArtifact({ location: await location() }));
          } finally {
            activeDownloads--;
            waiting.shift()?.();
          }
        })()
      );
    return downloads.get(key)!;
  };
  const endPreparation = startTiming('fast-deploy:prepare-layers');
  const compatible = createSharedLayerCompatibilityCheck();
  const transitions = new Map<string, { layerArns?: string[]; layerFirst?: boolean }>();
  const prepared: {
    fn: FunctionUpdate;
    currentArns: string[];
    bridges: ReturnType<typeof buildSharedLayerTransitions>;
    combinedSize: number;
  }[] = [];
  // Keep memory bounded when a stack has many large function archives. Layer downloads and bridge publications reuse
  // one promise per version/content; they are not repeated for every consumer.
  const candidates = functions.filter(({ codeChanged, changedLayers }) => codeChanged && changedLayers.length);
  let cursor = 0;
  const prepare = async (fn: FunctionUpdate) => {
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
    const oldLayers = new Map(currentLayers.flatMap(({ zip }) => [...archiveFiles(zip, '/opt')]));
    const nextByName = new Map(nextLayers.map(({ layerName, zip }) => [layerName, zip]));
    const mounted = currentLayers.map(({ arn, zip }) => nextByName.get(arn.split(':')[6]!) ?? zip);
    for (const { layerName, zip } of nextLayers)
      if (!currentArns.some((arn) => arn.split(':')[6] === layerName)) mounted.push(zip);
    const nextFiles = new Map(mounted.flatMap((zip) => [...archiveFiles(zip, '/opt')]));
    if (
      compatible({
        oldFunction: archiveFiles(functionZip, '/var/task'),
        nextFunction: archiveFiles(nextZip, '/var/task'),
        oldLayers,
        nextLayers: nextFiles
      })
    ) {
      transitions.set(fn.lambdaResourceName, { layerFirst: true });
      return;
    }
    const bridges = buildSharedLayerTransitions({
      functionZip,
      nextFunctionSize: unzippedSize(nextZip),
      currentLayers,
      nextLayers
    });
    const unchangedSize = currentLayers
      .filter(({ arn }) => !changed.some(({ layerName }) => arn.split(':')[6] === layerName))
      .reduce((sum, { zip }) => sum + unzippedSize(zip), 0);
    prepared.push({
      fn,
      currentArns,
      bridges,
      combinedSize: Math.max(unzippedSize(functionZip), unzippedSize(nextZip)) + unchangedSize
    });
  };
  const workers = await Promise.allSettled(
    Array.from({ length: Math.min(4, candidates.length) }, async () => {
      while (cursor < candidates.length) await prepare(candidates[cursor++]!);
    })
  );
  const failed = workers.find((result) => result.status === 'rejected');
  if (failed?.status === 'rejected') throw failed.reason;
  const union = unionSharedLayerTransitions(prepared);
  // Validate every selected ZIP before publishing any of them.
  for (const { bridges } of prepared) for (const bridge of bridges) void (union?.get(bridge.layerNumber) ?? bridge).zip;
  for (const { fn, currentArns, bridges } of prepared) {
    const changed = fn.changedLayers.map(({ layerNumber }) =>
      layers.find((layer) => layer.layerNumber === layerNumber)!
    );
    const replacements = await Promise.all(
      bridges
        .map((bridge) => union?.get(bridge.layerNumber) ?? bridge)
        .map(async ({ layerNumber, identity, zip }) => {
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
    transitions.set(fn.lambdaResourceName, { layerArns: replaceSharedLayerArns(currentArns, replacements) });
  }
  endPreparation({
    functions: candidates.length,
    bridges: publications.size,
    layerFirst: candidates.length - prepared.length
  });
  return transitions;
};
