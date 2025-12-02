# Default VPC connection

Some AWS services, like relational databases, must be deployed within a _VPC_. If your stack includes such resources, Stacktape automatically creates a default _VPC_ and connects them to it.

Web services are connected to this default _VPC_ by default, allowing them to communicate with other VPC-based resources without extra configuration.

To learn more, see the documentation on [_VPCs_](../../user-guides/vpcs.md) and resource accessibility.