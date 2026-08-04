- Send a test webhook:
  ```bash
  curl -X POST <API_GATEWAY_URL>/webhooks \
    -H "Content-Type: application/json" \
    -d '{"event": "payment.completed", "data": {"amount": 99.99}}'
  ```
- Check CloudWatch Logs for the `processWebhook` function to see async processing.
