# How to use custom resources

In Stacktape, a custom resource consists of two parts:

1.  **Definition**: A special type of Lambda function that contains the custom logic for creating, updating, and deleting the resource.
2.  **Instance**: An instantiation of a custom resource definition.

The following example shows a custom resource that seeds a MongoDB cluster.

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
      connectTo:
        - myMongoCluster

  seedMongoCluster:
    type: custom-resource-instance
    properties:
      definitionName: mongoSeeder
      resourceProperties:
        mongoConnectionString: $Param('myMongoCluster', 'AtlasMongoCluster::SrvConnectionString')
```