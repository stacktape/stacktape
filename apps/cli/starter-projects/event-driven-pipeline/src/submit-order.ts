import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

const handler = async (event: { body: string }) => {
  const order = JSON.parse(event.body);
  const queueUrl = process.env.STP_ORDER_QUEUE_URL!;

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(order),
      MessageGroupId: order.orderId || 'default',
      MessageDeduplicationId: `${order.orderId}-${Date.now()}`
    })
  );

  return {
    statusCode: 202,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Order submitted', orderId: order.orderId })
  };
};

export default handler;
