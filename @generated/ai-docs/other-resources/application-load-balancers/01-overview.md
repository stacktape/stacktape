# Overview

An Application Load Balancer (ALB) serves as a single point of contact for clients and distributes incoming application traffic across multiple targets, such as containers and Lambda functions. It operates at the application layer (layer 7) and is ideal for load balancing HTTP and HTTPS traffic.

ALBs can be integrated with various compute resources, offload SSL/TLS termination, and be configured with custom domain names or fronted by a _CDN_.

Under the hood, Stacktape uses [AWS Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html).