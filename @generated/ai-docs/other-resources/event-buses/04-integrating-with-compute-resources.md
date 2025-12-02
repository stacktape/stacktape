# Integrating with compute resources

Events published to an event bus can trigger a [batch job](../../compute-resources/batch-jobs/19-event-bus-event.md) or a [function](../../compute-resources/functions/17-event-bus-event.md). Events can be published from any compute resource with the necessary permissions.

This example shows:

-   An event bus that acts as a bridge between a publisher function and a consumer batch job.
-   An HTTP API Gateway that triggers the publisher function.
-   A publisher function that receives requests from the API Gateway and publishes a `BUDGET_ANALYSIS` event to the event bus.
-   A consumer batch job that is triggered by the `BUDGET_ANALYSIS` event.

```yaml
variables:
  eventName: 'BUDGET_ANALYSIS'

resources:
  myEventBus:
    type: 'event-bus'

  myPublisherFunction:
    type: 'function'
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'lambdas/event-bus-publisher.ts'
      environment:
        - name: EVENT_NAME
          value: $Var().eventName
        - name: EVENT_BUS_NAME
          value: $Param('myEventBus', 'EventBus::Name')
      # {start-highlight}
      # granting access for function to publish events into myEventBus
      connectTo:
        - myEventBus
      # {stop-highlight}
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: 'myHttpApi'
            method: 'GET'
            path: '/budget-analysis'

  myConsumerBatchJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: 'batch-jobs/event-bus-consumer'
      resources:
        cpu: 1
        memory: 200
      # {start-highlight}
      # batch-job is triggered if myEventBus receives event that matches the specified eventPattern
      events:
        - type: event-bus
          properties:
            eventBusName: myEventBus
            eventPattern:
              detail:
                EventName:
                  - '$Var().eventName'
      # {stop-highlight}

  myHttpApi:
    type: 'http-api-gateway'
```