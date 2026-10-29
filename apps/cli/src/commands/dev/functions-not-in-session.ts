import type { _Object } from '@aws-sdk/client-s3';
import { configManager } from '@domain-services/config-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { getTagValue } from '@domain-services/deployment-artifact-manager/shared-layers';
import { parseBucketObjectS3Key } from '@domain-services/deployment-artifact-manager/utils';
import { tagNames } from '@stacktape/naming/tag-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';

/**
 * A deployed function the session leaves out. It keeps running the code it ran before, or the code the dev stack built
 * for it when it had none, and changes to its source are not deployed: status says so, so that a request to it is not
 * taken for a test of the current source.
 */
export type FunctionNotInSession = {
  name: string;
  /** The digest of the artifact it runs, by its tags; none while an earlier update of its code did not finish. */
  artifactDigest?: string;
  /** When the deployment bucket first stored that artifact, close to when it was deployed. */
  codeDeployedAt?: string;
  message: string;
};

const formatTime = (time: Date) => time.toISOString().replace(/:\d\d\.\d+Z$/, 'Z');

export const describeFunctionNotInSession = ({
  name,
  artifactDigest,
  storedObjects
}: {
  name: string;
  artifactDigest: string | undefined;
  /** The deployment bucket's objects; the earliest one with the function's name and digest dates its code. */
  storedObjects: Pick<_Object, 'Key' | 'LastModified'>[];
}): FunctionNotInSession => {
  if (artifactDigest === 'updating') {
    return {
      name,
      message:
        'not in this session; an earlier update of its code did not finish, so it runs either the code before it or the code it deployed'
    };
  }
  if (!artifactDigest) {
    return {
      name,
      message: 'not in this session; runs the code deployed earlier, which may differ from your current source'
    };
  }
  const storedAt = storedObjects
    .filter(({ Key }) => {
      const parsed = Key ? parseBucketObjectS3Key(Key) : undefined;
      return parsed?.name === name && parsed.digest === artifactDigest;
    })
    .flatMap(({ LastModified }) => (LastModified ? [new Date(LastModified)] : []))
    .toSorted((left, right) => left.getTime() - right.getTime())
    .at(0);
  return {
    name,
    artifactDigest,
    ...(storedAt ? { codeDeployedAt: storedAt.toISOString() } : {}),
    message: `not in this session; runs the code deployed ${storedAt ? `at ${formatTime(storedAt)}` : 'earlier'} (artifact ${artifactDigest.slice(0, 12)}), which may differ from your current source`
  };
};

/** One notice for all of them, for the start's result and the terminal. */
export const formatFunctionsNotInSessionNotice = (functions: FunctionNotInSession[]) =>
  functions.length
    ? `Functions not in this session keep running their deployed code, and changes to their source are not deployed: ${functions
        .map(({ name, message }) => `\`${name}\` ${message.replace(/^not in this session; /, '')}`)
        .join('; ')}. Start the session with a function selected to run your current source.`
    : undefined;

/** Reads what each function the session leaves out runs: its tags, and one listing of the deployment bucket. */
export const loadFunctionsNotInSession = async (names: ReadonlySet<string>): Promise<FunctionNotInSession[]> => {
  const functions = configManager.functions.filter(({ name }) => names.has(name));
  if (!functions.length) return [];
  const storedObjects = await awsSdkManager.s3
    .listObjects(deploymentArtifactManager.deploymentBucketName)
    .catch((): _Object[] => []);
  return functions.map(({ name, cfLogicalName }) => {
    const tags = stackManager.existingStackResources.find(
      ({ LogicalResourceId }) => LogicalResourceId === cfLogicalName
    )?.tags;
    return describeFunctionNotInSession({
      name,
      // Older CLIs tagged only the code digest, which is the artifact digest of a function without shared layers.
      artifactDigest: getTagValue(tags, tagNames.artifactDigest()) ?? getTagValue(tags, tagNames.codeDigest()),
      storedObjects
    });
  });
};
