import type { Handler } from 'aws-lambda';

const handler: Handler = async () => {
  throw new Error('TypeScript test error from multi-lang stack');
};

export default handler;
