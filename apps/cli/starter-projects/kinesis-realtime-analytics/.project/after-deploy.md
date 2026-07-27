- Send an event to the stream:
  ```bash
  curl -X POST <API_GATEWAY_URL>/events \
    -H "Content-Type: application/json" \
    -d '{"type": "pageview", "page": "/home", "userId": "user-1"}'
  ```

- Query aggregated analytics (wait a few seconds for batch processing):
  ```bash
  curl <API_GATEWAY_URL>/analytics
  ```
