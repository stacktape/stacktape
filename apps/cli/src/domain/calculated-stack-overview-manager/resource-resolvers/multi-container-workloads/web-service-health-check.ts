import type { ContainerDefinition } from '@stacktape/cloudformation/resources/aws-ecs-taskdefinition';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import { CliError } from '@utils/errors';

export const WEB_SERVICE_HEALTH_CHECK_CONTAINER = 'stp-web-health-check';
// Official multi-architecture BusyBox image, pinned so a tag update cannot change deployed task definitions.
export const WEB_SERVICE_HEALTH_CHECK_IMAGE =
  'public.ecr.aws/docker/library/busybox@sha256:bdf57e528e45e4433820e045b29b4597825a1c9e38353532d90a01445013f82e';

/**
 * Read only the status line: an HTTP response proves the app listens, even if `/` returns 404 or 500. A configured
 * health path must return 2xx/3xx. Do not follow redirects or wait for a response body. Values are environment variables,
 * never shell source, and the probe has a bounded lifetime even if the server leaves the connection open.
 */
export const WEB_SERVICE_HEALTH_CHECK_COMMAND = [
  'CMD-SHELL',
  `printf 'GET %s HTTP/1.0\\r\\nHost: localhost\\r\\nConnection: close\\r\\n\\r\\n' "$STP_HEALTH_PATH" | ` +
    `nc -w 2 "$STP_HEALTH_HOST" "$STP_HEALTH_PORT" | ` +
    `{ IFS= read -r status; printf '%s\\n' "$status" | grep -Eq "^HTTP/1\\.[01] \${STP_HEALTH_STATUS}[0-9][0-9] "; }`
];

/** An essential sidecar makes ECS and Cloud Map use the application's HTTP readiness for every image type. */
export const getWebServiceHealthCheck = (workload: StpContainerWorkload): ContainerDefinition[] => {
  if (workload.configParentResourceType !== 'web-service') return [];
  const app = workload.containers.find(({ events }) => events?.some(({ type }) => type === 'http-api-gateway'));
  if (!app || app.internalHealthCheck) return [];
  if (
    workload.containers.some(({ name }) => name === WEB_SERVICE_HEALTH_CHECK_CONTAINER) ||
    workload.containers.length >= 10
  ) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_WEB_SERVICE_HEALTH_CHECK_CONTAINER_CONFLICT',
      message: `Web service \`${workload.nameChain[0]}\` needs one container slot named \`${WEB_SERVICE_HEALTH_CHECK_CONTAINER}\` for its HTTP health check.`,
      hints:
        'Rename the conflicting side container, reduce the container count, or configure internalHealthCheck on the application.'
    });
  }
  const path = app.loadBalancerHealthCheck?.healthcheckPath;
  if (
    path !== undefined &&
    (!path.startsWith('/') ||
      /\s/.test(path) ||
      [...path].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))
  ) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_WEB_SERVICE_HEALTH_CHECK_PATH_INVALID',
      message: 'The HTTP API healthcheckPath must start with / and contain no whitespace or control characters.'
    });
  }
  const event = app.events!.find(({ type }) => type === 'http-api-gateway')!;
  const port = event.properties.containerPort;
  return [
    {
      Name: WEB_SERVICE_HEALTH_CHECK_CONTAINER,
      Image: WEB_SERVICE_HEALTH_CHECK_IMAGE,
      Essential: true,
      // Uses the existing task allocation, with no additional Fargate CPU or memory reservation.
      Cpu: 0,
      Memory: 16,
      User: '65534:65534',
      ReadonlyRootFilesystem: true,
      LinuxParameters: { Capabilities: { Drop: ['ALL'] } },
      EntryPoint: ['/bin/sleep'],
      Command: ['2147483647'],
      StopTimeout: 2,
      // awsvpc containers share localhost. EC2 bridge containers reach the app through a Docker link instead.
      ...(workload.resources.instanceTypes ? { Links: [`${app.name}:app`] } : {}),
      Environment: [
        { Name: 'STP_HEALTH_HOST', Value: workload.resources.instanceTypes ? 'app' : '127.0.0.1' },
        { Name: 'STP_HEALTH_PORT', Value: String(port) },
        { Name: 'STP_HEALTH_PATH', Value: path ?? '/' },
        { Name: 'STP_HEALTH_STATUS', Value: path === undefined ? '[1-5]' : '[23]' }
      ],
      HealthCheck: {
        Command: WEB_SERVICE_HEALTH_CHECK_COMMAND,
        Interval: 5,
        Timeout: 4,
        Retries: 3,
        StartPeriod: 60
      }
    }
  ];
};
