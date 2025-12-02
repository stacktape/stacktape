# Overview

A multi-container workload is a compute resource that runs one or more containers continuously. Unlike functions and batch jobs, which are event-driven, container workloads are designed for long-running applications and scale based on CPU and memory usage.

Like other Stacktape compute resources, container workloads are _serverless_, meaning you don't need to manage the underlying infrastructure. You can provide your container image by building it from source code, using a Dockerfile, or pulling a pre-built image.

Workloads run securely within a _VPC_, and you can expose container ports to the internet using integrations with HTTP API Gateways and Load Balancers.