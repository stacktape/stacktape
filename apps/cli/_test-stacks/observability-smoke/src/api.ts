/**
 * Traced Lambda handler. The outbound HTTPS call gives the auto-instrumentation something to record
 * beyond the invocation itself, so a trace should show the handler plus one client span.
 */
export const handler = async () => {
  const response = await fetch('https://example.com', { method: 'GET' });
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true, upstreamStatus: response.status, at: new Date().toISOString() })
  };
};
