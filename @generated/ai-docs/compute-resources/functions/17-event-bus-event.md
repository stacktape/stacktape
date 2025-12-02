# Event Bus event

Triggers the function when a matching event is received by an event bus.

```yaml
resources:
  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      events:
        # {start-highlight}
        - type: event-bus
          properties:
            useDefaultBus: true
            eventPattern:
              source:
                - 'aws.autoscaling'
              region:
                - 'us-west-2'
      # {stop-highlight}
```

```yaml
resources:
  myEventBus:
    type: event-bus

  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      # {start-highlight}
      events:
        - type: event-bus
          properties:
            eventBusName: myEventBus
            eventPattern:
              source:
                - 'mycustomsource'
      # {stop-highlight}
```