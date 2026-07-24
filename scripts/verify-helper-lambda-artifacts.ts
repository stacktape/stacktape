import { strict as assert } from 'node:assert';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { loadHelperLambdaDetailsFromDir } from '../src/utils/helper-lambdas';
import { CLI_BUILD_DIST_FOLDER_PATH, HELPER_LAMBDAS_FOLDER_NAME } from '../shared/naming/project-fs-paths';

const requiredHelperLambdas = [
  'batchJobTriggerLambda',
  'cdnOriginRequestLambda',
  'cdnOriginResponseLambda',
  'stacktapeServiceLambda'
] as const;

export const verifyHelperLambdaArtifacts = async ({
  helperLambdasDir = join(CLI_BUILD_DIST_FOLDER_PATH, HELPER_LAMBDAS_FOLDER_NAME)
}: {
  helperLambdasDir?: string;
} = {}) => {
  const details = await loadHelperLambdaDetailsFromDir({ helperLambdasDir });
  assert.deepEqual(Object.keys(details).sort(), [...requiredHelperLambdas].sort());

  for (const name of requiredHelperLambdas) {
    const artifact = details[name];
    assert.match(artifact.digest, /^[a-f0-9]{40}$/, `${name} must use a content-addressed SHA-1 digest`);
    assert.equal(artifact.handler, 'index.default');
    assert.ok((await stat(artifact.artifactPath)).size > 0, `${name} artifact must not be empty`);

    const zipEntries = new Set(new AdmZip(artifact.artifactPath).getEntries().map(({ entryName }) => entryName));
    assert.ok(zipEntries.has('index.js'), `${name} artifact must contain its runtime entrypoint`);
    assert.ok(zipEntries.has('index.js.map'), `${name} artifact must contain its source map`);
  }

  return requiredHelperLambdas.length;
};

const main = async () => {
  const count = await verifyHelperLambdaArtifacts();
  console.info(`Verified ${count} packaged helper Lambda artifacts.`);
};

if (import.meta.main) {
  main();
}
