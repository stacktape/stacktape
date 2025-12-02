# Timeout

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
      timeout: 1200
      # {stop-highlight}
```