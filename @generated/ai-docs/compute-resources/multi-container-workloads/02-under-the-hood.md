# Under the hood

Stacktape uses AWS Elastic Container Service (ECS) to orchestrate containers. You can run your containers using two launch types:

-   **_Fargate_**: A _serverless_ compute engine that runs containers without requiring you to manage servers.
-   **_EC2 instances_**: Virtual machines that give you more control over the operating environment.

ECS services are self-healing, automatically replacing any unhealthy container instances. They also provide auto-scaling out of the box.