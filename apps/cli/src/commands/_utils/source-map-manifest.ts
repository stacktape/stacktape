import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { SourceMapManifest } from '@stacktape/console-api/source-maps';
import { recordSourceMapManifest } from '@application-services/stacktape-trpc-api-manager/operation-recording';
import { tuiManager } from '@application-services/tui-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { processConcurrently } from '@utils/misc';

/** Lambda writes `LastModified` as `2026-10-15T10:20:30.123+0000`; the offset needs a colon to be ISO 8601. */
const parseLambdaTimestamp = (value: string | undefined) =>
  value ? Date.parse(value.replace(/([+-]\d\d)(\d\d)$/, '$1:$2')) : Number.NaN;

const record = async (manifest: SourceMapManifest) => {
  try {
    await recordSourceMapManifest(manifest);
  } catch (error) {
    tuiManager.warn(
      `The Stacktape Console could not record this deployment's source maps, so its errors will point into the bundled code: ${error}`
    );
  }
};

/**
 * Tells the Console which source maps describe each function `template` deploys, before the code switches: an error
 * from the new code can arrive while the deployment is still running. Returns the manifest for
 * `recordSourceMapActivation`, or `undefined` when no function has stored maps.
 */
export const recordSourceMapsBeforeSwitch = async (template: CloudFormationTemplate) => {
  const manifest = deploymentArtifactManager.getSourceMapManifest(template);
  if (!manifest.functions.length) return undefined;
  await record(manifest);
  return manifest;
};

/**
 * Records when each function started running the code its maps describe: Lambda's `LastModified` after the switch. An
 * execution environment runs the code that was current when it started, so the Console compares this time with the
 * start of the environment that logged an error, and an error from an older environment gets its own maps.
 */
export const recordSourceMapActivation = async (manifest: SourceMapManifest | undefined) => {
  if (!manifest) return;
  // A function whose time cannot be read keeps its entry: the maps still serve errors the Console can date otherwise.
  const functions = [...manifest.functions];
  await processConcurrently(
    functions.map((entry, index) => async () => {
      try {
        const { LastModified } = await awsSdkManager.lambda.getFunction({ lambdaResourceName: entry.lambdaName });
        const activeSince = parseLambdaTimestamp(LastModified);
        if (Number.isFinite(activeSince)) functions[index] = { ...entry, activeSince };
      } catch (error) {
        tuiManager.debug(`Could not read when ${entry.lambdaName} started running the new code: ${error}`);
      }
    }),
    10
  );
  await record({ functions });
};
