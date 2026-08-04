- Enqueue a job:

```bash
curl -X POST <API_GATEWAY_URL>/enqueue \
  -H "Content-Type: application/json" \
  -d '{"type": "email", "payload": {"to": "user@example.com", "subject": "Hello"}}'
```

- Check CloudWatch Logs for the `processJob` function to see the job being processed.
