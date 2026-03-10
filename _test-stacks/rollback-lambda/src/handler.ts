import type { Handler } from 'aws-lambda';

const handler: Handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ version: 'v1', message: 'Hello from v1 - original' })
  };
};

export default handler;
