import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { join } from 'node:path';
import { ensureLambdaImage, extractZip, invokeInLambdaRuntime } from '../../scripts/packaging-archives/lambda-runtime';
import { GetFunctionConfigurationCommand, GetLayerVersionByArnCommand } from '@aws-sdk/client-lambda';
import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import AdmZip from 'adm-zip';
import type { Family } from './families';
import { installedPackageFiles } from './harness';

// Large enough to become a shared chunk with default split-layer thresholds.
const payload = 'shared-layer-'.repeat(1024);
const snapshots = new Map<
  string,
  {
    codes: string[];
    layers: string[][];
    objects: { key: string; modified: number }[];
  }
>();

/** Real source CLI deployment of two functions sharing a package, with only the first function edited on update. */
export const splitLambdaFamily: Family = {
  name: 'split-lambda-layers',
  config: () => ({
    resources: Object.fromEntries(
      ['first', 'second'].map((name) => [
        name,
        {
          type: 'function',
          properties: {
            packaging: { type: 'js-bundle', properties: { entryfilePath: `${name}.ts` } }
          }
        }
      ])
    )
  }),
  files: (version) => ({
    ...installedPackageFiles({ name: 'fixture-shared', source: `export const shared = ${JSON.stringify(payload)};\n` }),
    'first.ts': `import { shared } from 'fixture-shared'; export default async () => ({ marker: 'first-v${version}', sharedLength: shared.length });`,
    'second.ts':
      "import { shared } from 'fixture-shared'; export default async () => ({ marker: 'second-v1', sharedLength: shared.length });"
  }),
  assertEffects: async ({ step, version, clients, physical, deploymentBucket, checks }) => {
    const names = [physical('FirstFunction'), physical('SecondFunction')];
    const configurations = await Promise.all(
      names.map((FunctionName) => clients.lambda.send(new GetFunctionConfigurationCommand({ FunctionName })))
    );
    const codes = configurations.map((configuration) => {
      assert.ok(configuration.CodeSha256, 'the emulator must report the deployed code hash');
      return configuration.CodeSha256;
    });
    const layers = configurations.map((configuration) =>
      (configuration.Layers ?? []).map(({ Arn }) => {
        assert.ok(Arn, 'a deployed layer must have an ARN');
        return Arn;
      })
    );
    assert.ok(layers[0]!.length > 0, 'split functions must use a shared chunk layer');
    assert.deepEqual(layers[0], layers[1], 'both functions must reference the same published layer');
    const bucket = deploymentBucket;
    const keys =
      (await clients.s3.send(new ListObjectsV2Command({ Bucket: bucket }))).Contents?.flatMap(({ Key }) =>
        Key && (Key.startsWith('shared-layer') || Key.startsWith('first/') || Key.startsWith('second/')) ? [Key] : []
      ).sort() ?? [];
    assert.ok(keys.length > 0, 'the deployment bucket must contain the uploaded artifacts');
    const storedObjects = await Promise.all(
      keys.map(async (Key) => {
        const object = await clients.s3.send(new GetObjectCommand({ Bucket: bucket, Key }));
        assert.ok(object.LastModified, 'S3 must report when the uploaded object was last written');
        return {
          key: Key,
          bytes: Buffer.from(await object.Body!.transformToByteArray()),
          modified: object.LastModified.getTime()
        };
      })
    );
    const objects = storedObjects.map(({ key, modified }) => ({ key, modified }));
    // Source maps stay out of every function and layer ZIP, in a bundle per artifact digest.
    const sourceMapKeys =
      (await clients.s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'source-maps/' }))).Contents?.map(
        ({ Key }) => Key
      ) ?? [];
    for (const { key, bytes } of storedObjects) {
      const maps = new AdmZip(bytes)
        .getEntries()
        .map(({ entryName }) => entryName)
        .filter((entryName) => entryName.endsWith('.map'));
      assert.deepEqual(maps, [], `${key} must not carry source maps`);
      const [name, file] = key.split('/') as [string, string];
      const digest = file
        .replace(/\.zip$/, '')
        .split('-')
        .at(-1);
      assert.ok(sourceMapKeys.includes(`source-maps/${name}/${digest}.json`), `the maps of ${key} must be stored`);
    }
    const previous = snapshots.get(names[0]!);
    if (step === 'update') {
      assert.ok(previous, 'create must precede update');
      assert.notEqual(codes[0], previous.codes[0], 'editing first must replace its deployed bytes');
      assert.equal(codes[1], previous.codes[1], 'editing first must preserve second’s deployed bytes');
      assert.deepEqual(layers, previous.layers, 'editing a private entrypoint must reuse the published shared layer');
      assert.deepEqual(
        objects.filter(({ key }) => !key.startsWith('first/')),
        previous.objects.filter(({ key }) => !key.startsWith('first/')),
        'a private edit must not overwrite untouched function or shared-layer objects'
      );
    } else if (step === 'unchanged') {
      assert.deepEqual(
        { codes, layers, objects },
        previous,
        'unchanged redeploy must reuse code, layers and S3 objects'
      );
    }
    // The pinned emulator cannot resolve an absolute /opt import in its Node worker. Execute the actual
    // uploaded ZIPs in the official runtime, while MiniStack owns deployment, storage and layer publication.
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-deployed-split-'));
    const extractedDirectories: string[] = [];
    try {
      const uploaded = storedObjects.map(({ key, bytes }) => ({
        key,
        bytes,
        hash: createHash('sha256').update(bytes).digest('base64')
      }));
      const layerZips: string[] = [];
      for (const [index, Arn] of layers[0]!.entries()) {
        const published = await clients.lambda.send(new GetLayerVersionByArnCommand({ Arn }));
        const object = uploaded.find(
          ({ key, hash }) => key.startsWith('shared-layer-') && hash === published.Content?.CodeSha256
        );
        assert.ok(object, `the published layer ${Arn} must name an uploaded ZIP`);
        const zip = join(directory, `layer-${index}.zip`);
        await writeFile(zip, object.bytes);
        layerZips.push(zip);
      }
      const layerDirectory = await extractZip(layerZips);
      extractedDirectories.push(layerDirectory);
      const image = 'public.ecr.aws/lambda/nodejs:24';
      ensureLambdaImage(image);
      for (const [index, name] of ['first', 'second'].entries()) {
        const object = uploaded.find(({ key, hash }) => key.startsWith(`${name}/`) && hash === codes[index]);
        assert.ok(object, `${name} must execute the exact uploaded ZIP whose hash Lambda reports`);
        const zip = join(directory, `${name}.zip`);
        await writeFile(zip, object.bytes);
        const functionDirectory = await extractZip(zip);
        extractedDirectories.push(functionDirectory);
        const result = await invokeInLambdaRuntime({
          image,
          functionDirectory,
          layerDirectory,
          handler: 'index.default',
          event: {}
        });
        assert.equal(result.status, 200);
        assert.deepEqual(JSON.parse(result.body), {
          marker: index === 0 ? `first-v${version}` : 'second-v1',
          sharedLength: payload.length
        });
      }
    } finally {
      await Promise.all([directory, ...extractedDirectories].map((path) => rm(path, { recursive: true, force: true })));
    }
    // S3 timestamps have second precision. Finish beyond that second so even an identical overwrite
    // in the next deploy is observable, without changing the customer's bucket versioning policy.
    await delay(Math.max(0, Math.max(...objects.map(({ modified }) => modified)) + 1_001 - Date.now()));
    snapshots.set(names[0]!, { codes, layers, objects });
    checks.push(
      'both functions execute through the same shared layer; private edits and unchanged redeploy reuse untouched artifacts; no ZIP carries a map, each has a stored bundle'
    );
  }
};
