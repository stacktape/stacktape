import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { SourceMapManifest } from '@stacktape/console-api/source-maps';
import { recordSourceMapManifest } from '@application-services/stacktape-trpc-api-manager/operation-recording';
import { tuiManager } from '@application-services/tui-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { getFunctionAliases } from '@domain-services/deployment-artifact-manager/source-maps';
import { tagNames } from '@stacktape/naming/tag-names';
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

export type RecordedSourceMaps = { manifest: SourceMapManifest; aliases: Record<string, string> };

/**
 * Tells the Console which source maps describe each function `template` deploys, before the code switches: an error
 * from the new code can arrive while the deployment is still running. Returns what `recordSourceMapActivation` needs,
 * or `undefined` when no function has stored maps.
 */
export const recordSourceMapsBeforeSwitch = async (
  template: CloudFormationTemplate
): Promise<RecordedSourceMaps | undefined> => {
  const manifest = deploymentArtifactManager.getSourceMapManifest(template);
  if (!manifest.functions.length) return undefined;
  await record(manifest);
  return { manifest, aliases: getFunctionAliases(template) };
};

/**
 * Records, for each function that now runs the code its maps describe, when Lambda started running it (its
 * `LastModified`) and, behind an alias, which published version runs it. An execution environment runs the code that
 * was current when it started, or its published version's, so the Console picks the maps of the code that threw.
 *
 * Call it whether or not the deployment succeeded: a fast deployment that failed partway has switched some functions,
 * and a failed CloudFormation update may have switched some or rolled them back. The code-digest tag tells which:
 * a function is counted only when it carries the digest of the maps. Never throws.
 */
export const recordSourceMapActivation = async (recorded: RecordedSourceMaps | undefined) => {
  if (!recorded) return;
  const functions = [...recorded.manifest.functions];
  await processConcurrently(
    functions.map((entry, index) => async () => {
      try {
        const { LastModified, FunctionArn } = await awsSdkManager.lambda.getFunction({
          lambdaResourceName: entry.lambdaName
        });
        const tags = await awsSdkManager.lambda.listTags({ lambdaArn: FunctionArn! });
        if (tags[tagNames.codeDigest()] !== entry.digest) return;
        const activeSince = parseLambdaTimestamp(LastModified);
        if (!Number.isFinite(activeSince)) return;
        const aliasName = recorded.aliases[entry.lambdaName];
        const version = aliasName
          ? (await awsSdkManager.lambda.getAlias({ lambdaResourceName: entry.lambdaName, aliasName })).FunctionVersion
          : undefined;
        functions[index] = { ...entry, activeSince, ...(version && /^\d+$/.test(version) ? { version } : {}) };
      } catch (error) {
        tuiManager.debug(`Could not read whether ${entry.lambdaName} runs the new code: ${error}`);
      }
    }),
    10
  );
  await record({ functions });
};
