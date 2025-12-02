# Overview

Stacktape allows you to deploy a fully managed relational (SQL) database, with support for **PostgreSQL**, **MySQL**, **MariaDB**, **Oracle**, and **SQL Server**. The service handles capacity scaling, hardware provisioning, database setup, patching, logging, and backups, so you can focus on your application.

Under the hood, Stacktape uses [Amazon RDS](https://aws.amazon.com/rds/). It supports three engine categories with different topologies and scaling behaviors:

- **Basic RDS engines:** A single-node database that is the most cost-effective option. It supports optional read replicas for higher performance and a Multi-AZ standby instance for resilience.
- **Aurora engine:** A multi-node, highly available cluster with increased durability and fault tolerance. It automatically balances read requests across nodes for better performance.
- **Aurora Serverless engine:** Similar to the Aurora engine, but with automatic, usage-based scaling. It can scale down to zero when inactive, saving costs.

Databases are always deployed in a private network within your stack's _VPC_. You can configure [accessibility](./17-accessibility.md) to control whether the database is accessible from the internet or only from other resources in the _VPC_.