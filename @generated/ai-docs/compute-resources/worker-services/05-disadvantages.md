# Disadvantages

- **Slower scaling:** Adding new container instances can take several seconds to a few minutes, which is slower than the nearly-instant scaling of Lambda functions.
- **Not fully serverless:** Cannot scale down to zero. You pay for at least one running instance (starting at ~$8/month), even if it's idle.