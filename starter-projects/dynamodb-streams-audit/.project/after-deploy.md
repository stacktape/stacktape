- Create a product:
  ```bash
  curl -X POST <API_GATEWAY_URL>/products \
    -H "Content-Type: application/json" \
    -d '{"name": "Widget", "price": 9.99}'
  ```

- Update a product (use the `id` from the response above):
  ```bash
  curl -X PUT <API_GATEWAY_URL>/products/<ID> \
    -H "Content-Type: application/json" \
    -d '{"name": "Widget Pro", "price": 19.99}'
  ```

- View the audit trail (wait a few seconds for stream processing):
  ```bash
  curl <API_GATEWAY_URL>/audit
  ```
