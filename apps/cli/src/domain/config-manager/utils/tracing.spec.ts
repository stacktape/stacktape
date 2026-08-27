import { describe, expect, test } from 'bun:test';
import { getLambdaTracingInstrumentation, resolveEffectiveTracing } from './tracing';

describe('resolveEffectiveTracing', () => {
  test('defaults to disabled with full sampling when nothing is configured', () => {
    expect(
      resolveEffectiveTracing({ stackDefault: undefined, resourceOverride: undefined, resourceName: 'api' })
    ).toEqual({
      enabled: false,
      samplingRate: 1
    });
  });

  test('inherits the stack default including its sampling rate', () => {
    expect(
      resolveEffectiveTracing({
        stackDefault: { enabled: true, samplingRate: 0.25 },
        resourceOverride: undefined,
        resourceName: 'api'
      })
    ).toEqual({ enabled: true, samplingRate: 0.25 });
  });

  test('boolean override toggles enablement but keeps stack sampling', () => {
    expect(
      resolveEffectiveTracing({
        stackDefault: { enabled: true, samplingRate: 0.5 },
        resourceOverride: false,
        resourceName: 'api'
      })
    ).toEqual({ enabled: false, samplingRate: 0.5 });
    expect(resolveEffectiveTracing({ stackDefault: undefined, resourceOverride: true, resourceName: 'api' })).toEqual({
      enabled: true,
      samplingRate: 1
    });
  });

  test('object override opts in by default and can carry its own sampling rate', () => {
    expect(
      resolveEffectiveTracing({
        stackDefault: { enabled: false, samplingRate: 0.5 },
        resourceOverride: { samplingRate: 0.1 },
        resourceName: 'api'
      })
    ).toEqual({ enabled: true, samplingRate: 0.1 });
  });

  test('rejects sampling rates outside 0..1 from either level', () => {
    expect(() =>
      resolveEffectiveTracing({ stackDefault: { samplingRate: 1.5 }, resourceOverride: undefined, resourceName: 'api' })
    ).toThrow(/sampling/i);
    expect(() =>
      resolveEffectiveTracing({
        stackDefault: undefined,
        resourceOverride: { samplingRate: -0.1 },
        resourceName: 'api'
      })
    ).toThrow(/sampling/i);
  });
});

const instrumentationInput = (overrides: Partial<Parameters<typeof getLambdaTracingInstrumentation>[0]> = {}) => ({
  resourceName: 'api',
  runtime: 'nodejs22.x',
  region: 'eu-west-1',
  samplingRate: 1,
  userEnvironment: {},
  projectName: 'shop',
  stage: 'prod',
  ...overrides
});

