# Default VPC connection

Functions are not connected to a _VPC_ by default. If your function needs to access resources inside a _VPC_ (like a [Relational Database](../../../database-resources/relational-databases.md)), you must explicitly connect it.

Connecting a function to a _VPC_ will cut off its access to the public internet. Restoring internet access requires a [NAT Gateway](../../../user-guides/vpcs.md), which can be complex and costly.

```yaml
resources:
  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      # {start-highlight}
      joinDefaultVpc: true
      # {stop-highlight}
```

> Function connected to the default VPC.