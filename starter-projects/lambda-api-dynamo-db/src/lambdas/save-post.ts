import { PostModel } from '../dynamodb-schema';

const handler = async (event, context) => {
  // Event contains the information about the HTTP request made to the HTTP Api Gateway.
  try {
    const requestBody = JSON.parse(event.body);

    // save post data to the DynamoDb table
    const postData = await PostModel.create({
      title: requestBody.title,
      content: requestBody.content,
      authorEmail: requestBody.authorEmail,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'success', data: postData }),
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
