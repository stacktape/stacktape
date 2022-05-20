# Tensorflow image classification

- This project deploys machine-learning powered image classifier built using [Tensorflow](https://www.tensorflow.org/)
  and Python.
- The project uses a [Batch job](https://docs.stacktape.com/resources/batch-jobs/) to run the classification and 2
  [S3 storage buckets](https://docs.stacktape.com/resources/buckets/) to store the input and output.

## Pricing

- The infrastructure required for this application uses exclusively "serverless", pay-per-use infrastructure. If your load won't get high, the costs will be close to $0.
- You can also control your cloud spend using [budget control](https://docs.stacktape.com/configuration/budget-control/).

## Prerequisites

If you're deploying from your local machine (not from a CI/CD pipeline), you need the following prerequisites:

- Stacktape installed. To install it, you can follow the [installation instructions](https://docs.stacktape.com/getting-started/setup-stacktape/).
- Docker. To install Docker on your system, you can follow [this guide](https://docs.docker.com/get-docker/).

- [Python version > 3.9](https://www.python.org/) and [Poetry](https://python-poetry.org/docs/) package manager installed.

- **(optional) install [Stacktape VSCode extension](https://marketplace.visualstudio.com/items?itemName=stacktape.vscode-stacktape) with
  validation, autocompletion and on-hover documentation.**

## 1. Generate your project

The command below will bootstrap the project with pre-built application code and pre-configured `stacktape.yml` config file.

```bash
stp init --projectId tensorflow-image-classification
```

## 2. Before deploy

- Install your projects dependencies. The recommended way is to use [Virtual environment](https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/).

## 3. Deploy your stack

- To provision all the required infrastructure and to deploy your application to the cloud, all you need is a single
  command.
- The deployment will take ~5-15 minutes. Subsequent deploys will be significantly faster.

```bash
stp deploy --stage <<stage>> --region <<region>>
```

`stage` is an arbitrary name of your environment (for example **staging**, **production** or **dev-john**)

`region` is the AWS region, where your stack will be deployed to. All the available regions are listed below.

<br />

| Region name & Location     | code           |
| -------------------------- | -------------- |
| Europe (Ireland)           | eu-west-1      |
| Europe (London)            | eu-west-2      |
| Europe (Frankfurt)         | eu-central-1   |
| Europe (Milan)             | eu-south-1     |
| Europe (Paris)             | eu-west-3      |
| Europe (Stockholm)         | eu-north-1     |
| US East (Ohio)             | us-east-2      |
| US East (N. Virginia)      | us-east-1      |
| US West (N. California)    | us-west-1      |
| US West (Oregon)           | us-west-2      |
| Canada (Central)           | ca-central-1   |
| Africa (Cape Town)         | af-south-1     |
| Asia Pacific (Hong Kong)   | ap-east-1      |
| Asia Pacific (Mumbai)      | ap-south-1     |
| Asia Pacific (Osaka-Local) | ap-northeast-3 |
| Asia Pacific (Seoul)       | ap-northeast-2 |
| Asia Pacific (Singapore)   | ap-southeast-1 |
| Asia Pacific (Sydney)      | ap-southeast-2 |
| Asia Pacific (Tokyo)       | ap-northeast-1 |
| China (Beijing)            | cn-north-1     |
| China (Ningxia)            | cn-northwest-1 |
| Middle East (Bahrain)      | me-south-1     |
| South America (São Paulo)  | sa-east-1      |

## 4. Test your application

After a successful deployment, some information about the stack will be printed to the console (**URLs** of the deployed services, links to **logs**, **metrics**, etc.).

1. Upload **test-pictures.zip** into `inputBucket`, through AWS console. Link to bucket contents was printed to the
   terminal after deploy `inputBucket -> contents`.
2. Check logs of the batch job (link was printed to the terminal `classifierJob -> logs`). It might take a minute for
   the job to start as AWS needs to spin-up instance for it. After logs show up, the job should be finished.
3. After the job has succeeded, check contents of `outputBucket` (link is available under `outputBucket -> contents`).
   You should see folders (each representing a class in which there are classified pictures from `inputBucket`)

## 5. Delete your stack

- If you no longer want to use your stack, you can delete it.
- Stacktape will automatically delete every infrastructure resource and deployment artifact associated with your stack.

```bash
stp delete --stage <<stage>> --region <<region>>
```

# Stack description

Stacktape uses a simple `stacktape.yml` configuration file to describe infrastructure resources, packaging, deployment
pipeline and other aspects of your services. You can deploy your services to multiple environments (stages) - for
example `production`, `staging` or `dev-john`.

Stack is a running instance of a service. It consists of your application code (if any) and the infrastructure resources
required to run it.

The configuration for this service is described below.

## 1. Service name

You can choose an arbitrary name for your service. The name of the stack will be constructed as
`{service-name}-{stage}`.

```yml
serviceName: posts-api-pg
```

## 2. Resources

- Every resources must have an arbitrary, alphanumeric name (A-z0-9).
- Stacktape resources are "high-level". They consist of multiple underlying AWS (or 3rd party) resources.

### 2.1 Buckets

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

### 2.2 Batch job

The classifier application runs in a batch job.

The batch job is configured as follows:

- [Container](https://docs.stacktape.com/resources/batch-jobs/#container) section specifies details of our job container
  - **Packaging** - determines how the Docker container image is built. In this example, we are using our custom
    `Dockerfile` based of [tensorflow image](https://hub.docker.com/r/tensorflow/tensorflow/). Stacktape builds the
    Docker image and pushes it to the pre-created image repository on AWS. You can also use
    [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-container-workloads).
  - **Environment variables** - We are passing `outputBucket` name to the container using an environment variable.
    Bucket's parameters can be easily referenced using a
    [$ResourceParam() directive](https://docs.stacktape.com/configuration/directives/#resource-param). This directive
    accepts a resource name (`outputBucket` in this case) and the name of the
    [bucket's referenceable parameter](https://docs.stacktape.com/resources/buckets/#referenceable-parameters)(in this
    case `name`). If you want to learn more, refer to
    [referencing parameters](https://docs.stacktape.com/configuration/referencing-parameters/) guide and
    [directives](https://docs.stacktape.com/configuration/directives) guide.
- [Resources](https://docs.stacktape.com/resources/batch-jobs/) assigned to the job. We are providing the number of cpus
  and the amount of memory the job needs. When job is triggered AWS will automatically spin-up an instance with the
  required resources on which the job will run. We are also using the `useSpotInstances` property, which configures job
  to use cheaper [spot instances](https://docs.stacktape.com/resources/batch-jobs/#spot-instances).
- [Access control](https://docs.stacktape.com/resources/batch-jobs/#accessing-other-resources) - Since our job reads
  from `inputBucket` and writes to `outputBucket`, it needs permissions to access these resources. We are granting the
  permissions by listing them in `allowAccessTo` list. To see other ways of controlling access to resources refer to
  [the docs](https://docs.stacktape.com/resources/batch-jobs/#accessing-other-resources)
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
      environment:
        - name: OUTPUT_BUCKET_NAME
          value: $ResourceParam('outputBucket', 'name')
    resources:
      cpu: 2
      memory: 14000
    useSpotInstances: true
    accessControl:
      allowAccessTo:
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
