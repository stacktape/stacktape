import type { Handler } from 'aws-lambda';

const handler: Handler = async (event, context) => {
  console.log(event, context);
  throw new Error('This is a test error');
};

export default handler;
