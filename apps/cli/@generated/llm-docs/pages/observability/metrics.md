# Metrics

AWS records metrics for your resources in CloudWatch without any setup: requests, errors and latency of APIs and load
balancers, invocations and duration of functions, CPU and memory of containers and databases. The Stacktape Console
shows them across your stacks and per resource, and [`stacktape metrics`](/cli/metrics) queries one metric from the
terminal.

## See metrics in the Console

Open **Observability → Metrics**. The page lists the resources of your deployed stacks that have metrics: services,
functions, APIs, load balancers, CDNs and databases.

1. Narrow it down with the filters at the top: **Search resources**, project, stage and **Resource type**.
2. Pick the time range on the right.
3. Read the four tiles, which sum up the resources you filtered:
   - **Requests**: every gateway, load balancer and CDN counts its own requests, so a request through a CDN to an API
     is counted twice.
   - **Errors**: 5xx responses plus failed function runs. A failed function behind an API can count in both.
   - **API latency**: the average of each API's average latency, not weighted by traffic.
   - **Database CPU**: the busiest database at its busiest moment.
4. Click a tile to list the resources behind its number, for example the resources with the most errors.
5. Click a resource to open its **Metrics** tab, with its charts over the same time range.

The Console reads metrics from CloudWatch in your AWS account in your browser. Numbers appear a few minutes after a
resource first receives traffic.

## Query a metric with the CLI

```bash
stacktape metrics api Errors --stage production --region eu-west-1 --stat Sum --since 24h
```

This prints a chart of one metric of one resource in the terminal. The defaults are the last hour, 5-minute periods
(`--period 300`) and the `Average` statistic. Use `Sum` for counts such as `Errors` or `Throttles`, and `Maximum` or
`p99` for latency. With `--agent`, the command prints the datapoints as JSON.

The command supports these resource types:

| Resource | `--metric` values |
|---|---|
| [Lambda function](/resources/compute/lambda-function) | `Invocations`, `Errors`, `Duration`, `Throttles`, `ConcurrentExecutions` |
| [Relational database](/resources/databases/relational-database) | `CPUUtilization`, `DatabaseConnections`, `FreeStorageSpace`, `ReadLatency`, `WriteLatency` |
| [HTTP API Gateway](/resources/networking/http-api-gateway) | `Count`, `Latency`, `IntegrationLatency` |

For web services, worker services and other containers, and for an HTTP API's error counts, use the Console. The
CLI's queries for those currently return no data or are refused; see [`stacktape metrics`](/cli/metrics).

## Read the common metrics

- **Function `Errors` and `Throttles`.** Errors are failed runs. Throttles are runs AWS refused because the function
  hit its concurrency limit; they need reserved concurrency or a shorter duration.
- **Function `Duration`.** Rising duration usually means a slower dependency or a code regression.
- **Container CPU and memory.** Both are percentages of what the container has. Sustained CPU above 80% means it needs
  more CPU or more containers. Memory at 100% gets the container killed and restarted; its [logs](/observability/logs)
  show the restart.
- **Database `DatabaseConnections`.** A sudden climb often means a connection leak in the application.
- **Database `FreeStorageSpace`.** Writes stop when it reaches zero.
- **API `Latency` and `IntegrationLatency`.** `Latency` is the whole request; `IntegrationLatency` is the time spent
  in your function or container. A large gap points at the gateway (authorization, routing), not your code.

CloudWatch keeps 1-minute datapoints for 15 days, 5-minute datapoints for 63 days and 1-hour datapoints for 15 months.

## Get alerted

A metric that crosses a threshold can fire an [alarm](/observability/alarms), defined on the resource in your config,
for example when a function's errors exceed 10 in 5 minutes. To track something AWS doesn't measure, publish a custom
metric from your code with CloudWatch's `PutMetricData` and alarm on it in AWS.
