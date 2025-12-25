import type { Handler } from 'aws-lambda';

const handler: Handler = async (event, context) => {
  console.log(event, context);
  console.info('Version: 1');
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello, World! 7'
    })
  };
};

export default handler;
