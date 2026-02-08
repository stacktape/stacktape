## How it works

This project implements the **fast acknowledgment + async processing** pattern for reliable webhook ingestion:

1. **`receiveWebhook` Lambda** — HTTP endpoint that accepts incoming webhook POST requests. It immediately enqueues the
   raw payload and headers into SQS and returns a `200` response. This keeps response times fast, preventing the webhook
   sender from timing out or retrying unnecessarily.

2. **`webhookQueue` SQS Queue** — Durable buffer between receiving and processing. Ensures no webhook events are lost,
   even if the processor is slow or temporarily failing. Failed messages are automatically retried.

3. **`processWebhook` Lambda** — Triggered by the SQS queue in batches of up to 10 messages. Handles the actual webhook
   logic (signature verification, database updates, notifications, etc.). Supports partial batch failure reporting —
   only failed messages are retried, successful ones are not reprocessed.

This decoupled architecture guarantees webhook delivery even under load spikes or transient processing errors.
