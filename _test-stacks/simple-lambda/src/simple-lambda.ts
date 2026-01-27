import type { Handler } from 'aws-lambda';

const handler: Handler = async (event, context) => {
  console.log(event, context);
  throw new Error('test error');
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello, World!'
    })
  };
};

export default handler;
