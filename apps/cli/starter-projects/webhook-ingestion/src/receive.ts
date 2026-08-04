import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

const handler = async (event: { body: string; headers: Record<string, string> }) => {
  const queueUrl = process.env.STP_WEBHOOK_QUEUE_URL!;

  // Store the raw webhook payload + headers for processing
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({
        payload: event.body,
        headers: event.headers,
        receivedAt: new Date().toISOString()
      })
    })
  );

  // Respond immediately to acknowledge receipt
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ received: true })
  };
};

export default handler;
