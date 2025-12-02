# Logging

Anything your application writes to `stdout` or `stderr` is captured and stored in AWS CloudWatch.

You can view logs in a few ways:

- **Stacktape Console:** Find a direct link to the logs in the [Stacktape Console](https://console.stacktape.com/).
- **Stacktape CLI:** Use the [`stacktape logs`](../../cli/commands/logs.md) command to stream logs to your terminal.
- **AWS Console:** Browse logs directly in the AWS CloudWatch console. The `stacktape stack-info` command can provide a link.

Log storage can be expensive. To manage costs, you can configure `retentionDays` to automatically delete logs after a certain period.