describe('getLambdaTracingInstrumentation', () => {
  test('instruments a supported runtime with the regional layer and activation environment', () => {
    const { instrumentation, skippedReason } = getLambdaTracingInstrumentation(instrumentationInput());
    expect(skippedReason).toBeUndefined();
    expect(instrumentation!.layerArn).toBe('arn:aws:lambda:eu-west-1:615299751070:layer:AWSOpenTelemetryDistroJs:15');
    expect(instrumentation!.environmentDefaults).toMatchObject({
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-instrument',
      OTEL_AWS_APPLICATION_SIGNALS_ENABLED: 'false',
      OTEL_SERVICE_NAME: 'api'
    });
    expect(instrumentation!.environmentOverrides).toEqual({
      OTEL_RESOURCE_ATTRIBUTES: 'stacktape.project=shop,stacktape.stage=prod,deployment.environment.name=prod',
      OTEL_TRACES_SAMPLER: 'parentbased_traceidratio',
      OTEL_TRACES_SAMPLER_ARG: '1'
    });
  });

  test('skips runtimes the AWS-managed layers do not support, including newer versions', () => {
    for (const runtime of ['go1.x', 'provided.al2023', 'python3.14', 'java25', 'dotnet10']) {
      const { instrumentation, skippedReason } = getLambdaTracingInstrumentation(instrumentationInput({ runtime }));
      expect(instrumentation).toBeUndefined();
      expect(skippedReason).toContain(runtime);
    }
  });

  test('skips explicit ESM output, while the implicit Node 24 default stays instrumented', () => {
    const explicit = getLambdaTracingInstrumentation(instrumentationInput({ explicitOutputModuleFormat: 'esm' }));
    expect(explicit.instrumentation).toBeUndefined();
    expect(explicit.skippedReason).toContain('outputModuleFormat');
    // No explicit choice: packaging bundles the traced function as CJS instead, so it instruments.
    const implicit = getLambdaTracingInstrumentation(instrumentationInput({ runtime: 'nodejs24.x' }));
    expect(implicit.instrumentation).toBeDefined();
    // Non-Node runtimes have no module-format concern at all.
    const python = getLambdaTracingInstrumentation(
      instrumentationInput({ runtime: 'python3.12', explicitOutputModuleFormat: 'esm' })
    );
    expect(python.instrumentation).toBeDefined();
  });

  test('skips regions where the layer is not published', () => {
    const { instrumentation, skippedReason } = getLambdaTracingInstrumentation(
      // The Python layer is not published in me-south-1 (the Node.js one is).
      instrumentationInput({ runtime: 'python3.12', region: 'me-south-1' })
    );
    expect(instrumentation).toBeUndefined();
    expect(skippedReason).toContain('me-south-1');
  });

  test('skips when a different OpenTelemetry layer is already attached, reuses the exact one', () => {
    const managedArn = 'arn:aws:lambda:eu-west-1:615299751070:layer:AWSOpenTelemetryDistroJs:15';
    const conflicting = getLambdaTracingInstrumentation(
      instrumentationInput({ userLayers: [managedArn.replace(':15', ':9')] })
    );
    expect(conflicting.instrumentation).toBeUndefined();
    expect(conflicting.skippedReason).toContain('AWSOpenTelemetryDistroJs:9');
    const exact = getLambdaTracingInstrumentation(instrumentationInput({ userLayers: [managedArn] }));
    expect(exact.instrumentation!.layerArn).toBe(managedArn);
  });

  test('skips entirely when the user already uses a different exec wrapper', () => {
    const { instrumentation, skippedReason } = getLambdaTracingInstrumentation(
      instrumentationInput({ userEnvironment: { AWS_LAMBDA_EXEC_WRAPPER: '/opt/custom-wrapper' } })
    );
    expect(instrumentation).toBeUndefined();
    expect(skippedReason).toContain('/opt/custom-wrapper');
  });

  test('merges user resource attributes but reserves the stacktape identity keys', () => {
    const { instrumentation } = getLambdaTracingInstrumentation(
      instrumentationInput({
        userEnvironment: {
          OTEL_RESOURCE_ATTRIBUTES: 'team=payments,stacktape.project=spoofed, custom.key = spaced '
        }
      })
    );
    expect(instrumentation!.environmentOverrides.OTEL_RESOURCE_ATTRIBUTES).toBe(
      'team=payments,custom.key=spaced,stacktape.project=shop,stacktape.stage=prod,deployment.environment.name=prod'
    );
  });

  test('warns when user sampler variables are overridden by config-driven sampling', () => {
    const { instrumentation, warnings } = getLambdaTracingInstrumentation(
      instrumentationInput({ samplingRate: 0.2, userEnvironment: { OTEL_TRACES_SAMPLER: 'always_on' } })
    );
    expect(instrumentation!.environmentOverrides.OTEL_TRACES_SAMPLER).toBe('parentbased_traceidratio');
    expect(instrumentation!.environmentOverrides.OTEL_TRACES_SAMPLER_ARG).toBe('0.2');
    expect(warnings).toHaveLength(1);
    expect(warnings![0]).toContain('OTEL_TRACES_SAMPLER');
  });

  test('user-overridable defaults stay defaults: service name and app-signals toggle', () => {
    const { instrumentation, warnings } = getLambdaTracingInstrumentation(
      instrumentationInput({
        userEnvironment: { OTEL_SERVICE_NAME: 'checkout', OTEL_AWS_APPLICATION_SIGNALS_ENABLED: 'true' }
      })
    );
    // Defaults are applied only for absent keys by the function resolver; this util just must not
    // classify them as reserved.
    expect(instrumentation!.environmentDefaults.OTEL_SERVICE_NAME).toBe('api');
    expect(Object.keys(instrumentation!.environmentOverrides)).toEqual([
      'OTEL_RESOURCE_ATTRIBUTES',
      'OTEL_TRACES_SAMPLER',
      'OTEL_TRACES_SAMPLER_ARG'
    ]);
    expect(warnings).toBeUndefined();
  });

  test('uses partition-correct layer ARNs for China regions', () => {
    const { instrumentation } = getLambdaTracingInstrumentation(instrumentationInput({ region: 'cn-north-1' }));
    expect(instrumentation!.layerArn.startsWith('arn:aws-cn:lambda:cn-north-1:')).toBe(true);
  });
});
