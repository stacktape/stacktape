# Asynchronous invocation

The caller queues the function for execution and does not wait for the result. This is used by SNS, SQS, EventBridge, S3, and others. If an asynchronously invoked function fails, AWS Lambda will automatically retry it up to two times.