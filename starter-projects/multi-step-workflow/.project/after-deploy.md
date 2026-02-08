- Start a workflow:
  ```bash
  curl -X POST <API_GATEWAY_URL>/start \
    -H "Content-Type: application/json" \
    -d '{"data": "hello world"}'
  ```

- Check execution status (use the executionArn from the response above):
  ```bash
  curl "<API_GATEWAY_URL>/status/<EXECUTION_ARN>"
  ```

- Start with invalid input (triggers the Fail state):
  ```bash
  curl -X POST <API_GATEWAY_URL>/start \
    -H "Content-Type: application/json" \
    -d '{}'
  ```
