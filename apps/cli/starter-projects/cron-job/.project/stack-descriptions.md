### 1.1 Scheduled Function

A Lambda function triggered on a schedule. The schedule is configured using AWS rate or cron expressions.

- `rate(1 hour)` - runs every hour
- `rate(5 minutes)` - runs every 5 minutes
- `cron(0 18 ? * MON-FRI *)` - runs at 6 PM UTC on weekdays

```yml
resources:
  scheduledTask:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/handler.ts
      memory: 512
      timeout: 300
      events:
        - type: schedule
          properties:
            scheduleRate: rate(1 hour)
```
