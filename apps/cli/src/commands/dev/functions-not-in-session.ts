import { configManager } from '@domain-services/config-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { getRunningArtifactDigest } from '@domain-services/deployment-artifact-manager/kept-function-code';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { findTemplateImageTag } from '@domain-services/deployment-artifact-manager/kept-image';
import { parseImageTag } from '@domain-services/deployment-artifact-manager/utils';
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

/**
 * A batch job or AgentCore runtime the session leaves out (`configManager.devSkipsRemoteImages`). It keeps running the
 * image the dev stack ran before, unless the start built it (`decideSkippedImages`), and changes to its source are not
 * deployed.
 */
export type ImageNotInSession = {
  name: string;
  /** The image the dev stack names for it; none when the template does not name exactly one. */
  image?: string;
  /** The digest of the image's inputs, from its tag. */
  artifactDigest?: string;
  /** When the image was pushed to the stack's repository. */
  imagePushedAt?: string;
  message: string;
};

export const describeImageNotInSession = ({
  name,
  image,
  artifactDigest,
  pushedAt
}: {
  name: string;
  image: string | undefined;
  artifactDigest: string | undefined;
  pushedAt: Date | undefined;
}): ImageNotInSession => {
  const when = pushedAt ? `pushed at ${formatTime(pushedAt)}` : 'deployed earlier';
  return {
    name,
    ...(image ? { image } : {}),
    ...(artifactDigest ? { artifactDigest } : {}),
    ...(pushedAt ? { imagePushedAt: pushedAt.toISOString() } : {}),
    message: `not in this session, because the session leaves out functions; runs the image ${when}${artifactDigest ? ` (artifact ${artifactDigest.slice(0, 12)})` : ''}, which may differ from your current source`
  };
};

export const formatImagesNotInSessionNotice = (images: ImageNotInSession[]) =>
  images.length
    ? `Batch jobs and AgentCore runtimes are not in a session that leaves out functions. They keep running their deployed images, and changes to their source are not deployed: ${images
        .map(
          ({ name, message }) =>
            `\`${name}\` ${message.replace(/^not in this session, because the session leaves out functions; /, '')}`
        )
        .join('; ')}. Start the session with every function selected to build them from your current source.`
    : undefined;

/** Reads which image each remote workload the session leaves out runs, and when it was pushed. */
export const loadImagesNotInSession = async (): Promise<ImageNotInSession[]> => {
  if (!configManager.devSkipsRemoteImages) return [];
  const images = [
    ...configManager.containersToPackage.map(({ jobName, workloadName }) => ({ jobName, workloadName })),
    ...configManager.agentCoreRuntimesRequiringPackaging.map(({ jobName, name }) => ({ jobName, workloadName: name }))
  ];
  const { repositoryUrl, repositoryName } = deploymentArtifactManager;
  return Promise.all(
    images.map(async ({ jobName, workloadName }) => {
      const tag = findTemplateImageTag({ template: templateManager.oldTemplate ?? {}, repositoryUrl, jobName });
      const pushedAt = tag
        ? await awsSdkManager.ecr.getImagePushedAt({ repositoryName, imageTag: tag }).catch(() => undefined)
        : undefined;
      // A workload of several containers is listed by its job name, which names the container.
      const name = images.filter((image) => image.workloadName === workloadName).length > 1 ? jobName : workloadName;
      return describeImageNotInSession({
        name,
        image: tag ? `${repositoryUrl}:${tag}` : undefined,
        artifactDigest: tag ? parseImageTag(tag).digest : undefined,
        pushedAt
      });
    })
  );
};
