# Referencing parameters

When building a cloud architecture with multiple resources, those resources often need to communicate with each other. To do so, they require identifiers such as a database endpoint, an API Gateway URL, or an _ARN_. These identifiers are assigned dynamically and cannot be known before the stack is deployed.

Stacktape allows you to dynamically reference these resources using the [`$ResourceParam()`](../../configuration/directives.md) and [`$CfResourceParam()`](../../configuration/directives.md) directives.

## Parameters of Stacktape resources

You can reference the most commonly needed parameters of Stacktape-managed resources, such as database endpoints, database connection strings, and URLs of API Gateways and Load Balancers.

These parameters can be referenced using the [`$ResourceParam()`](../../configuration/directives.md) directive, which takes two arguments:

*   **stacktape resource name**: The name of the Stacktape resource as defined in your `stacktape.yml` file.
*   **parameter name**: The parameter to reference. You can find a list of all referenceable parameters in the documentation for each resource:
    *   [relational-databases](../../database-resources/relational-databases/index.md)
    *   [dynamo-db-tables](../../database-resources/dynamo-db-tables/index.md)
    *   [mongo-db-atlas-clusters](../../3rd-party-resources/mongo-db-atlas-clusters/index.md)
    *   [redis-clusters](../../database-resources/redis-clusters/index.md)
    *   [http-api-gateways](../../other-resources/http-api-gateways/index.md)
    *   [buckets](../../other-resources/buckets/index.md)
    *   [application-load-balancers](../../other-resources/application-load-balancers/index.md)
    *   [event-buses](../../other-resources/event-buses/index.md)
    *   [functions](../../compute-resources/functions/index.md)
    *   [multi-container-workloads](../../compute-resources/multi-container-workloads/index.md)
    *   [batch-jobs](../../compute-resources/batch-jobs/index.md)

```yml
resources:
  myDatabase:
    type: relational-database
    properties: ...

  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my/lambda.ts
      environment:
        # {start-highlight}
        - name: DB_CONNECTION_STRING
          value: $ResourceParam('myDatabase', 'connectionString')
        # {stop-highlight}
```

## Parameters of Cloudformation resources

To reference parameters of native _Cloudformation_ resources or parameters that are not supported by the `$ResourceParam()` directive, you can use the [`$CfResourceParam()`](../../configuration/directives.md) directive. It takes two arguments:

*   **cloudformation logical name**: The logical name of the _Cloudformation_ resource. If you are referencing a resource defined in the `cloudformationResources` section, use its name. To reference a child resource of a Stacktape resource, you can get a list of child resources using the `stacktape stack-info` command.
*   **parameter name**: The parameter of the _Cloudformation_ resource to reference. To see a list of all referenceable _Cloudformation_ parameters for the resources in your stack, see [Listing child resources](#listing-child-resources).

### Listing child resources

Suppose you want to get a parameter of an `AWS::Lambda::Function` resource that is a child of the `myFunction` Stacktape resource.

```yaml
resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my/lambda.ts
```

You can use the `stacktape stack-info --detailed` command to get a detailed list of all resources and their children.

```bash
stacktape stack-info --detailed --stage my-stage --region eu-west-1
```

The (truncated) output will look like this, with the logical name of the `AWS::Lambda::Function` resource highlighted:

```yaml
resources:
  myFunction:
    resourceType: function
    cloudformationChildResources:
      # {start-highlight}
      MyFunctionFunction:
        # {stop-highlight}
        cloudformationResourceType: AWS::Lambda::Function
        status: DEPLOYED
        referenceableParams:
          - Name
          - Arn
      LogGroup:
        cloudformationResourceType: AWS::Logs::LogGroup
        status: DEPLOYED
        referenceableParams:
          - Name
          - Arn
        logicalName: DeletePostLambdaLogGroup
```

Now you can use the Lambda function's logical name to get its parameter.

```yml
cloudformationResources:
  MySnsTopic:
    type: AWS::SNS::Topic

resources:
  myBucket:
    type: bucket

  processData:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my/lambda.ts
      destinations:
        # {start-highlight}
        onFailure: $CfResourceParam('MySnsTopic', 'Arn')
        # {stop-highlight}
      environment:
        # {start-highlight}
        - name: BUCKET_NAME
          value: $CfResourceParam('MyBucketBucket', 'Name')
        # {stop-highlight}
```