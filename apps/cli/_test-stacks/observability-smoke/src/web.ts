/**
 * Traced container app: a plain Node HTTP server whose OpenTelemetry SDK exports every request as a
 * span. The SDK is configured entirely from the environment Stacktape injects (OTLP endpoint on the
 * collector sidecar, resource attributes, sampler), so a span arriving in `aws/spans` proves the
 * whole container tracing path.
 */
import { createServer } from 'node:http';
import { trace } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';

const sdk = new NodeSDK({ traceExporter: new OTLPTraceExporter() });
sdk.start();

const tracer = trace.getTracer('observability-smoke-web');

const server = createServer((request, response) => {
  tracer.startActiveSpan(`GET ${request.url}`, (span) => {
    span.setAttribute('http.request.method', request.method || 'GET');
    span.setAttribute('url.path', request.url || '/');
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, path: request.url, at: new Date().toISOString() }));
    span.setAttribute('http.response.status_code', 200);
    span.end();
  });
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log(`observability-smoke web listening on ${port}`);
});

const shutdown = () => {
  server.close(() => {
    sdk.shutdown().finally(() => process.exit(0));
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
