# How it works

Stacktape uses AWS Elastic Container Service (ECS) to run your containers on either _Fargate_ or _EC2 instances_.

- **_Fargate_** is a serverless compute engine that runs containers without requiring you to manage the underlying servers.
- **_EC2 instances_** are virtual servers in the AWS cloud that give you more control over the computing environment.

ECS services are self-healing, automatically replacing any container that fails. They also scale automatically based on the rules you define.

Private services have two modes for handling internal traffic:

- **`service-connect` (default):** Uses ECS Service Connect. The service is only accessible to other ECS-based resources like [web services](../../compute-resources/web-services/index.md), [worker services](../../compute-resources/worker-services/index.md), and [multi-container workloads](../../compute-resources/multi-container-workloads/index.md).
- **`application-load-balancer`:** Uses an internal Application Load Balancer. The service is accessible to all resources within the same _VPC_.

For more details, see the sections on [Load Balancing](./23-load-balancing.md) and [Connecting to a Private Service](./07-connecting-to-a-private-service.md).