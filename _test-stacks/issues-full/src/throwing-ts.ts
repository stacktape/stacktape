import type { Handler } from 'aws-lambda';

const handler: Handler = async () => {
  throw new Error('TS error for re-open test');
};

export default handler;
