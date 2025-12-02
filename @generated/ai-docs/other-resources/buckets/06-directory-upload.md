# Directory upload

You can automatically upload the contents of a local directory to a bucket during deployment.

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      # {start-highlight}
      directoryUpload:
        directoryPath: ../public
      # {stop-highlight}
```

> This configuration uploads the `public` folder to the bucket on every deployment.