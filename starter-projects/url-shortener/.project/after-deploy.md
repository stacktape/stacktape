- Create a short URL:
  ```bash
  curl -X POST <API_GATEWAY_URL>/shorten \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}'
  ```

- Visit the short URL to be redirected:
  ```bash
  curl -L <API_GATEWAY_URL>/<CODE>
  ```

- List all links with click counts:
  ```bash
  curl <API_GATEWAY_URL>/links
  ```
