import {
  EventBus,
  EventBusIntegration,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  SqsIntegration,
  SqsQueue,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const orderDlq = new SqsQueue({
    fifoEnabled: true
  });
  const orderQueue = new SqsQueue({
    fifoEnabled: true,
    redrivePolicy: {
      targetSqsQueueName: 'orderDlq',
      maxReceiveCount: 3
    }
  });
  const submitOrder = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/submit-order.ts'
    }),
    memory: 512,
    connectTo: [orderQueue],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/orders',
        method: 'POST'
      })
    ]
  });
  const eventBus = new EventBus({});
  const processOrder = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/process-order.ts'
    }),
    memory: 512,
    timeout: 30,
    connectTo: [eventBus],
    events: [
      new SqsIntegration({
        sqsQueueName: 'orderQueue',
        batchSize: 1
      })
    ]
  });
  const onOrderProcessed = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/on-order-processed.ts'
    }),
    memory: 512,
    events: [
      new EventBusIntegration({
        eventBusName: 'eventBus',
        eventPattern: {
          source: ['orders'],
          'detail-type': ['OrderProcessed']
        }
      })
    ]
  });

  return {
    resources: { apiGateway, orderDlq, orderQueue, submitOrder, eventBus, processOrder, onOrderProcessed }
  };
});
