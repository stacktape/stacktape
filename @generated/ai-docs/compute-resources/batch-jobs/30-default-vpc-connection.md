# Default VPC connection

Certain resources, like [Relational Databases](../../../database-resources/relational-databases.md), must be placed within a _VPC_. If your stack contains such resources, Stacktape automatically creates a default _VPC_ and connects them to it.

Batch jobs are connected to this _VPC_ by default, allowing them to communicate with other VPC-enabled resources without extra configuration. To learn more, see our guide on [_VPCs_](../../../user-guides/vpcs.md).