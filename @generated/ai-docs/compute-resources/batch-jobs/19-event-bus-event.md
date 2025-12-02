# Event Bus event

Triggers the job when a matching event is received by a specified event bus. You can use the default AWS event bus or a [custom event bus](../../../other-resources/event-buses.md).

```yaml
resources:
  myBatchJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: path/to/my/batch-job.ts
      resources:
        cpu: 2
        memory: 1800
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

> Batch job connected to the default event bus

```yaml
resources:
  myEventBus:
    type: event-bus

  myBatchJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: path/to/my/batch-job.ts
      resources:
        cpu: 2
        memory: 1800
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

> Batch job connected to a custom event bus