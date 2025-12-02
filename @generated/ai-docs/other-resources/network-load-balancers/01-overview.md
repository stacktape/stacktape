# Overview

A Network Load Balancer (NLB) serves as a single point of contact for clients and distributes incoming traffic across multiple targets. It operates at the transport layer (layer 4) and is ideal for load balancing TCP traffic where extreme performance is required.

NLBs can be integrated with [multi-container workloads](../../compute-resources/multi-container-workloads/index.md), offload SSL/TLS termination, and be configured with custom domain names.

Under the hood, Stacktape uses [AWS Network Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html).