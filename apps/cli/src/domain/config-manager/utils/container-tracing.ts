import type { StpIamRoleStatement } from '@stacktape/config/shared';
import { getReservedOtelEnvironment } from './tracing';

/**
 * Pinned collector image for container tracing; `latest` moves, so the version is bumped
 * deliberately at release time.
 */
export const OTEL_COLLECTOR_IMAGE = 'public.ecr.aws/aws-observability/aws-otel-collector:v0.49.0';

export const OTEL_COLLECTOR_CONTAINER_NAME = 'stp-otel-collector';
/**
 * The memory limit is a hard cap: a leaking or overloaded collector is killed at it (non-essential
 * — the application keeps running) instead of triggering a task-level OOM. The CPU value is an ECS
 * share weight, not a cap — it keeps the collector's claim low under contention.
 */
export const OTEL_COLLECTOR_CPU_UNITS = 128;
export const OTEL_COLLECTOR_MEMORY_MB = 256;

/**
 * Collector configuration for the sidecar: receive OTLP from the task's containers, cap collector
 * memory, batch, and export straight to the X-Ray OTLP endpoint (SigV4-signed with the task role).
 * Spans land in the account's `aws/spans` log group via Transaction Search.
 */
export const buildOtelCollectorConfigYaml = ({ region }: { region: string }) => {
  const domainSuffix = region.startsWith('cn-') ? '.cn' : '';
  return [
    'receivers:',
    '  otlp:',
    '    protocols:',
    '      grpc:',
    '        endpoint: 0.0.0.0:4317',
    '      http:',
    '        endpoint: 0.0.0.0:4318',
    'processors:',
    '  memory_limiter:',
    '    check_interval: 1s',
    `    limit_mib: ${OTEL_COLLECTOR_MEMORY_MB - 64}`,
    '    spike_limit_mib: 48',
    '  batch/traces:',
    '    timeout: 1s',
    '    send_batch_size: 50',
    'exporters:',
    '  otlphttp/traces:',
    '    compression: gzip',
    `    traces_endpoint: https://xray.${region}.amazonaws.com${domainSuffix}/v1/traces`,
    '    auth:',
    '      authenticator: sigv4auth/traces',
    'extensions:',
    '  sigv4auth/traces:',
    `    region: "${region}"`,
    '    service: "xray"',
    '  health_check:',
    'service:',
    '  extensions: [sigv4auth/traces, health_check]',
    '  pipelines:',
    '    traces:',
    '      receivers: [otlp]',
    '      processors: [memory_limiter, batch/traces]',
    '      exporters: [otlphttp/traces]'
  ].join('\n');
};

/**
 * The environment a traced container runs with. Defaults are applied only where the user has not
 * set the key; overrides always win (sampling + trace identity, shared with the Lambda path). The
 * SDK-side exporter points at the collector sidecar; metrics and logs pipelines stay off.
 */
export const getContainerTracingEnvironment = ({
  serviceName,
  samplingRate,
  userEnvironment,
  projectName,
  stage
}: {
  serviceName: string;
  samplingRate: number;
  userEnvironment: Record<string, unknown>;
  projectName: string;
  stage: string;
}): {
  environmentDefaults: Record<string, string>;
  environmentOverrides: Record<string, string>;
  warnings: string[];
} => {
  const { environmentOverrides, warnings } = getReservedOtelEnvironment({
    samplingRate,
    userEnvironment,
    projectName,
    stage
  });
  return {
    environmentDefaults: {
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318',
      OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
      OTEL_METRICS_EXPORTER: 'none',
      OTEL_LOGS_EXPORTER: 'none',
      // AWS-managed hops (ALB, API Gateway, Lambda) still propagate X-Amzn-Trace-Id; keeping the
      // xray propagator alongside W3C keeps traces connected across them.
      OTEL_PROPAGATORS: 'tracecontext,baggage,xray',
      OTEL_SERVICE_NAME: serviceName
    },
    environmentOverrides,
    warnings
  };
};

/**
 * Task-role permissions for exporting spans. `xray:PutSpans`/`PutSpansForIndexing` are the formal
 * actions of the OTLP endpoint, while AWS's own documented setups grant only the legacy
 * `PutTraceSegments`/`PutTelemetryRecords` pair for the same path — both are kept because the
 * enforcement side is ambiguous and none of these support resource-level scoping. Sampling-rule
 * reads are omitted: the sampler is local (`parentbased_traceidratio`), not X-Ray remote sampling.
 */
export const getEcsTaskTracingRoleStatements = (): StpIamRoleStatement[] => {
  return [
    {
      Resource: ['*'],
      Action: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords', 'xray:PutSpans', 'xray:PutSpansForIndexing']
    }
  ];
};
