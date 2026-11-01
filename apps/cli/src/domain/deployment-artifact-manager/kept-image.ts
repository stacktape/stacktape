/**
 * Which images a dev stack update leaves on the image they run, instead of building and pushing them.
 *
 * Batch jobs and AgentCore runtimes run in AWS, and dev mode cannot select them. A session that leaves functions out
 * leaves them out too: the developer works on part of the backend, and the image's build context is often the whole
 * repository, so any edit anywhere changed its digest and cost a build, a push and a dev stack update. Like a function
 * the session leaves out (`decideSkippedFunctionCode`), such a workload keeps the image the dev stack runs while:
 *
 * - the deployed template names an image of it in the stack's repository, and that image is still stored there;
 * - nothing else about its deployment changes (`findKeptImagesWithChangedConfiguration`).
 *
 * Otherwise it is built from the current source, as in a session that leaves no function out.
 */
import { referencedLogicalNames, sameDeployment } from './kept-function-code';
import { parseImageTag } from './utils';

export type KeptImage = { tag: string; digest: string };

export type SkippedImageBuildReason = 'not-deployed' | 'stored-image-missing' | 'configuration-changed';

export type SkippedImageDecision =
  | { workloadName: string; keep: Map<string, KeptImage> }
  | { workloadName: string; build: SkippedImageBuildReason };

type Template = { Resources?: Record<string, unknown> };
type TemplateResource = { Properties?: Record<string, unknown> };

/** The image tags of the stack's repository that `template` names anywhere, by job name. */
const findImageTags = (template: Template, repositoryUrl: string) => {
  const prefix = `${repositoryUrl}:`;
  const tags = new Map<string, Set<string>>();
  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      if (!value.startsWith(prefix)) return;
      const tag = value.slice(prefix.length);
      const { jobName } = parseImageTag(tag);
      if (!jobName) return;
      tags.set(jobName, (tags.get(jobName) ?? new Set()).add(tag));
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(template.Resources);
  return tags;
};

/** The tag of the one image of `jobName` that `template` names in the stack's repository, if it names exactly one. */
export const findTemplateImageTag = ({
  template,
  repositoryUrl,
  jobName
}: {
  template: Template;
  repositoryUrl: string;
  jobName: string;
}) => {
  const tags = [...(findImageTags(template, repositoryUrl).get(jobName) ?? [])];
  return tags.length === 1 ? tags[0] : undefined;
};

/**
 * Decides, for each workload the session leaves out, whether it keeps its deployed images. A workload with several
 * images (containers of one workload) keeps them only together, because they are packaged together.
 */
export const decideSkippedImages = ({
  images,
  deployedTemplate,
  repositoryUrl,
  storedImageTags
}: {
  images: { jobName: string; workloadName: string }[];
  /** The template the dev stack runs; none for a dev stack that does not exist yet. */
  deployedTemplate: Template | undefined;
  repositoryUrl: string;
  /** The tags in the stack's image repository. */
  storedImageTags: ReadonlySet<string>;
}): SkippedImageDecision[] => {
  const deployedTags = deployedTemplate ? findImageTags(deployedTemplate, repositoryUrl) : new Map();
  const jobsByWorkload = new Map<string, { jobName: string }[]>();
  for (const image of images)
    jobsByWorkload.set(image.workloadName, [...(jobsByWorkload.get(image.workloadName) ?? []), image]);
  return [...jobsByWorkload].map(([workloadName, jobs]): SkippedImageDecision => {
    const keep = new Map<string, KeptImage>();
    for (const { jobName } of jobs) {
      const tags = [...(deployedTags.get(jobName) ?? [])];
      // One image per job; a template naming several is not one this rule understands.
      const tag = tags.length === 1 ? tags[0] : undefined;
      if (!tag) return { workloadName, build: 'not-deployed' };
      if (!storedImageTags.has(tag)) return { workloadName, build: 'stored-image-missing' };
      keep.set(jobName, { tag, digest: parseImageTag(tag).digest });
    }
    return { workloadName, keep };
  });
};

const ENVIRONMENT_KEYS = new Set(['Environment', 'EnvironmentVariables']);

/** The logical names the environment of a resource refers to, at any depth (a job definition's container has one). */
const environmentReferences = (value: unknown, found = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) value.forEach((item) => environmentReferences(item, found));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (ENVIRONMENT_KEYS.has(key)) referencedLogicalNames(item, found);
      else environmentReferences(item, found);
    }
  }
  return found;
};

/**
 * The workloads keeping their image whose deployment changes in anything else. The template already names the kept
 * image, so it is compared with the deployed one as it is: every resource the workload owns (job definition, role,
 * state machine, log group) and every resource their environments refer to, whose values the image receives. A new
 * image with an old environment, role or command is a combination nobody ran, so such a workload is built.
 */
export const findKeptImagesWithChangedConfiguration = ({
  workloadNames,
  ownedLogicalNames,
  template,
  deployedTemplate
}: {
  workloadNames: string[];
  /** The resources each workload owns in `template`, by workload name. */
  ownedLogicalNames: (workloadName: string) => string[];
  template: Template;
  deployedTemplate: Template;
}): string[] => {
  const resource = (from: Template, logicalName: string) =>
    from.Resources?.[logicalName] as TemplateResource | undefined;
  return workloadNames.filter((workloadName) => {
    const owned = ownedLogicalNames(workloadName);
    // Without the resources it owns, nothing says that its deployment is unchanged.
    if (!owned.length) return true;
    const referenced = owned.flatMap((logicalName) => [
      ...environmentReferences(resource(template, logicalName)?.Properties)
    ]);
    return [...new Set([...owned, ...referenced])]
      .filter((logicalName) => owned.includes(logicalName) || resource(template, logicalName))
      .some((logicalName) => {
        const next = resource(template, logicalName);
        const deployed = resource(deployedTemplate, logicalName);
        return !next || !deployed || !sameDeployment(next, deployed);
      });
  });
};
