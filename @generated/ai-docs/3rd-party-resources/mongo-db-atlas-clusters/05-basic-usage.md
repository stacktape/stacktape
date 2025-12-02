# Basic usage

```yaml
# {start-ignore}
providerConfig:
  mongoDbAtlas:
    privateKey: 'xxxxfa523543fxxxx42543xx'
    publicKey: 'xxxxxxx'
    organizationId: 'xxxxxxxxxxx07a593cbe63dd'
# {stop-ignore}
resources:
  # {start-highlight}
  myMongoDbCluster:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M2
  # {stop-highlight}
  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my/lambda.ts
      environment:
        - name: MONGODB_CONNECTION_STRING
          value: $ResourceParam('myMongoDbCluster', 'connectionString')
      connectTo:
        - myMongoDbCluster
```

```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING);

const handler = async (event, context) => {
  await client.connect();

  const db = client.db('mydb');

  await db.collection('posts').insertOne({
    title: 'My first post',
    content: 'Hello!'
  });

  const post = await db.collection('posts').findOne({ title: 'My first post' });

  await client.close();
};
```