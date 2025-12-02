# Pricing

You are charged for:

*   **Read and Write operations**:
    *   **PROVISIONED** mode:
        *   You configure how much read/write capacity table has at any moment:
        *   WCU (write capacity unit) - $0.00065 - $0.000975 per WCU per hour
        *   RCU (read capacity units - $0.00013 - $0.000195 per RCU per hour
        *   To learn more, refer to [AWS pricing page](https://aws.amazon.com/dynamodb/pricing/provisioned/)
    *   **ON DEMAND** mode
        *   Pay as you go
        *   $1.25 - $1.875 per million write request units
        *   $0.25- $0.375 per million read request units
        *   To learn more, refer to [AWS pricing page](https://aws.amazon.com/dynamodb/pricing/on-demand/)
*   **Storage**:
    *   First 25 GB stored per month is free
    *   $0.25 - $0.375 per GB-month thereafter
*   **Continuous backup**:
    *   Applies when point-in-time-recovery is enabled
    *   $0.20 -$0.30 per GB-month
*   **Data transfer**:
    *   IN transfer: free
    *   OUT to AWS services in the same region: free
    *   OUT to internet: first 1 GB free, then $0.09 -$0.15 per GB

**FREE TIER** (eligible for first 12 months):

*   25 GB of Storage
*   25 provisioned Write Capacity Units (WCU)
*   25 provisioned Read Capacity Units (RCU)
*   Enough to handle up to ~200M requests per month.