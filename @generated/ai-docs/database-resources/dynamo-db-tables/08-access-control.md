# Access Control

DynamoDB uses _IAM_ to control who can access the table. To interact with a DynamoDB table, your compute resources must have sufficient permissions. You can grant these permissions in two ways:

1.  List the table in the `connectTo` array of your compute resource. Stacktape will automatically grant the necessary permissions.
2.  Configure `iamRoleStatements` on your compute resource to define a custom policy.

Using `connectTo` is the recommended approach. Here's an example:

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
      # {start-highlight}
      connectTo:
        - myDynamoDbTable
      # {stop-highlight}
```

If you need more fine-grained control, you can use `iamRoleStatements`:

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
      # {start-highlight}
      iamRoleStatements:
        - Resource:
            - $ResourceParam('myDynamoDbTable', 'Arn')
          Effect: 'Allow'
          Action:
            - 'dynamodb:Get*'
            - 'dynamodb:Query'
            - 'dynamodb:Scan'
            - 'dynamodb:Delete*'
            - 'dynamodb:Update*'
            - 'dynamodb:PutItem'
      # {stop-highlight}
```