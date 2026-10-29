import { configManager } from '@domain-services/config-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { getRunningArtifactDigest } from '@domain-services/deployment-artifact-manager/kept-function-code';
import { templateManager } from '@domain-services/template-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';

/**
 * A deployed function the session leaves out. It keeps running the code it ran before, or the code the dev stack built
 * for it, and changes to its source are not deployed: status says so, so that a request to it is not taken for a test
 * of the current source.
 */
export type FunctionNotInSession = {
  name: string;
  /** The digest of the artifact it runs, by its tags; none while an earlier update of its code did not finish. */
  artifactDigest?: string;
  /**
   * When the function last changed (Lambda's `LastModified`). A dev stack update changes a function the session leaves
   * out only together with its code (`findKeptFunctionsWithChangedConfiguration`), so this is when its code was deployed.
   */
  codeDeployedAt?: string;
  message: string;
};

const formatTime = (time: Date) => time.toISOString().replace(/:\d\d\.\d+Z$/, 'Z');

export const describeFunctionNotInSession = ({
  name,
  artifactDigest,
  lastModified
}: {
  name: string;
  artifactDigest: string | undefined;
  /** The function's `LastModified`, when it could be read. */
  lastModified: string | undefined;
}): FunctionNotInSession => {
  if (artifactDigest === 'updating') {
    return {
      name,
      message:
        'not in this session; an earlier update of its code did not finish, so it runs either the code before it or the code it deployed'
    };
  }
  const deployedAt = lastModified && !Number.isNaN(Date.parse(lastModified)) ? new Date(lastModified) : undefined;
  const when = deployedAt ? `at ${formatTime(deployedAt)}` : 'earlier';
  return {
    name,
    ...(artifactDigest ? { artifactDigest } : {}),
    ...(deployedAt ? { codeDeployedAt: deployedAt.toISOString() } : {}),
    message: `not in this session; runs the code deployed ${when}${artifactDigest ? ` (artifact ${artifactDigest.slice(0, 12)})` : ''}, which may differ from your current source`
  };
};

/** One notice for all of them, for the start's result and the terminal. */
export const formatFunctionsNotInSessionNotice = (functions: FunctionNotInSession[]) =>
  functions.length
    ? `Functions not in this session keep running their deployed code, and changes to their source are not deployed: ${functions
        .map(({ name, message }) => `\`${name}\` ${message.replace(/^not in this session; /, '')}`)
        .join('; ')}. Start the session with a function selected to run your current source.`
    : undefined;

/** Reads what each function the session leaves out runs, and since when: its tags and its configuration. */
export const loadFunctionsNotInSession = async (names: ReadonlySet<string>): Promise<FunctionNotInSession[]> => {
  const functions = configManager.functions.filter(({ name }) => names.has(name));
  return Promise.all(
    functions.map(async ({ name, cfLogicalName, resourceName }) => {
      const configuration = await awsSdkManager.lambda
        .getFunctionDeployment({ lambdaResourceName: resourceName })
        .then(({ Configuration }) => Configuration)
        .catch(() => undefined);
      return describeFunctionNotInSession({
        name,
        artifactDigest: getRunningArtifactDigest({
          liveTags: stackManager.existingStackResources.find(
            ({ LogicalResourceId }) => LogicalResourceId === cfLogicalName
          )?.tags,
          templateTags: (
            templateManager.oldTemplate.Resources?.[cfLogicalName] as { Properties?: { Tags?: unknown } } | undefined
          )?.Properties?.Tags
        }),
        lastModified: configuration?.LastModified
      });
    })
  );
};
