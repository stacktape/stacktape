import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({});

const interval = setInterval(async () => {
  try {
    const { Messages } = await sqsClient.send(new ReceiveMessageCommand({ QueueUrl: process.env.STP_MY_QUEUE_URL }));
    if (Messages?.length) {
      // do some message processing
      // .....

      // After processing, delete messages from queue.
      // If you do NOT delete messages, they will become visible after visibility timeout elapses.
      // This can lead to same message being processed twice.
      await Promise.all(
        Messages.map(({ ReceiptHandle }) =>
          sqsClient.send(new DeleteMessageCommand({ QueueUrl: process.env.STP_MY_QUEUE_URL, ReceiptHandle }))
        )
      );
    }
    console.info('Nothing to process');
  } catch (err) {
    // error handling
    console.error(err);
    clearInterval(interval);
  }
}, 10000);
