### 1.1 Buckets

Two S3 buckets handle the data pipeline:

- **inputBucket** — upload `.zip` archives of images here to kick off classification.
- **outputBucket** — the batch job writes classified images here, organized into folders by predicted class.

Both use the default [bucket configuration](https://docs.stacktape.com/resources/buckets/).

```yml
inputBucket:
  type: bucket

outputBucket:
  type: bucket
```

### 1.2 Batch job

The classifier runs as a GPU-capable batch job using
[spot instances](https://docs.stacktape.com/compute-resources/batch-jobs/#spot-instances) for up to 90 % cost savings.

- **S3 event trigger** — an `s3:ObjectCreated` event on the input bucket (filtered to `.zip` suffix) starts the job
  automatically. No polling, no cron — just upload and go.
- **Container packaging** — uses a custom `Dockerfile` based on the
  [TensorFlow image](https://hub.docker.com/r/tensorflow/tensorflow/). Stacktape builds the image and pushes it to a
  managed ECR repository. You can also use
  [other packaging types](https://docs.stacktape.com/configuration/packaging/#packaging-multi-container-workloads).
- **connectTo** — listing `inputBucket` and `outputBucket` in `connectTo` makes Stacktape automatically create the
  required IAM permissions **and** inject environment variables (bucket names, ARNs) into the container. No manual
  policy writing needed.
- **Resources & spot** — `cpu` and `memory` define the instance size AWS provisions on demand. Setting
  `useSpotInstances: true` opts into spot capacity, cutting costs significantly for fault-tolerant ML workloads.
- **Swap the model** — while this starter uses TensorFlow + EfficientNet, you can replace it with any ML framework
  (PyTorch, JAX, etc.) by changing the Dockerfile and source code. The infrastructure stays the same.

```yml
classifierJob:
  type: batch-job
  properties:
    container:
      packaging:
        type: custom-dockerfile
        properties:
          buildContextPath: ./
    resources:
      cpu: 2
      memory: 14000
    useSpotInstances: true
    connectTo:
      - inputBucket
      - outputBucket
    events:
      - type: s3
        properties:
          bucketArn: $ResourceParam('inputBucket', 'arn')
          s3EventType: s3:ObjectCreated:*
          filterRule:
            suffix: .zip
```
