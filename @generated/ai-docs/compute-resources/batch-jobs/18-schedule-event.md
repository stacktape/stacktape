# Schedule event

Triggers the job on a defined schedule using either a fixed rate (e.g., every 5 minutes) or a cron expression.

-   [Learn more about rate expressions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#RateExpressions)
-   [Learn more about Cron expressions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#CronExpressions)

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
      # {start-highlight}
      events:
        # invoke function every two hours
        - type: schedule
          properties:
            scheduleRate: rate(2 hours)
        # invoke function at 10:00 UTC every day
        - type: schedule
          properties:
            scheduleRate: cron(0 10 * * ? *)
      # {stop-highlight}
```