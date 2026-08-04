- Create a monitor:
  ```bash
  curl -X POST <API_GATEWAY_URL>/monitors \
    -H "Content-Type: application/json" \
    -d '{"name": "Google", "url": "https://www.google.com"}'
  ```

- List all monitors with their latest check results:
  ```bash
  curl <API_GATEWAY_URL>/monitors
  ```

- The health checker runs automatically every 5 minutes. Check back after a few minutes to see results.
