import type { ResourceTracingConfig, TracingOptions } from '@stacktape/config/tracing';
import { configErrors } from '../errors';
import { OTEL_LAMBDA_LAYER_ARNS, OtelLayerRuntimeFamily } from './otel-lambda-layer-arns';

export type EffectiveTracing = {
  enabled: boolean;
  samplingRate: number;
};

const validateSamplingRate = ({ samplingRate, source }: { samplingRate: number | undefined; source: string }) => {
  if (samplingRate !== undefined && (!Number.isFinite(samplingRate) || samplingRate < 0 || samplingRate > 1)) {
    throw configErrors.tracingSamplingRateInvalid({ source, actual: samplingRate });
  }
};

/**
 * Resolves the tracing setting one resource actually runs with: the stack-wide default from
 * `stackConfig.tracing`, overridden by the resource's own `tracing` property (`false` opts out,
 * `true` opts in with stack-wide sampling, an object opts in with its own settings).
 */
export const resolveEffectiveTracing = ({
  stackDefault,
  resourceOverride,
  resourceName
}: {
  stackDefault: TracingOptions | undefined;
  resourceOverride: ResourceTracingConfig | undefined;
  resourceName: string;
}): EffectiveTracing => {
  validateSamplingRate({ samplingRate: stackDefault?.samplingRate, source: 'stackConfig.tracing' });
  const base: EffectiveTracing = {
    enabled: stackDefault?.enabled ?? false,
    samplingRate: stackDefault?.samplingRate ?? 1
  };
  if (resourceOverride === undefined) {
    return base;
  }
  if (typeof resourceOverride === 'boolean') {
    return { ...base, enabled: resourceOverride };
  }
  validateSamplingRate({ samplingRate: resourceOverride.samplingRate, source: `resource \`${resourceName}\`` });
  return {
    enabled: resourceOverride.enabled ?? true,
    samplingRate: resourceOverride.samplingRate ?? base.samplingRate
  };
};

export const OTEL_WRAPPER_SCRIPT = '/opt/otel-instrument';

/**
 * Runtimes the AWS-managed OpenTelemetry layers support, per
 * https://docs.aws.amazon.com/lambda/latest/dg/monitoring-application-signals.html (identical list
 * on the ADOT Lambda page). Newer runtime versions must not be assumed compatible — the layer ships
 * its own agent build per language version. Revisit together with `refresh:catalog:otel-layers`.
 *
 * Node.js runtimes do not depend on the layer at all — Stacktape bundles its own OTel runtime into
 * the function (works for ESM and CJS alike; verified against a real stack). The nodejs entries
 * here only gate which runtimes count as traceable.
 */
const OTEL_SUPPORTED_RUNTIMES: Record<string, OtelLayerRuntimeFamily> = {
  'nodejs18.x': 'nodejs',
  'nodejs20.x': 'nodejs',
  'nodejs22.x': 'nodejs',
  'nodejs24.x': 'nodejs',
  'python3.10': 'python',
  'python3.11': 'python',
  'python3.12': 'python',
  'python3.13': 'python',
  java11: 'java',
  java17: 'java',
  java21: 'java',
  dotnet8: 'dotnet'
};

export type LambdaTracingInstrumentation = {
  /** `bundled` = the OTel runtime ships inside the bundle (Node); `layer` = the AWS-managed layer. */
  mode: 'bundled' | 'layer';
  layerArn?: string;
  /** Applied only for keys the function does not already set; user-provided values win. */
  environmentDefaults: Record<string, string>;
  /** Always applied; these keys carry the trace identity and sampling the config promises. */
  environmentOverrides: Record<string, string>;
};

/** Keys of OTEL_RESOURCE_ATTRIBUTES that Stacktape owns; user-supplied values for them are dropped. */
const RESERVED_RESOURCE_ATTRIBUTE_KEYS = ['stacktape.project', 'stacktape.stage', 'deployment.environment.name'];

export const mergeResourceAttributes = ({
  userValue,
  stacktapeAttributes
}: {
  userValue: string | undefined;
  stacktapeAttributes: Record<string, string>;
}): string => {
  const userEntries = (userValue || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex <= 0) return [];
      return [[entry.slice(0, separatorIndex).trim(), entry.slice(separatorIndex + 1).trim()] as const];
    })
    .filter(([key]) => !RESERVED_RESOURCE_ATTRIBUTE_KEYS.includes(key));
  return [...userEntries, ...Object.entries(stacktapeAttributes)].map(([key, value]) => `${key}=${value}`).join(',');
};

/**
 * Computes how one traced function gets instrumented. Node.js functions get Stacktape's OTel
 * runtime bundled in at packaging time (`mode: 'bundled'`) — the AWS-managed layer cannot see
 * bundled code and cannot wrap ESM handlers, so it is not used for Node at all. Other supported
 * runtimes attach the AWS-managed layer (`mode: 'layer'`). Returns `skippedReason` (instead of
 * throwing) when instrumentation cannot be applied, so a stack-wide `tracing.enabled: true` does
 * not break stacks containing e.g. a Go function.
 */
