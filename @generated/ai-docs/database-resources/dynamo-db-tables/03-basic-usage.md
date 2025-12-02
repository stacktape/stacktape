# Basic Usage

The following example defines a simple DynamoDB table.

```yaml
resources:
  myDynamoDbTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: id
          type: string

  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my/lambda.ts
      environment:
        - name: TABLE_NAME
          value: $ResourceParam('myDynamoDbTable', 'name')
      connectTo:
        - myDynamoTable
```

You can connect a Lambda function to the table to read and write data:

```typescript
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const dynamoDb = new DynamoDB({});

export default async (event, context) => {
  // Put item to the table
  await dynamoDb.putItem({
    Item: { id: { S: 'my_id_1' }, writeTimestamp: { S: new Date().toLocaleTimeString() } },
    TableName: process.env.TABLE_NAME
  });
  // Get item from the table
  const item = await dynamoDb.getItem({
    Key: { id: { S: 'my_id_1' } },
    TableName: process.env.TABLE_NAME
  });
};
```