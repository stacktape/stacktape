import type { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';

const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const failures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      const job = JSON.parse(record.body);
      console.log(`Processing job: ${job.type}`, JSON.stringify(job.payload));

      // Your job processing logic goes here.
      // Common use cases:
      // - Send emails
      // - Process uploaded files
      // - Generate thumbnails
      // - Run data pipelines
      // - Call external APIs

      console.log(`Job ${record.messageId} processed successfully`);
    } catch (error) {
      console.error(`Failed to process job ${record.messageId}:`, error);
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
};

export default handler;