export const getLambdaTracingInstrumentation = ({
  resourceName,
  runtime,
  region,
  samplingRate,
  userEnvironment,
  userLayers = [],
  projectName,
  stage
}: {
  resourceName: string;
  runtime: string;
  region: string;
  samplingRate: number;
  userEnvironment: Record<string, unknown>;
  userLayers?: string[];
  projectName: string;
  stage: string;
}): { instrumentation?: LambdaTracingInstrumentation; skippedReason?: string; warnings?: string[] } => {
  const runtimeFamily = OTEL_SUPPORTED_RUNTIMES[runtime];
  if (!runtimeFamily) {
    return {
      skippedReason: `runtime \`${runtime}\` does not support tracing (supported: ${Object.keys(OTEL_SUPPORTED_RUNTIMES).join(', ')})`
    };
  }

  const { environmentOverrides, warnings } = getReservedOtelEnvironment({
    samplingRate,
    userEnvironment,
    projectName,
    stage
  });

  if (runtimeFamily === 'nodejs') {
    return {
      instrumentation: {
        mode: 'bundled',
        environmentDefaults: { OTEL_SERVICE_NAME: resourceName },
        environmentOverrides
      },
      ...(warnings.length ? { warnings } : {})
    };
  }

  const layerArn = OTEL_LAMBDA_LAYER_ARNS[runtimeFamily][region];
  if (!layerArn) {
    return {
      skippedReason: `the AWS-managed OpenTelemetry ${runtimeFamily} layer is not published in region \`${region}\``
    };
  }
  // A hand-attached OpenTelemetry layer of a different version would overlap with ours at /opt.
  // The exact catalogue layer is simply reused (the resolver never attaches it twice).
  const conflictingOtelLayer = userLayers.find(
    (userLayerArn) => userLayerArn.includes(':layer:AWSOpenTelemetryDistro') && userLayerArn !== layerArn
  );
  if (conflictingOtelLayer) {
    return {
      skippedReason: `it already attaches the OpenTelemetry layer \`${conflictingOtelLayer}\`, which would conflict with the managed one (\`${layerArn}\`)`
    };
  }
  const userWrapper = userEnvironment.AWS_LAMBDA_EXEC_WRAPPER;
  if (userWrapper !== undefined && userWrapper !== OTEL_WRAPPER_SCRIPT) {
    return {
      skippedReason: `it already sets AWS_LAMBDA_EXEC_WRAPPER=\`${userWrapper}\`, which the OpenTelemetry wrapper cannot chain with`
    };
  }

  return {
    instrumentation: {
      mode: 'layer',
      layerArn,
      environmentDefaults: {
        AWS_LAMBDA_EXEC_WRAPPER: OTEL_WRAPPER_SCRIPT,
        // Traces only for now; the Application Signals metrics pipeline stays off.
        OTEL_AWS_APPLICATION_SIGNALS_ENABLED: 'false',
        OTEL_SERVICE_NAME: resourceName
      },
      environmentOverrides
    },
    ...(warnings.length ? { warnings } : {})
  };
};

/**
 * The environment Stacktape always enforces on a traced workload, shared by the Lambda and
 * container paths: config-driven sampling and the trace-identity resource attributes the Console
 * relies on. User values for the sampler are ignored with a warning; user resource attributes are
 * merged, with the `stacktape.*` keys reserved.
 */
export const getReservedOtelEnvironment = ({
  samplingRate,
  userEnvironment,
  projectName,
  stage
}: {
  samplingRate: number;
  userEnvironment: Record<string, unknown>;
  projectName: string;
  stage: string;
}): { environmentOverrides: Record<string, string>; warnings: string[] } => {
  const warnings: string[] = [];
  const samplerValue = 'parentbased_traceidratio';
  const samplerArg = String(samplingRate);
  for (const [reservedKey, forcedValue] of [
    ['OTEL_TRACES_SAMPLER', samplerValue],
    ['OTEL_TRACES_SAMPLER_ARG', samplerArg]
  ] as const) {
    const userValue = userEnvironment[reservedKey];
    if (userValue !== undefined && String(userValue) !== forcedValue) {
      warnings.push(
        `its ${reservedKey} environment variable is ignored — sampling is controlled by the \`tracing.samplingRate\` config property`
      );
    }
  }
  const userResourceAttributes = userEnvironment.OTEL_RESOURCE_ATTRIBUTES;
  return {
    environmentOverrides: {
      OTEL_RESOURCE_ATTRIBUTES: mergeResourceAttributes({
        userValue: userResourceAttributes === undefined ? undefined : String(userResourceAttributes),
        stacktapeAttributes: {
          'stacktape.project': projectName,
          'stacktape.stage': stage,
          'deployment.environment.name': stage
        }
      }),
      OTEL_TRACES_SAMPLER: samplerValue,
      OTEL_TRACES_SAMPLER_ARG: samplerArg
    },
    warnings
  };
};
