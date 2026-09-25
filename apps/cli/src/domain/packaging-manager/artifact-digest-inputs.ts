/**
 * The build inputs that go into an artifact's identity, as a machine-independent value.
 *
 * A workload is rebuilt and re-uploaded when its digest changes, and digests are read back from the
 * customer's own S3 bucket and ECR repository — so the same source built on a laptop and in CI is meant to
 * produce one artifact, not two. The props handed to a buildpack cannot be hashed as they are: they carry
 * the entry file as an absolute path under the checkout root, and the tracing runtime as a path under
 * wherever this CLI happens to be installed. Hashing either makes identity depend on the build host and the
 * shared cache can never hit.
 *
 * What survives instead: the entry file exactly as the user configured it, which is relative and is the
 * thing they can change, and whether tracing is on. The tracing runtime's contents travel with the CLI, and
 * the buildpack implementation version hashed alongside this already covers that.
 */
export const getStableBuildpackDigestProps = ({
  props,
  configured
}: {
  /** The props the buildpack is called with, absolute paths and all. */
  props: Record<string, unknown>;
  /** The packaging properties as written in the user's config. */
  configured: { entryfilePath: string };
}): Record<string, unknown> => {
  const { entryfilePath: _hostSpecificEntryfilePath, tracingRuntimeFilePath, ...rest } = props;
  return { ...rest, entryfilePath: configured.entryfilePath, tracingEnabled: Boolean(tracingRuntimeFilePath) };
};
