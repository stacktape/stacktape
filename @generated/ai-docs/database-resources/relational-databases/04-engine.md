# Engine

The database engine determines the database type, performance, availability, and pricing.

Depending on the properties they provide, we group engine types into following groups:

- [RDS Engine](./06-rds-engine.md) group - single node fully managed databases.
  - Supported engines:
    - **postgres**
    - **mysql**
    - **mariadb**
    - **oracle-ee**
    - **oracle-se2**
    - **sqlserver-ee**
    - **sqlserver-ex**
    - **sqlserver-se**
    - **sqlserver-web**
- [Aurora Engine](./07-aurora-engine.md) group - multi node highly available cluster with replicated storage.
  - Supported engines:
    - **aurora-postgresql**
    - **aurora-mysql**
- [Aurora Serverless V2 Engine](./08-aurora-serverless-v2-engine.md) - serverless engine with replicated storage. Compute
  resources scale based on actual demand.
  - Supported engines:
    - **aurora-postgresql-serverless-v2**
    - **aurora-mysql-serverless-v2**
- [Aurora Serverless V1 Engine](#aurora-serverless-engine) - old generation serverless engine. We recommend using V2
  instead.
  - Supported engines:
    - **aurora-postgresql-serverless**
    - **aurora-mysql-serverless**