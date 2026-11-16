// Consumes the jobs queue's messages, as a backend's Shopify webhook worker does.
import { doWork } from '../shared/work';

export default async (event: { Records?: { body: string }[] }) => {
  for (const record of event.Records ?? []) console.log(`queueConsumer received ${record.body}`);
  return doWork('queueConsumer', undefined);
};
