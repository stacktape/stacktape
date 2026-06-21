const http = require('node:http');

const readBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      resolve(raw ? JSON.parse(raw) : {});
    });
    request.on('error', reject);
  });

const server = http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/ping') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (request.method !== 'POST' || request.url !== '/invocations') {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'Use POST /invocations.' }));
    return;
  }

  try {
    const body = await readBody(request);
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        scenario: 'minimal-default',
        sessionId: request.headers['x-amzn-bedrock-agentcore-runtime-session-id'],
        userId: request.headers['x-amzn-bedrock-agentcore-runtime-user-id'],
        body,
        env: {
          marker: process.env.STP_TEST_MARKER,
          memoryId: process.env.STP_AGENTCORE_MEMORY_ID,
          gatewayUrl: process.env.STP_AGENTCORE_GATEWAY_URL,
          browserId: process.env.STP_AGENTCORE_BROWSER_ID,
          codeInterpreterId: process.env.STP_AGENTCORE_CODE_INTERPRETER_ID
        }
      })
    );
  } catch (error) {
    console.error('Invocation failed', error);
    response.writeHead(500, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(Number(process.env.PORT || 8080), '0.0.0.0');
