# When to use DynamoDB

### Advantages

*   **Performance at scale:** DynamoDB provides consistent, single-digit millisecond response times at any scale. You can build applications with virtually unlimited throughput and storage.
*   **Auto-scalable:** DynamoDB supports auto-scaling of both read/write capacity and storage, so you don't have to worry about capacity planning.
*   **Fine-grained access control:** You can manage access to your DynamoDB tables using _IAM_ roles and policies.
*   **Connection-less:** Your application connects to DynamoDB via an API, so you don't have to manage a connection pool.
*   **Pay-per-request pricing:** DynamoDB has a "pay-as-you-go" pricing model. If there's no load on your database, it's essentially free.

### Disadvantages

*   **Unfamiliar data modeling:** If you're used to relational databases, DynamoDB's _NoSQL_ data modeling can take some getting used to.
*   **Proprietary:** DynamoDB is a proprietary AWS database, which can lead to vendor lock-in.
*   **Not as feature-rich as other databases:** DynamoDB is more of a data store than a fully-featured database like Postgres or MongoDB. For a detailed comparison, refer to this [MongoDB vs. DynamoDB article](https://www.mongodb.com/compare/mongodb-dynamodb) (which is arguably biased).