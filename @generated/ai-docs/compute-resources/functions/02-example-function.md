# Example function

```yaml
resources:
  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
```

> Stacktape configuration for a basic Lambda function.

```typescript
// Stacktape will automatically package any library for you
import anyLibrary from 'any-library';
import { initializeDatabaseConnection } from './database';

// Everything outside of the handler function will be executed only once (on every cold-start).
// You can execute any code that should be "cached" here (such as initializing a database connection)
const myDatabaseConnection = initializeDatabaseConnection();

// handler will be executed on every function invocation
const handler = async (event, context) => {
  // This log will be published to a CloudWatch log group
  console.log(event, context);

  const posts = myDatabaseConnection.query('SELECT * FROM posts');

  return { result: posts };
};

export default handler;
```

> Example function code written in TypeScript.