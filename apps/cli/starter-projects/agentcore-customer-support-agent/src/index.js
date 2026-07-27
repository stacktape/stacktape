const http = require('node:http');
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const bedrock = new BedrockRuntimeClient({});
const modelId = process.env.AI_MODEL || 'eu.amazon.nova-micro-v1:0';

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

const invokeModel = async ({ message, sessionId }) => {
  const prompt = [
    'You are a customer support operations agent.',
    'Resolve routine issues, summarize escalation context, and use governed support tools when account lookup or ticket creation is needed.',
    `AgentCore memory id: ${process.env.STP_AGENTCORE_MEMORY_ID || 'not configured'}.`,
    `AgentCore gateway url: ${process.env.STP_AGENTCORE_GATEWAY_URL || 'not configured'}.`,
    `Session id: ${sessionId}.`,
    `Customer request: ${message}`
  ].join('\n');

  const response = await bedrock.send(
    new ConverseCommand({
      modelId,
      inferenceConfig: { maxTokens: 900 },
      messages: [{ role: 'user', content: [{ text: prompt }] }]
    })
  );

  return (
    response.output?.message?.content
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('\n') || 'No response from model.'
  );
};

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
    const sessionId =
      request.headers['x-amzn-bedrock-agentcore-runtime-session-id'] || body.sessionId || 'local-session';
    const message = body.message || body.prompt || 'Summarize the current support case.';
    const answer = await invokeModel({ message, sessionId });

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        sessionId,
        answer,
        configuredResources: {
          memoryId: process.env.STP_AGENTCORE_MEMORY_ID,
          gatewayUrl: process.env.STP_AGENTCORE_GATEWAY_URL
        },
        availableTools: ['get_customer_profile', 'create_support_ticket']
      })
    );
  } catch (error) {
    console.error('Invocation failed', error);
    response.writeHead(500, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(Number(process.env.PORT || 8080), '0.0.0.0');
