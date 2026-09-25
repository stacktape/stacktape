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
