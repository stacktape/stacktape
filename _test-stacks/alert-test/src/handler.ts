import type { Handler } from 'aws-lambda';

const handler: Handler = async () => {
  return { statusCode: 200, body: JSON.stringify({ message: 'alert-test ok' }) };
};

export default handler;
