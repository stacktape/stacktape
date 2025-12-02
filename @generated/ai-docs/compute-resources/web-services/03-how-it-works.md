# How it works

Stacktape uses AWS Elastic Container Service (ECS) to run your containers on either _Fargate_ or _EC2 instances_.

- **_Fargate_** is a _serverless_ compute engine that runs containers without requiring you to manage the underlying servers.
- **_EC2 instances_** are virtual servers that give you more control over the computing environment.

ECS services are self-healing, automatically replacing any container that fails. They also scale automatically based on the rules you define.

Traffic is routed to your containers using one of the following, depending on your configuration:

- **HTTP API Gateway (default):** A lightweight, cost-effective solution for HTTP APIs.
- **Application Load Balancer (ALB):** A more powerful load balancer that supports features like WebSockets and sticky sessions.
- **Network Load Balancer (NLB):** A high-performance load balancer that can handle millions of requests per second and supports protocols other than HTTP/S.

Stacktape automatically provisions and configures the chosen entry point for you.