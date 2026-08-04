import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import type { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';

const eventBridge = new EventBridgeClient({});

const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const failures: SQSBatchItemFailure[] = [];
  const eventBusArn = process.env.STP_EVENT_BUS_ARN!;

  for (const record of event.Records) {
    try {
      const order = JSON.parse(record.body);
      console.log(`Processing order: ${order.orderId}`, JSON.stringify(order));

      if (!order.orderId || !order.items?.length) {
        throw new Error('Invalid order: missing orderId or items');
      }

      await eventBridge.send(
        new PutEventsCommand({
          Entries: [
            {
              EventBusName: eventBusArn,
              Source: 'orders',
              DetailType: 'OrderProcessed',
              Detail: JSON.stringify({ ...order, processedAt: new Date().toISOString(), status: 'processed' })
            }
          ]
        })
      );

      console.log(`Order ${order.orderId} processed and event published`);
    } catch (error) {
      console.error(`Failed to process order from message ${record.messageId}:`, error);
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
};

export default handler;
