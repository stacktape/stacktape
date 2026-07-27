### 1.1 HTTP API Gateway

Exposes a public HTTP endpoint for submitting inference requests.

```yml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
```

### 1.2 Trigger Inference Function

Receives HTTP POST requests and starts the batch job's Step Functions state machine. Uses `connectTo` for automatic IAM
permissions and environment variable injection (`STP_inferenceJob_STATE_MACHINE_ARN`).

```yml
triggerInference:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/trigger.ts
    memory: 512
    connectTo:
      - inferenceJob
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: apiGateway
          path: /infer
          method: POST
```

### 1.3 Inference Batch Job

GPU-accelerated batch job that runs a custom Docker container with NVIDIA CUDA support. Configured with 4 vCPUs, 16 GB
memory, and 1 GPU. Uses spot instances for up to 90% cost savings, with automatic retries on failure or interruption.

```yml
inferenceJob:
  type: batch-job
  properties:
    container:
      packaging:
        type: custom-dockerfile
        properties:
          buildContextPath: ./job
    resources:
      cpu: 4
      memory: 16000
      gpu: 1
    useSpotInstances: true
    retryConfig:
      attempts: 2
    connectTo:
      - outputBucket
```

### 1.4 Output Bucket

S3 bucket for storing inference results. The batch job writes output files here after processing is complete.

```yml
outputBucket:
  type: bucket
```
