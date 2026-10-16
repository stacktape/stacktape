/**
 * What a `js-bundle` container image installs beside its runtime (see `EsImageRuntimeTools` in the packaging package).
 * ECS and Batch start the container's init process, so only an AgentCore runtime, which cannot, gets tini. curl is
 * installed when the container's health check calls it.
 */
export const getImageRuntimeTools = ({
  workloadType,
  healthCheckCommand
}: {
  workloadType?: string | undefined;
  healthCheckCommand?: string[] | undefined;
}) => ({
  tini: workloadType === 'agentcore-runtime',
  curl: Boolean(healthCheckCommand?.some((part) => /\bcurl\b/.test(part)))
});
