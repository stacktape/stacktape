import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import Redis from 'ioredis';

const client = new Redis(process.env.REDIS_URL);

const handler: APIGatewayProxyHandlerV2 = async (event, _context) => {
  const { key, value } = event.pathParameters;

  await client.set(key, value);

  const storedValue = await client.get(key);

  try {
    return {
      headers: { 'Content-Type': 'application/json' },
      statusCode: 200,
      body: JSON.stringify({ message: `Successfully stored value '${storedValue}' with key '${key}'.` }),
    };
  } catch (error) {
    // If anything goes wrong, log the error.
    // You can later access the log data in the AWS console.
    console.error(error);
    return {
      headers: { 'Content-Type': 'application/json' },
      statusCode: 500,
      body: JSON.stringify({ message: 'error', error: error.message }),
    };
  }
};

export default handler;
