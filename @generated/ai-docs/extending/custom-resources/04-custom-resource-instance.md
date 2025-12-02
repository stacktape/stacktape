# Custom resource instance

A custom resource instance creates an instance of a specified custom resource definition. Depending on the action being performed on the stack (create, update, or delete), the instance receives an event and executes the corresponding logic in the custom resource definition.

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

  # {start-highlight}
  seedMongoCluster:
    type: custom-resource-instance
    properties:
      definitionName: mongoSeeder
      resourceProperties:
        mongoConnectionString: $Param('myMongoCluster', 'AtlasMongoCluster::SrvConnectionString')
  # {stop-highlight}
```