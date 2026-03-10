import type { Handler } from 'aws-lambda';

const handler: Handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      reportMode: process.env.REPORT_MODE,
      tableName: process.env.TABLE_NAME
    })
  };
};

export default handler;
