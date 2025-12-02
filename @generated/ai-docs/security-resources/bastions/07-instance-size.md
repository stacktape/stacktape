# Instance size

By default, bastion servers use a `t3.micro` instance, which is eligible for the AWS Free Tier. You can specify a different instance size using the `instanceSize` property. For a full list of available instance types, see the [AWS documentation](https://aws.amazon.com/ec2/instance-types/).

```yaml
resources:
  myBastion:
    type: bastion
    properties:
      # {start-highlight}
      instanceSize: c5.large
      # {stop-highlight}
```