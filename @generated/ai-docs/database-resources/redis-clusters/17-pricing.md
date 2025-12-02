# Pricing

You are charged for:

- **Nodes:** The price depends on the instance size, number of shards, and number of replica nodes.
  - **Formula:** `num_shards * (num_replica_nodes + 1) * price_per_node`
  - **Example 1 (cheapest):** A single-node `cache.t3.micro` cluster costs **$0.017/hour** (~$12.50/month).
  - **Example 2 (sharded):** A two-shard `cache.t3.micro` cluster with one replica per shard costs **$0.068/hour** (~$49/month).
- **Data transfer:** Usually no additional cost.
- **Backups:** Free for the first day of retention, then $0.085/GB per month.

**Free Tier** (first 12 months)

- 750 hours of `t2.micro` or `t3.micro` instances per month.

To learn more, see the [AWS pricing page](https://aws.amazon.com/elasticache/pricing/?nc=sn&loc=5).