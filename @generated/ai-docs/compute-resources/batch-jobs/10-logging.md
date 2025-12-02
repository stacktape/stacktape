# Logging

Any output from your code to `stdout` or `stderr` is captured and stored in an AWS CloudWatch log group.

You can view logs in two ways:
- **AWS CloudWatch Console**: Get a direct link from the [Stacktape Console](https://console.stacktape.com/) or by using the `stacktape stack-info` command.
- **Stacktape CLI**: Use the [`stacktape logs` command](../../../cli/commands/logs.md) to stream logs directly in your terminal.

Log storage can incur costs, so you can configure `retentionDays` to automatically delete old logs.