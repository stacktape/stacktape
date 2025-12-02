# Overview

Redis is a fast, in-memory, _NoSQL_ data store that provides sub-millisecond latency. It's often used as a cache to offload primary database systems, but it's also suitable for chat applications, message queues, and real-time analytics.

With Stacktape, you can deploy a fully managed Redis cluster without worrying about capacity scaling, hardware provisioning, cluster setup, patching, or backups. The service is compatible with open-source Redis, so you can use your existing Redis clients.

Under the hood, Stacktape uses [Amazon ElastiCache for Redis](https://aws.amazon.com/elasticache/redis/).