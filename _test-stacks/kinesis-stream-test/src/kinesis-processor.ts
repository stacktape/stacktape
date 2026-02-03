import type { KinesisStreamEvent } from 'aws-lambda';

export const handler = async (event: KinesisStreamEvent) => {
  console.log('Received Kinesis event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
    console.log('Decoded payload:', payload);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Processed ${event.Records.length} records` })
  };
};
