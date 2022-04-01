import { connectMongoose, Post } from '../mongoose';

// Event contains the information about the HTTP request made to the HTTP Api Gateway.
const handler = async (event, context) => {
  await connectMongoose();
  try {
    // save post data to the database using a Mongoose model
    const posts = await Post.find({});

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'success',
        data: posts.map((post) => post.toJSON())
      })
    };
  } catch (error) {
    // If anything goes wrong, log the error.
    // You can later access the log data in the AWS console.
    console.error(error);
    return {
      headers: { 'Content-Type': 'application/json' },
      statusCode: 500,
      body: JSON.stringify({
        message: 'error',
        error: error.message
      })
    };
  }
};

export default handler;
