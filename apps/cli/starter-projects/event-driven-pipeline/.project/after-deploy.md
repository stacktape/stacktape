- Submit an order:

```bash
curl -X POST <API_GATEWAY_URL>/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "order-001", "items": [{"name": "Widget", "qty": 2}], "total": 49.99}'
```

- Check CloudWatch Logs or the Step Functions console to see the pipeline execution.
