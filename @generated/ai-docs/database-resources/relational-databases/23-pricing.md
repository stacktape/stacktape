# Pricing

Pricing depends heavily on the engine you choose.

**RDS engines:**

- **Instances:** Prices vary by instance size and region. See the AWS pricing pages for [PostgreSQL](https://aws.amazon.com/rds/postgresql/pricing/), [MySQL](https://aws.amazon.com/rds/mysql/pricing/), [MariaDB](https://aws.amazon.com/rds/mariadb/pricing/), [Oracle](https://aws.amazon.com/rds/oracle/pricing/), and [SQL Server](https://aws.amazon.com/rds/sqlserver/pricing/).
- **Storage:** $0.115 - $0.238 per GB per month.
- **Backups:** Free for automated backups that don't exceed your total database storage. Additional backup storage is $0.095 per GB per month.

**Aurora engines:**

- **Instances:** Prices start at $0.073 per hour. See the [Aurora pricing page](https://aws.amazon.com/rds/aurora/pricing/) for details.
- **Storage:** $0.10 - $0.19 per GB per month.
- **I/O Rate:** $0.20 - $0.28 per million read/write operations.
- **Backups:** Free for automated backups that don't exceed your total database storage. Additional backup storage is $0.021 - $0.037 per GB per month.

**Aurora Serverless:**

- **ACUs (Aurora Capacity Units):** Each ACU costs $0.06 - $0.10 per hour.
- **Storage, I/O, and Backups:** Same as the standard Aurora engine.

**Data transfer charges** (all engines):

- **Inbound:** Free.
- **Outbound (same AZ):** Free.
- **Outbound (different AZ):** $0.01 per GB.
- **Outbound (internet):** First 1GB is free, then $0.09 - $0.15 per GB.

**Free Tier** (first 12 months):

- 750 hours of `db.t2.micro` usage per month.
- 20GB of SSD storage.
- 20GB of backup storage.