- Change data capture with [DynamoDB Streams](https://docs.stacktape.com/compute-resources/lambda-functions/#dynamo-db-stream) for automatic audit logging.
- Every INSERT, MODIFY, and REMOVE on the products table is captured and written to an audit table with before/after
  images.
- Includes a REST API for product CRUD and querying the audit trail.
