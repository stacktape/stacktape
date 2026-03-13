import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const mode = event.queryStringParameters?.mode || 'ok';

  if (mode === 'error') {
    throw new Error('Intentional monitoring real-stack error');
  }

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true, mode })
  };
};

export default handler;
