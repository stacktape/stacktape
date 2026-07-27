import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

const handler = async (event: { body: string }) => {
  try {
    const body = JSON.parse(event.body);
    const queueUrl = process.env.STP_JOB_QUEUE_URL!;

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({
          type: body.type || 'default',
          payload: body.payload || {},
          enqueuedAt: new Date().toISOString()
        })
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Job enqueued successfully' })
    };
  } catch (error: any) {
    console.error('Failed to enqueue job:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Failed to enqueue job', error: error.message })
    };
  }
};

export default handler;
