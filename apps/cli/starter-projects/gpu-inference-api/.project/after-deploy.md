- Submit an inference job:

```bash
curl -X POST <API_GATEWAY_URL>/infer \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A photo of a sunset over mountains", "num_images": 1}'
```

- The job runs asynchronously on a GPU instance. Check CloudWatch Logs or the AWS Batch console for results.
- Output is stored in the S3 output bucket.
