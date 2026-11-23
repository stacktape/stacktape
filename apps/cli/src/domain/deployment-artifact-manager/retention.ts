/**
 * Which stored artifacts this deployment may delete.
 *
 * Deletion is the one packaging-adjacent operation that cannot be undone, and an artifact the deploying
 * template still points at must survive it. Two things reference an artifact: this run uploaded it, or
 * this run reused one that was already there. The second is the easy one to forget — nothing new is
 * written, so it leaves no trace in the upload records — and forgetting it deleted shared layers that
 * the very deployment doing the deleting depended on.
 *
 * The keep window is per artifact name and ordered by the version segment of the key. For Lambda code
 * and images that segment is the deployment version, so the order is chronological. For shared layers
 * it is a content hash, so it is not: the window keeps an arbitrary subset, and being referenced is the
 * only thing that reliably saves a layer. That is why `referenced` is consulted independently of the
 * window rather than as a tie-breaker within it.
 */
export type StoredArtifact = { version: string; name: string; s3Key?: string; tag?: string };

export type DeploymentArtifactUsage = {
  /** Objects this run wrote to the deployment bucket. */
  uploadedObjects: { s3Key: string; name: string }[];
  /** Images this run pushed to the repository. */
  uploadedImages: { tag: string; name: string }[];
  /**
   * Objects already present that this run's template references, shared layers among them, and the objects the
   * template CloudFormation runs names (`artifactsNamedByTemplate`).
   */
  reusedS3Keys: string[];
  /** Images already present that this run's template or the template CloudFormation runs references by tag. */
  reusedImageTags: string[];
  /** Versions to keep per artifact name, including the one being deployed. */
  versionsToKeepPerName: number;
  /**
   * Registry cache tags of the container jobs in the deploying configuration. A cache tag has no version: each is kept
   * while its job exists, and a job's removal leaves its cache as obsolete as any other unversioned tag.
   */
  registryCacheTags: string[];
};

export const selectObsoleteArtifacts = <Artifact extends StoredArtifact>({
  artifacts,
  usage
}: {
  artifacts: Artifact[];
  usage: DeploymentArtifactUsage;
}): Artifact[] => {
  const isReferencedByThisDeployment = (artifact: Artifact): boolean =>
    Boolean(
      (artifact.tag &&
        (usage.reusedImageTags.includes(artifact.tag) ||
          usage.uploadedImages.some(({ tag }) => tag === artifact.tag))) ||
      (artifact.s3Key &&
        (usage.reusedS3Keys.includes(artifact.s3Key) ||
          usage.uploadedObjects.some(({ s3Key }) => s3Key === artifact.s3Key)))
    );

  /*
   * This run added a version under this name. The listing already contains it, so the window narrows by
   * one to make room: the new version takes a slot instead of the kept count drifting up every deploy.
   */
  const gainedAVersionThisDeployment = (artifact: Artifact): boolean =>
    Boolean(
      (artifact.tag && usage.uploadedImages.some(({ name }) => name === artifact.name)) ||
      (artifact.s3Key && usage.uploadedObjects.some(({ name }) => name === artifact.name))
    );

  return artifacts.filter((artifact) => {
    if (isReferencedByThisDeployment(artifact)) return false;
    if (artifact.tag && usage.registryCacheTags.includes(artifact.tag)) return false;

    const versionsUnderThisName = artifacts
      .filter((other) => other.version && other.name === artifact.name)
      .map((other) => other.version)
      .sort();
    const keptVersions = versionsUnderThisName.slice(
      Math.max(
        versionsUnderThisName.length - usage.versionsToKeepPerName + (gainedAVersionThisDeployment(artifact) ? 1 : 0),
        0
      )
    );
    return !keptVersions.includes(artifact.version);
  });
};

