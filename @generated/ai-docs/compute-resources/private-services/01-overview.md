# Overview

A private service is a continuously running container that is only accessible from within your stack. It's ideal for backend services, private APIs, or any application that shouldn't be exposed to the public internet.

Key features include:

- **Automatic scaling:** Scales based on CPU or memory usage to handle fluctuating loads.
- **Zero-downtime deployments:** New versions are deployed without interrupting the service.
- **Flexible container images:** Supports various methods for providing a container image, including auto-packaging for popular languages.
- **Fully managed:** No need to manage servers, operating systems, or virtual machines.
- **Seamless connectivity:** Easily connects to other resources within your stack.