import type { Handler } from 'aws-lambda';

const handler: Handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'diff preview api v2',
      tableName: process.env.TABLE_NAME,
      featureFlag: process.env.FEATURE_FLAG
    })
  };
};

export default handler;
