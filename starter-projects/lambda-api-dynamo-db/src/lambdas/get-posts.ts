import { PostModel } from '../dynamodb-schema';

const handler = async (event, context) => {
  try {
    // get all the posts data from the DynamoDb table
    const posts = await PostModel.scan();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'success', data: posts }),
    };
  } catch (error) {
    // If anything goes wrong, log the error.
    // You can later access the log data in the AWS console.
    console.error(error);
    return {
      headers: { 'Content-Type': 'application/json' },
      statusCode: 500,
      body: JSON.stringify({ message: 'error', error: error.message }),
    };
  }
};

export default handler;
