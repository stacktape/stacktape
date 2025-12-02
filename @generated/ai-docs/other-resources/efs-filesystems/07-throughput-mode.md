# Throughput mode

You can set a throughput mode for your filesystem. While there are various options, the `elastic` mode (the default) is recommended for most use cases.

```yaml
resources:
  myFileSystem:
    type: efs-filesystem
    properties:
      # {start-highlight}
      throughputMode: provisioned
      provisionedThroughputInMibps: 1000 # when setting throughput mode to 'provisioned', you must also set a throughput value
      # {stop-highlight}
```