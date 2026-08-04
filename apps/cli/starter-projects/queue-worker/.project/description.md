- Background job processing with [SQS queue](https://docs.stacktape.com/resources/sqs-queues/) and
  [Lambda](https://docs.stacktape.com/compute-resources/lambda-functions/) consumer.
- Includes an HTTP API to enqueue jobs and a worker function that processes them. Supports batch processing with
  per-message error handling.
