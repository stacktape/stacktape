# Basic usage

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
        - type: schedule
          properties:
            scheduleRate: cron(0 14 * * ? *) # every day at 14:00 UTC
```

```typescript
(async () => {
  const event = JSON.parse(process.env.STP_TRIGGER_EVENT_DATA);

  // process the event
})();
```