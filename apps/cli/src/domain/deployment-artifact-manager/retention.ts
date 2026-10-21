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
  /** Objects already present that this run's template references, shared layers among them. */
  reusedS3Keys: string[];
  /** Images already present that this run's template references. */
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
 * The obsolete images a running service still uses. A code swap keeps the service on an older task revision, so its
 * image can fall out of the window; deleting it would make replacement and scale-out tasks fail to pull. A running
 * image is kept by tag, and its manifest digest is kept too, so the untagged entry behind it survives as well.
 */
export const keepImagesOfRunningServices = <Image extends { tag: string; dockerDigest: string }>({
  obsolete,
  liveImages,
  repositoryUrl,
  storedImages
}: {
  obsolete: Image[];
  liveImages: string[];
  repositoryUrl: string;
  storedImages: { tag: string; dockerDigest: string }[];
}): Image[] => {
  const liveTags = new Set(
    liveImages.flatMap((image) =>
      image.startsWith(`${repositoryUrl}:`) ? [image.slice(repositoryUrl.length + 1)] : []
    )
  );
  const liveDigests = new Set([
    ...liveImages.flatMap((image) =>
      image.startsWith(`${repositoryUrl}@`) ? [image.slice(repositoryUrl.length + 1)] : []
    ),
    ...storedImages.filter(({ tag }) => tag && liveTags.has(tag)).map(({ dockerDigest }) => dockerDigest)
  ]);
  return obsolete.filter(({ tag, dockerDigest }) => !(tag && liveTags.has(tag)) && !liveDigests.has(dockerDigest));
};
