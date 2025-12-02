# Overview

A worker service is a continuously running container that is not directly accessible from outside your stack. It's ideal for background jobs, such as processing items from a message queue or handling other asynchronous tasks.

Key features include:

- **Automatic scaling:** Scales based on CPU or memory usage.
- **Zero-downtime deployments:** New versions are deployed without interrupting the service.
- **Flexible container images:** Supports various methods for providing a container image, including auto-packaging for popular languages.
- **Fully managed:** No need to manage servers, operating systems, or virtual machines.
- **Seamless connectivity:** Easily connects to other resources within your stack.