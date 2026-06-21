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

const invokeModel = async ({ question, sampleData, sessionId }) => {
  const prompt = [
    'You are a data analyst agent.',
    'Explain the analysis plan, the code you would run in a sandbox, expected charts, and the final business summary.',
    `AgentCore code interpreter id: ${process.env.STP_AGENTCORE_CODE_INTERPRETER_ID || 'not configured'}.`,
    `AgentCore memory id: ${process.env.STP_AGENTCORE_MEMORY_ID || 'not configured'}.`,
    `Reports bucket: ${process.env.STP_REPORTS_BUCKET_NAME || process.env.STP_REPORTSBUCKET_NAME || 'not configured'}.`,
    `Report prefix: ${process.env.REPORT_PREFIX || 'analyst-reports/'}.`,
    `Session id: ${sessionId}.`,
    `Question: ${question}`,
    sampleData ? `Sample data:\n${sampleData}` : 'No sample data was provided.'
  ].join('\n');

  const response = await bedrock.send(
    new ConverseCommand({
      modelId,
      inferenceConfig: { maxTokens: 1200 },
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
    const question = body.question || body.message || 'Analyze monthly revenue by product and highlight anomalies.';
    const plan = await invokeModel({ question, sampleData: body.sampleData, sessionId });

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        sessionId,
        plan,
        configuredResources: {
          memoryId: process.env.STP_AGENTCORE_MEMORY_ID,
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
