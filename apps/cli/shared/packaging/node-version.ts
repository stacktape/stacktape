import { DEFAULT_CONTAINER_NODE_VERSION, DEFAULT_LAMBDA_NODE_VERSION } from '@config';

export const resolveNodeVersion = ({
  nodeVersion,
  runtime,
  target
}: {
  nodeVersion?: number;
  runtime?: string;
  target: 'container' | 'lambda';
}) => {
  if (nodeVersion !== undefined) return nodeVersion;
  if (target === 'container') return DEFAULT_CONTAINER_NODE_VERSION;

  return Number(runtime?.match(/nodejs(\d+)/)?.[1]) || DEFAULT_LAMBDA_NODE_VERSION;
};
