- Uptime monitoring service with [scheduled](https://docs.stacktape.com/compute-resources/lambda-functions/#schedule)
  health checks.
- A Lambda runs every 5 minutes to check all monitored URLs, recording status, latency, and response codes in
  [DynamoDB](https://docs.stacktape.com/resources/dynamo-db-tables/).
- Manage monitors and view check history via the REST API.
