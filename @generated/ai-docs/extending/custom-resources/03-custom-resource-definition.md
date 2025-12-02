# Custom resource definition

A custom resource definition is similar to a [function](../../compute-resources/functions/index.md) definition, as it uses a Lambda function to execute the custom logic.

```yaml
resources:
  myMongoCluster:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10

  # {start-highlight}
  mongoSeeder:
    type: custom-resource-definition
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: seed-the-mongo-cluster.ts
      connectTo:
        - myMongoCluster
  # {stop-highlight}

  seedMongoCluster:
    type: custom-resource-instance
    properties:
      definitionName: mongoSeeder
      resourceProperties:
        mongoConnectionString: $Param('myMongoCluster', 'AtlasMongoCluster::SrvConnectionString')
```

### Code of custom resource

The `packaging` property allows you to specify the path to your code and other packaging-related properties. The code is packaged and executed as a Lambda function. For more information, see the [packaging documentation](../../configuration/packaging.md).

```yaml
resources:
  myMongoCluster:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10

  mongoSeeder:
    type: custom-resource-definition
    properties:
      # {start-highlight}
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: seed-the-mongo-cluster.ts
      # {stop-highlight}
      connectTo:
        - myMongoCluster

  seedMongoCluster:
    type: custom-resource-instance
    properties:
      definitionName: mongoSeeder
      resourceProperties:
        mongoConnectionString: $Param('myMongoCluster', 'AtlasMongoCluster::SrvConnectionString')
```

#### Code example

The following example shows the code for the MongoDB seeding custom resource. For more information on the types of requests (events) a custom resource receives and the response objects you should return, see the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref.html).

```typescript
import mongoose from 'mongoose';
import { SUCCESS, FAILED, send } from 'cfn-response-promise';

// {start-highlight}
// incoming event is in following form
// {stop-highlight}
// {
//   "RequestType" : "Create" || "Update" || "Delete",
//   "RequestId" : "9db53695-b0a0-47d6-908a-ea2d8a3ab5d7",
//   "ResponseURL" : "https://...",
//   "ResourceType" : "AWS::Cloudformation::CustomResource",
//   "LogicalResourceId" : "...",
//   "StackId" : "arn:aws:cloudformation:...",
//   "ResourceProperties" : {
//      ... properties of custom-resource-instance
//   }
// }

export default async (event, context) => {
  // custom resource definition code
  let success = true;
  let dataToReturn = {};

  try {
    // we are only seeding database if the operation is Create
    if (event.RequestType === 'Create') {
      // {start-highlight}
      // we are using the "mongoConnectionString" property passed by custom-resource-instance to create connection
      const connection = await mongoose.connect(event.ResourceProperties.mongoConnectionString, {
        // {stop-highlight}
        authMechanism: 'MONGODB-AWS',
        authSource: '$external',
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: 'my-test-database'
      });
      // code with seeding the database ...
      // ...
    }
  } catch (err) {
    success = false;
  }
  await send(event, context, success ? SUCCESS : FAILED, dataToReturn, 'customresourceid');
};

// {start-highlight}
// function must respond to "ResponseURL" with response in following form
// we are using "cfn-response-promise" library which formats response for us
// {stop-highlight}
// {
//   "Status" : "SUCCESS" || "FAILED",
//   "RequestId" : "9db53695-b0a0-47d6-908a-ea2d8a3ab5d7",
//   "LogicalResourceId" : "...",
//   "StackId" : "arn:aws:cloudformation:...",
//   "PhysicalResourceId" : "...",
//   "Data" : {
//     ... attributes which can be queried in template using $Param
//   }
// }
```

### Accessing other resources

By default, resource-to-resource communication is not allowed in AWS. Access must be explicitly granted using _IAM_ permissions. Stacktape automatically handles IAM permissions for the underlying AWS services it creates.

If your custom resource needs to communicate with other infrastructure components, you must grant the necessary permissions manually. You can do this in two ways:

#### connectTo

The `connectTo` property is a list of resource names or AWS services that the custom resource will be able to access. Stacktape will automatically grant the basic IAM permissions required for communication. This is useful if you do not want to manage IAM permissions yourself.

When you use the `connectTo` property, Stacktape also automatically injects information about the connected resource as environment variables into your custom resource's runtime.

In this example, we grant access to a MongoDB cluster. This will [inject the necessary credentials](../../3rd-party-resources/mongo-db-atlas-clusters/12-accessing-clusters-from-workloads.md) into the custom resource's runtime, which are then used in the [code example](#code-example).

```yaml
resources:
  myMongoCluster:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10

  mongoSeeder:
    type: custom-resource-definition
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: seed-the-mongo-cluster.ts
      # {start-highlight}
      connectTo:
        - myMongoCluster
      # {stop-highlight}

  seedMongoCluster:
    type: custom-resource-instance
    properties:
      definitionName: mongoSeeder
      resourceProperties:
        mongoConnectionString: $Param('myMongoCluster', 'AtlasMongoCluster::SrvConnectionString')
```

#### Environment variables

You can use environment variables to inject information that the resource needs during execution.