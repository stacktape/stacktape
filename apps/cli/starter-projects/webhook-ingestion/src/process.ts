import type { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';

const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const failures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      const webhook = JSON.parse(record.body);
      const payload = JSON.parse(webhook.payload);

      console.log(`Processing webhook received at ${webhook.receivedAt}:`, JSON.stringify(payload));

      // Your webhook processing logic here.
      // Examples:
      // - Verify webhook signature (Stripe: stripe-signature header)
      // - Update order status in database
      // - Trigger follow-up workflows
      // - Send notification emails

      console.log(`Webhook ${record.messageId} processed successfully`);
    } catch (error) {
      console.error(`Failed to process webhook ${record.messageId}:`, error);
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
};

export default handler;
