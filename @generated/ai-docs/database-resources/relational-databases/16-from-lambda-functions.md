# From Lambda functions

For Lambda functions, you have two options:

**1. Initialize and close the connection inside the handler.**

This prevents zombie connections but can be slow, as creating a new connection for each invocation can add significant latency.

```typescript
import { Client } from 'pg';

const handler = async (event, context) => {
  const pgClient = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
  });

  await pgClient.connect();

  const result = await pgClient.query('SELECT NOW()');
  const time = result.rows[0];

  await pgClient.end();

  return { result: time };
};

export default handler;
```

**2. Initialize the connection outside the handler.**

This reuses the connection across invocations, which is more performant. However, it can lead to zombie connections because you can't hook into the Lambda container's shutdown process. To mitigate this, you should:

- Lower your database's connection timeout settings.
- Add logic to your application to re-establish the connection if it's been closed by the database.

```typescript
import { Client } from 'pg';

const pgClient = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

(async () => {
  await pgClient.connect();
})();

const handler = async (event, context) => {
  const result = await pgClient.query('SELECT NOW()');
  const time = result.rows[0];

  return { result: time };
};

export default handler;
```