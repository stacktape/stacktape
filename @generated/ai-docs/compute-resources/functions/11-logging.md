# Logging

Any output to `stdout` or `stderr` is captured and stored in an AWS CloudWatch log group. You can view logs through the [Stacktape Console](https://console.stacktape.com/), the `stacktape stack-info` command, or by streaming them with the `stacktape logs` command.

To manage costs, you can configure `retentionDays` to automatically delete old logs.