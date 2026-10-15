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
 * The version the alias serves, if it was published from the code `$LATEST` runs now. A published version keeps the
 * `CodeSha256` and `LastModified` of the `$LATEST` it was published from, so both must match: a failed publication
 * leaves the alias on an older version, possibly with byte-identical code but other maps. Anything else, a read error
 * included, gives no version, and the Console leaves that version's errors unmapped.
 */
export const getPublishedVersionOfLatest = async ({
  lambdaName,
  aliasName,
  latest,
  lambda = awsSdkManager.lambda
}: {
  lambdaName: string;
  aliasName: string;
  latest: { CodeSha256?: string | undefined; LastModified?: string | undefined };
  lambda?: Pick<typeof awsSdkManager.lambda, 'getAlias' | 'getFunction'>;
}): Promise<string | undefined> => {
  try {
    const { FunctionVersion: version } = await lambda.getAlias({ lambdaResourceName: lambdaName, aliasName });
    if (!version || !/^\d+$/.test(version)) return undefined;
    const published = await lambda.getFunction({ lambdaResourceName: lambdaName, qualifier: version });
    const sameCode =
      Boolean(latest.CodeSha256) &&
      published.CodeSha256 === latest.CodeSha256 &&
      published.LastModified === latest.LastModified;
    return sameCode ? version : undefined;
  } catch {
    return undefined;
  }
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
        const latest = await awsSdkManager.lambda.getFunction({ lambdaResourceName: entry.lambdaName });
        const tags = await awsSdkManager.lambda.listTags({ lambdaArn: latest.FunctionArn! });
        if (tags[tagNames.codeDigest()] !== entry.digest) return;
        const activeSince = parseLambdaTimestamp(latest.LastModified);
        if (!Number.isFinite(activeSince)) return;
        const aliasName = recorded.aliases[entry.lambdaName];
        const version = aliasName
          ? await getPublishedVersionOfLatest({ lambdaName: entry.lambdaName, aliasName, latest })
          : undefined;
        functions[index] = { ...entry, activeSince, ...(version ? { version } : {}) };
      } catch (error) {
        tuiManager.debug(`Could not read whether ${entry.lambdaName} runs the new code: ${error}`);
      }
    }),
    10
  );
  await record({ functions });
};
