### 1.1 Buckets

Buckets offer persistent, scalable storage for any type of object(files).

In this project we use two buckets:

- **inputBucket** - used for uploading `.zip` file(s) containing pictures that we wish to classify(categorize)
- **outputBucket** - used by apps batch job to output images categorized into classes.

You can configure [multiple properties](https://docs.stacktape.com/resources/buckets/) on the bucket. In this case, we
are using the default setup.

```yml
inputBucket:
  type: bucket

outputBucket:
  type: bucket
```

### 1.2 Batch job

The classifier application runs in a batch job.

The batch job is configured as follows:

- [Container](https://docs.stacktape.com/compute-resources/batch-jobs/#container) section specifies details of our job
  container
  - **Packaging** - determines how the Docker container image is built. In this example, we are using our custom
    `Dockerfile` based of [tensorflow image](https://hub.docker.com/r/tensorflow/tensorflow/). Stacktape builds the
    Docker image and pushes it to a pre-created image repository on AWS. You can also use
    [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-multi-container-workloads).
- **ConnectTo list** - we are adding buckets `inputBucket` and `outputBucket` into `connectTo` list. By doing this,
  Stacktape will automatically setup necessary IAM permissions for the batch job's role as well as inject relevant
  environment variables into the runtime (such as AWS names of the buckets).
- [Resources](https://docs.stacktape.com/compute-resources/batch-jobs/) assigned to the job. We are providing the number
  of cpus and the amount of memory the job needs. When job is triggered AWS will automatically spin-up an instance with
  the required resources on which the job will run. We are also using the `useSpotInstances` property, which configures
  job to use cheaper [spot instances](https://docs.stacktape.com/compute-resources/batch-jobs/#spot-instances).
- [Access control](https://docs.stacktape.com/compute-resources/batch-jobs/#accessing-other-resources) - Since our job
  reads from `inputBucket` and writes to `outputBucket`, it needs permissions to access these resources. We are granting
  the permissions by listing them in `connectTo` list. To see other ways of controlling access to resources refer to
  [the docs](https://docs.stacktape.com/compute-resources/batch-jobs/#accessing-other-resources)
- We are configuring **events** that trigger the job. In this case, we are triggering the batch job if a `zip` file is
  uploaded to (created in) the `inputBucket`.

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
