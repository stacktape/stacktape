# Basic usage

To connect to a relational database, you typically use a connection string. Stacktape can automatically inject the necessary credentials and connection details into your application's environment when you use the `connectTo` property.

```yaml
resources:
  myDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('database.password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t3.micro

  apiServer:
    type: multi-container-workload
    properties:
      resources:
        cpu: 1
        memory: 1024
      containers:
        - name: api-container
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/main.ts
      # {start-highlight}
      connectTo:
        - myDatabase
      # {stop-highlight}
```

> A single-node PostgreSQL database.

```typescript
import express from 'express';
import { Pool } from 'pg';

const pgPool = new Pool({
  connectionString: process.env.STP_MY_DATABASE_CONNECTION_STRING // env variable was automatically injected by Stacktape
});

const app = express();

app.get('/time', async (req, res) => {
  const result = await pgPool.query('SELECT NOW()');
  const time = result.rows[0];

  res.send(time);
});

app.listen(3000, () => {
  console.info('Server running on port 3000');
});
```

> A container workload connecting to the database.