/**
 * The stored objects and images a template names: S3 keys as written, images as `<repositoryUrl>:<tag>` or
 * `<repositoryUrl>@<digest>`.
 *
 * Cleanup protects what the template CloudFormation runs names. After a full deployment that is the template just
 * deployed: it can adopt an older image or object that is no longer in the keep window, such as a `prebuilt-image` with
 * an older tag. After a fast deployment, CloudFormation stays on the template of the last full deployment. A function or
 * service that changed in more fast deployments than the keep window holds pushes those artifacts out of the window,
 * yet CloudFormation still needs them: a later update that fails rolls the code back to them, and ECS pulls the image
 * again whenever it starts a task of the template's revision.
 *
 * Every string in the template is a candidate key, wherever it sits (function code, layer content, custom resource
 * properties); one that names no stored object matches nothing.
 */
export const artifactsNamedByTemplate = ({
  template,
  repositoryUrl
}: {
  template: { Resources?: Record<string, unknown> } | undefined;
  repositoryUrl: string;
}) => {
  const strings = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === 'string') strings.add(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(template?.Resources);
  return {
    s3Keys: [...strings],
    images: [...strings].filter(
      (value) => value.startsWith(`${repositoryUrl}:`) || value.startsWith(`${repositoryUrl}@`)
    )
  };
};

/**
 * The obsolete artifacts a retained release still needs. A shared layer's key orders by content hash, not by age, so
 * the window above can select a layer that a release kept for rollback still uses; deleting it would make that release
 * impossible to restore and take its source maps with it. Such a layer stays while a retained template references it.
 */
export const keepLayersOfRetainedReleases = <Artifact extends { s3Key: string }>({
  obsolete,
  retainedTemplates,
  deploymentBucketName
}: {
  obsolete: Artifact[];
  retainedTemplates: { Resources?: Record<string, { Type?: string; Properties?: unknown }> }[];
  deploymentBucketName: string;
}): Artifact[] => {
  const referenced = new Set(
    retainedTemplates.flatMap(({ Resources = {} }) =>
      Object.values(Resources).flatMap(({ Type, Properties }) => {
        const content = (Properties as { Content?: { S3Bucket?: unknown; S3Key?: unknown } } | undefined)?.Content;
        return Type === 'AWS::Lambda::LayerVersion' &&
          content?.S3Bucket === deploymentBucketName &&
          typeof content.S3Key === 'string'
          ? [content.S3Key]
          : [];
      })
    )
  );
  return obsolete.filter(({ s3Key }) => !referenced.has(s3Key));
};

/**
 * The obsolete images that are still in use: named by the deployed template, pushed or reused by this deployment, or
 * run by a service. A code swap keeps a service on an older task revision, so its image can fall out of the window.
 * Deleting an image in use would make replacement and scale-out tasks fail to pull.
 *
 * An image in use is kept by tag and by manifest digest. A reference by tag keeps the untagged entry behind it. A
 * reference by digest keeps every tag of that manifest, because ECR deletes the manifest with its last tag.
 */
export const keepImagesInUse = <Image extends { tag: string; dockerDigest: string }>({
  obsolete,
  imagesInUse,
  repositoryUrl,
  storedImages
}: {
  obsolete: Image[];
  /** Image URIs, by tag or by digest. URIs outside `repositoryUrl` are ignored. */
  imagesInUse: string[];
  repositoryUrl: string;
  storedImages: { tag: string; dockerDigest: string }[];
}): Image[] => {
  const liveTags = new Set(
    imagesInUse.flatMap((image) =>
      image.startsWith(`${repositoryUrl}:`) ? [image.slice(repositoryUrl.length + 1)] : []
    )
  );
  const liveDigests = new Set([
    ...imagesInUse.flatMap((image) =>
      image.startsWith(`${repositoryUrl}@`) ? [image.slice(repositoryUrl.length + 1)] : []
    ),
    ...storedImages.filter(({ tag }) => tag && liveTags.has(tag)).map(({ dockerDigest }) => dockerDigest)
  ]);
  return obsolete.filter(({ tag, dockerDigest }) => !(tag && liveTags.has(tag)) && !liveDigests.has(dockerDigest));
};
