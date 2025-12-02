# Disadvantages

- **Latency:** While latency is low, it's generally higher than with block storage (EBS) due to the distributed nature of EFS.
- **Cost:** Can be more expensive than object storage (S3) or block storage (EBS) for certain workloads.
- **Not optimal for lowest-latency needs:** For applications that require the absolute lowest latency for a single instance, EBS might be a better choice.