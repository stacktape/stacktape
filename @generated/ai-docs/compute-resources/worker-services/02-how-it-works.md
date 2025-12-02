# How it works

Stacktape uses AWS Elastic Container Service (ECS) to run your containers on either _Fargate_ or _EC2 instances_.

- **_Fargate_** is a _serverless_ compute engine that runs containers without requiring you to manage the underlying servers.
- **_EC2 instances_** are virtual servers that give you more control over the computing environment.

ECS services are self-healing, automatically replacing any container that fails. They also scale automatically based on the rules you define.