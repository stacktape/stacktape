import type { Handler } from 'aws-lambda';

const handler: Handler = async (event) => {
  const mode = event?.queryStringParameters?.mode || 'throw';
  if (mode === 'console-error') {
    console.error(new Error('Caught error via console.error'));
    return { statusCode: 200, body: 'logged error' };
  }
  if (mode === 'different') {
    throw new TypeError('A different type of error for grouping test');
  }
  throw new Error('TypeScript Lambda uncaught error');
};

export default handler;
