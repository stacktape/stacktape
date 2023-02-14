import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getKafkaProducer } from './services/kafka';

const handler: APIGatewayProxyHandlerV2 = async (event, _context) => {
  try {
    const producer = await getKafkaProducer();
    await producer.send({
      topic: process.env.STP_KAFKA_TOPIC_TOPIC_NAME,
      messages: [{ value: event.pathParameters.message }],
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Message successfully handled.' }),
    };
  } catch (err) {
    console.error(err);
    return {
      headers: { 'Content-Type': 'application/json' },
      statusCode: 500,
      body: JSON.stringify({ message: 'error', error: err.message }),
    };
  }
};

export default handler;
