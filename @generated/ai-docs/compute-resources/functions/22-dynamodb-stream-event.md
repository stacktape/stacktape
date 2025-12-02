# DynamoDB stream event

Triggers the function in response to item-level changes in a [DynamoDB table](../../../database-resources/dynamo-db-tables.md).

```yaml
resources:
  myDynamoDbTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: id
          type: string
      # {start-highlight}
      streamType: NEW_AND_OLD_IMAGES
      # {stop-highlight}

  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      # {start-highlight}
      events:
        - type: dynamo-db-stream
          properties:
            streamArn: $ResourceParam('myDynamoDbTable', 'streamArn')
            # OPTIONAL
            batchSize: 200
      # {stop-highlight}
```