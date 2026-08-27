/**
 * OpenTelemetry tracing runtime that Stacktape bundles INTO traced Lambda functions.
 *
 * The AWS-managed OTel layer cannot instrument bundled code: its require/import hooks never see
 * modules that the bundler already inlined, and it cannot wrap ESM handlers at all (verified live —
 * it initializes and produces nothing). Stacktape owns the bundler, so instrumentation happens
 * where it is reliable instead: packaging generates an entry that wraps the user's handler with
 * `wrapLambdaHandler`, and this module carries the whole SDK setup. Works identically for ESM and
 * CJS output, and its cold-start cost is a fraction of the layer's.
 *
 * Span export uses the X-Ray daemon's UDP protocol (the function runs with Active tracing, so the
 * daemon listens on 127.0.0.1:2000): OTLP-protobuf, base64-wrapped in the daemon envelope — the
 * same wire format the AWS Distro uses. Fire-and-forget UDP means flushing at invocation end adds
 * microseconds, not an HTTPS round-trip.
 *
 * Anything failing in here must degrade to "no tracing", never to a broken function.
 */

import { createSocket } from 'node:dgram';
import type { Context as OtelContext, Span, TextMapGetter } from '@opentelemetry/api';
import { ROOT_CONTEXT, SpanKind, SpanStatusCode, context as otelContext, trace } from '@opentelemetry/api';
import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { ProtobufTraceSerializer } from '@opentelemetry/otlp-transformer';
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray';
import { resourceFromAttributes } from '@opentelemetry/resources';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import {
  AlwaysOnSampler,
  BatchSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

/** The X-Ray daemon's UDP envelope for OTLP traces, as the AWS Distro sends it. */
const DAEMON_PROTOCOL_HEADER = '{"format":"json","version":1}\n';
const DAEMON_OTLP_TRACES_PREFIX = 'T1S';
/** UDP keeps us under the ~64 KB datagram ceiling by exporting in small slices. */
const MAX_SPANS_PER_DATAGRAM = 50;

class XRayDaemonOtlpUdpExporter implements SpanExporter {
  #socket = createSocket('udp4');
  #host: string;
  #port: number;

  constructor() {
    // Present on every function with Active tracing; the constant is the documented default.
    const [host, port] = (process.env.AWS_XRAY_DAEMON_ADDRESS || '127.0.0.1:2000').split(':');
    this.#host = host;
    this.#port = Number(port) || 2000;
    this.#socket.unref();
  }

  export(spans: ReadableSpan[], resultCallback: (result: { code: number; error?: Error }) => void): void {
    try {
      for (let offset = 0; offset < spans.length; offset += MAX_SPANS_PER_DATAGRAM) {
        const serialized = ProtobufTraceSerializer.serializeRequest(
          spans.slice(offset, offset + MAX_SPANS_PER_DATAGRAM)
        );
        if (!serialized) continue;
        const message = Buffer.from(
          `${DAEMON_PROTOCOL_HEADER}${DAEMON_OTLP_TRACES_PREFIX}${Buffer.from(serialized).toString('base64')}`
        );
        this.#socket.send(message, this.#port, this.#host);
      }
      resultCallback({ code: 0 });
    } catch (error) {
      resultCallback({ code: 1, error: error as Error });
    }
  }

  async shutdown(): Promise<void> {
    this.#socket.close();
  }

  async forceFlush(): Promise<void> {
    // UDP sends complete synchronously; nothing is buffered here.
  }
}

const parseResourceAttributes = (value: string | undefined): Record<string, string> => {
  const attributes: Record<string, string> = {};
  for (const entry of (value || '').split(',')) {
    const separator = entry.indexOf('=');
    if (separator > 0) {
      attributes[entry.slice(0, separator).trim()] = entry.slice(separator + 1).trim();
    }
  }
  return attributes;
};

const buildSampler = () => {
  const ratio = Number(process.env.OTEL_TRACES_SAMPLER_ARG);
  const root =
    Number.isFinite(ratio) && ratio >= 0 && ratio <= 1 ? new TraceIdRatioBasedSampler(ratio) : new AlwaysOnSampler();
  // Both configured sampler names Stacktape sets are parent-based; the platform segment's sampling
  // decision (X-Ray rules) governs sampled invocations end to end.
  return new ParentBasedSampler({ root });
};

const environmentCarrierGetter: TextMapGetter<Record<string, string | undefined>> = {
  get: (carrier, key) => carrier[key.toLowerCase()],
  keys: (carrier) => Object.keys(carrier)
};

type LambdaHandler = (event: unknown, context: unknown, ...rest: unknown[]) => unknown;

/** HTTP shape of function-URL / API Gateway (v2 and v1) / ALB events, when the event carries one. */
const httpFromEvent = (event: unknown): { method: string; path: string } | undefined => {
  const eventLike = event as {
    requestContext?: { http?: { method?: string; path?: string } };
    rawPath?: string;
    httpMethod?: string;
    path?: string;
  } | null;
  const v2 = eventLike?.requestContext?.http;
  if (v2?.method) return { method: v2.method, path: eventLike?.rawPath || v2.path || '/' };
  if (eventLike?.httpMethod) return { method: eventLike.httpMethod, path: eventLike.path || '/' };
  return undefined;
};

let initialized: { provider: NodeTracerProvider; xrayPropagator: AWSXRayPropagator } | undefined;
let coldStart = true;

const initialize = () => {
  const exporter = new XRayDaemonOtlpUdpExporter();
  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      'service.name': process.env.OTEL_SERVICE_NAME || process.env.AWS_LAMBDA_FUNCTION_NAME || 'lambda',
      'cloud.provider': 'aws',
      'cloud.platform': 'aws_lambda',
      'faas.name': process.env.AWS_LAMBDA_FUNCTION_NAME || '',
      ...parseResourceAttributes(process.env.OTEL_RESOURCE_ATTRIBUTES)
    }),
    sampler: buildSampler(),
    spanProcessors: [
      // The wrapper force-flushes at invocation end, so the batch delay never loses spans to a
      // frozen sandbox; batching still coalesces client spans within one invocation.
      new BatchSpanProcessor(exporter, { scheduledDelayMillis: 100 })
    ]
  });
  provider.register({
    propagator: new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator(), new AWSXRayPropagator()]
    })
  });
  // These instrument what survives bundling: Node's http/https builtins are patched on the shared
  // module object, and undici (global fetch) publishes diagnostics_channel events regardless of
  // bundling. Inlined third-party libraries are out of hook reach by design.
  registerInstrumentations({
    instrumentations: [new HttpInstrumentation({ requireParentforOutgoingSpans: false }), new UndiciInstrumentation()]
  });
  return { provider, xrayPropagator: new AWSXRayPropagator() };
};

