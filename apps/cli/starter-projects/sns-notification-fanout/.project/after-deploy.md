- Publish a notification:
  ```bash
  curl -X POST <API_GATEWAY_URL>/notify \
    -H "Content-Type: application/json" \
    -d '{"subject": "Order Shipped", "message": "Your order #1234 has been shipped."}'
  ```

- List stored notifications (wait a few seconds for processing):
  ```bash
  curl <API_GATEWAY_URL>/notifications
  ```
