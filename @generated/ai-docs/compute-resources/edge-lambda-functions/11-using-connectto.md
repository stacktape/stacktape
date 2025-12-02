# Using connectTo

The `connectTo` property simplifies granting access to other Stacktape-managed resources. It automatically configures the necessary _IAM_ permissions and injects environment variables with connection details.

```yaml
resources:
  authFunction:
    type: edge-lambda-function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: auth-function.ts
      # {start-highlight}
      connectTo:
        # access to the dynamo table
        - myDynamoTable
        # access to AWS SES
        - aws:ses
      # {stop-highlight}

  myDynamoTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: id
          type: string
```