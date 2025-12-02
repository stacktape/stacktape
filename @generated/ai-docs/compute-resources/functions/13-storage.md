# Storage

Each function has access to 512MB of temporary, _ephemeral storage_ at `/tmp`. This storage is not shared between concurrent executions but can be used for caching data within a single execution environment. For persistent storage, use [Buckets](../../../other-resources/buckets.md).