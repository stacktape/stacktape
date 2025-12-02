# Virtual Private Cloud (VPC)

A _VPC_ (Virtual Private Cloud) is a logically isolated virtual network that resembles a traditional network in an on-premise data center. It allows you to control access to the resources connected to it by creating subnets, IP address ranges, route tables, and network gateways.

Configuring VPCs manually can be complicated, time-consuming, and error-prone. Stacktape handles VPC configuration and management for you, so in most cases, you do not need to worry about them while still maintaining a high level of security.

## Default VPC

Certain AWS resources must be connected to a VPC to work. For stacks that contain these resources, Stacktape automatically creates a default VPC and connects them to it.

## Communication with the internet

By default, resources inside a VPC cannot communicate with the internet (i.e., make outbound requests). Resources that need to communicate with the internet can do so in two ways:

### Being connected to a public subnet

Container workloads and batch jobs are connected to a public subnet by default, so they can communicate with the internet without any extra configuration. However, [_Lambda functions_](../../compute-resources/functions/index.md) cannot be connected to a public subnet.

### Using a NAT Gateway

A NAT Gateway is a Network Address Translation (NAT) service that allows instances in a private subnet to connect to services outside your VPC, but prevents external services from initiating a connection with those instances.

NAT Gateways are costly, with hourly charges (minimum $33/month) and data-processing and data-transfer charges. Stacktape currently does not use NAT Gateways for any of its resources.

To learn more about NAT Gateways, see the [AWS documentation](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html).