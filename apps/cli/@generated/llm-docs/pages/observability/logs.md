# Logs

Everything your functions, containers and batch jobs write to stdout and stderr goes to CloudWatch Logs in your AWS
account. Each resource has its own log group, kept for 90 days unless you set `logging.retentionDays`. You read the
logs in the Stacktape Console or with [`stacktape logs`](/cli/logs).

## Read logs in the Console

1. Open **Observability → Logs**.
2. In **Resource**, pick the function or container. The list shows each resource with its project and stage; type to
   search.
3. Choose **History** to read a time range, or **Live tail** to watch new lines arrive.

In **History**, pick the time range and type in the search box to keep only matching lines. The search takes a
[CloudWatch filter pattern](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html):
a word (`timeout`), an `"exact phrase"` or a JSON field (`{ $.level = "error" }`). If the range has no lines, the
viewer says when the resource last wrote one and offers **Show the latest lines**. Links above the viewer open the
resource's traces and metrics for the same time range, the stage's errors, and an open incident if there is one.

The Console reads the logs straight from your AWS account in your browser, with short-lived credentials limited to
that log group. Stacktape's servers don't store them.

## Read logs with the CLI

```bash
stacktape logs api --stage production --region eu-west-1
```

In a terminal, this prints the last 100 lines of the past hour and keeps printing new ones until you press Ctrl+C. In
CI, piped into another command, or with `--raw`, it prints once and exits.

To read a past window, such as the minutes around an incident, give both ends and turn following off:

```bash
stacktape logs api --stage production --region eu-west-1 \
  --since 2026-11-20T14:00:00Z --until 2026-11-20T14:30:00Z --follow=false --limit 1000
```

This returns the newest 1,000 lines of that window. `--since` also takes a duration counted back from `--until`, such
as `30m`, `6h` or `2d`.

Keep only matching lines with a CloudWatch filter pattern:

```bash
stacktape logs api --stage production --region eu-west-1 --filter '{ $.statusCode >= 500 }'
```

For counts, averages and grouping, run a
[Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html) query:

```bash
stacktape logs api --stage production --region eu-west-1 --since 24h \
  --query "filter @message like /ERROR/ | stats count(*) as errors by bin(1h)"
```

For a [multi-container workload](/resources/compute/multi-container-workload), add `--container <name>`. `--raw`
prints the events as one JSON object for `jq` or a script. The [CLI reference](/cli/logs) lists every option.

## Write structured logs

Logs written as one JSON object per line can be filtered by field, in both the Console and the CLI:

```json
{ "level": "error", "message": "Payment failed", "userId": "u-123", "statusCode": 502 }
```

`{ $.userId = "u-123" && $.level = "error" }` then finds that user's errors, and a Logs Insights query can count errors
by `statusCode`. Pino, Winston, Python's `structlog` and Go's `slog` write JSON with little setup.

## Lower the ingestion cost

Logs you rarely read can use the CloudWatch Infrequent Access class, which costs less to ingest. Set it on the
resource's `logging`:

```yaml
resources:
  archiveWorker:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/archive.ts
      logging:
        logClass: infrequent-access
```

The trade-offs: no live tail, no filter patterns, no [error tracking](/observability/error-tracking) and no
[log forwarding](/observability/log-forwarding) for that log group. Storage and query prices stay the same. The Console
and `stacktape logs` still read it, through a Logs Insights snapshot; filter it with **Message contains** in the
Console or `--query` in the CLI. AWS fixes the class when the log group is created, so set it on a new resource or
stage.

CloudWatch Logs charges for ingestion, storage and queries in your AWS account. See
[CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/).

## Get alerted on a log pattern

Stacktape [alarms](/observability/alarms) watch metrics, not log lines. For runtime errors, [error
tracking](/observability/error-tracking) groups exceptions from your logs and opens an incident for new ones. For any
other pattern, create a CloudWatch metric filter on the log group and an alarm on its metric.

To send logs to Datadog, Highlight.io or your own HTTPS endpoint, use [log forwarding](/observability/log-forwarding).
