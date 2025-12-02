# Computing resources

You can specify the amount of CPU, memory, and GPU for your batch job. AWS Batch selects the most cost-effective instance type that fits your job's requirements. To learn more about GPU instances, refer to the [AWS Docs](https://docs.aws.amazon.com/batch/latest/userguide/gpu-jobs.html).

```yaml
resources:
  myBatchJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: batch-jobs/js-batch-job.js
      # {start-highlight}
      resources:
        cpu: 2
        memory: 1800
      # {stop-highlight}
      events:
        - type: schedule
          properties:
            scheduleRate: 'cron(0 14 * * ? *)' # every day at 14:00 UTC
```