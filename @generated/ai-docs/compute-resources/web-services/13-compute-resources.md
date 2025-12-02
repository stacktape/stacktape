# Compute resources

In the `resources` section, you configure the CPU, memory, and instance types for your service. You can run your containers using either _Fargate_ or _EC2 instances_.

- **_Fargate_** is a _serverless_ option that lets you run containers without managing servers. You only need to specify the `cpu` and `memory` your service requires. It's a good choice for applications that need to meet high security standards like PCI DSS Level 1 and SOC 2.
- **_EC2 instances_** are virtual servers that give you more control. You choose the instance types that best fit your needs, and ECS places your containers on them.