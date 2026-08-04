import { DEFAULT_CONTAINER_NODE_VERSION, DEFAULT_LAMBDA_NODE_VERSION } from './constants';

/**
 * The Node.js major version a workload is built and run with.
 *
 * An explicit `nodeVersion` always wins. Otherwise a Lambda inherits the version encoded in its AWS
 * runtime identifier (`nodejs20.x` → 20) and falls back to the packaging default; containers have no
 * such identifier and use the container default directly.
 */
export const resolveNodeVersion = ({
  nodeVersion,
  runtime,
  target
}: {
  nodeVersion?: number | undefined;
  runtime?: string | undefined;
  target: 'container' | 'lambda';
}): number => {
  if (nodeVersion !== undefined) return nodeVersion;
  if (target === 'container') return DEFAULT_CONTAINER_NODE_VERSION;

  return Number(runtime?.match(/nodejs(\d+)/)?.[1]) || DEFAULT_LAMBDA_NODE_VERSION;
};