/**
 * Wraps the user's handler with the invocation span: parented on the X-Ray platform segment (via
 * `_X_AMZN_TRACE_ID`), closed and flushed before the sandbox can freeze.
 */
export const wrapLambdaHandler = <T extends LambdaHandler>(userHandler: T): T => {
  if (typeof userHandler !== 'function') {
    return userHandler;
  }
  try {
    initialized ??= initialize();
  } catch (error) {
    console.error('Stacktape tracing failed to initialize; continuing without tracing.', error);
    return userHandler;
  }
  const { provider, xrayPropagator } = initialized;
  const tracer = trace.getTracer('stacktape-lambda-tracing');

  const wrapped = async (event: unknown, lambdaContext: unknown, ...rest: unknown[]) => {
    let span: Span | undefined;
    let activeContext: OtelContext = ROOT_CONTEXT;
    try {
      const parentContext = process.env._X_AMZN_TRACE_ID
        ? xrayPropagator.extract(
            ROOT_CONTEXT,
            { 'x-amzn-trace-id': process.env._X_AMZN_TRACE_ID },
            environmentCarrierGetter
          )
        : ROOT_CONTEXT;
      const contextLike = (lambdaContext ?? {}) as {
        functionName?: string;
        awsRequestId?: string;
        invokedFunctionArn?: string;
      };
      // HTTP invocations get the request as the span name — "GET /orders/42" reads; a bare
      // function name does not.
      const http = httpFromEvent(event);
      span = tracer.startSpan(
        http
          ? `${http.method} ${http.path}`
          : contextLike.functionName || process.env.AWS_LAMBDA_FUNCTION_NAME || 'invoke',
        {
          kind: SpanKind.SERVER,
          attributes: {
            'faas.trigger': http ? 'http' : 'other',
            'faas.coldstart': coldStart,
            ...(http ? { 'http.request.method': http.method, 'url.path': http.path } : {}),
            ...(contextLike.awsRequestId ? { 'faas.invocation_id': contextLike.awsRequestId } : {}),
            ...(contextLike.invokedFunctionArn ? { 'cloud.resource_id': contextLike.invokedFunctionArn } : {})
          }
        },
        parentContext
      );
      coldStart = false;
      activeContext = trace.setSpan(parentContext, span);
    } catch (error) {
      console.error('Stacktape tracing failed to start the invocation span.', error);
    }

    try {
      const result = await otelContext.with(activeContext, () => userHandler(event, lambdaContext, ...rest));
      span?.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span?.recordException(error as Error);
      span?.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      span?.end();
      await provider.forceFlush().catch(() => {});
    }
  };
  return wrapped as T;
};
