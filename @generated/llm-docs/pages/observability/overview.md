# Observability Overview

Stacktape surfaces logs, metrics, alarms, and issues through the CLI and Console — reading from the same AWS CloudWatch data your stack produces. Alert channels, notifications, and alert history organize delivery routing and alert records in the Stacktape Console. Console observability is available around deployed stages, while some features such as Issues require Console enablement and deployment-time wiring. Issue detection wiring requires Stacktape CLI 3.8.0 or newer.

## Observability surfaces

Stacktape provides multiple observability surfaces for supported workloads and AWS resources in your stack. Each surface is accessible from the CLI, the Console, or through your Stacktape configuration — depending on the feature.

| Surface | CLI | Console | Config |
|---------|-----|---------|--------|
| [Logs](/observability/logs) | [`stacktape logs`](/cli/logs) | See [Logs](/observability/logs) | — |
| [Metrics](/observability/metrics) | [`stacktape metrics`](/cli/metrics) | See [Metrics](/observability/metrics) | — |
| [Alarms](/observability/alarms) | [`stacktape alarms`](/cli/alarms) | Alarm state overview, alarm rules editor | See [Alarms](/observability/alarms) |
| [Issues](/observability/issues) | [`stacktape issues:list`](/cli/issues-list), [`issues:resolve`](/cli/issues-resolve), [`issues:ignore`](/cli/issues-ignore), [`issues:reopen`](/cli/issues-reopen) | Error inbox with grouping and occurrence counts | Enabled in Console for all projects, selected projects, or specific stage names |
| [Alert channels](/observability/alert-channels) | — | Create and manage channels | See [Alert channels](/observability/alert-channels) |
| [Notifications](/observability/notifications) | — | Notification rules for deployment events | — |
| [Alert history](/observability/alert-history) | — | Unified log of all delivered alerts | — |
| [Log forwarding](/observability/log-forwarding) | — | — | See [Log forwarding](/observability/log-forwarding) |

## Logs

Stacktape has a logs surface for inspecting CloudWatch Logs produced by your stack. Use [`stacktape logs`](/cli/logs) for ad-hoc log queries and live tailing from the terminal — filter by resource, time range, or keyword. The Console provides a persistent log viewer for browsing logs across resources and stages without leaving the browser. For full CLI options and details, see [Logs](/observability/logs).

## Metrics

Stacktape provides a metrics surface for viewing AWS CloudWatch metrics produced by your resources. Use [`stacktape metrics`](/cli/metrics) for quick terminal-based metric checks — useful during active debugging or in CI/CD scripts. The Console provides metric dashboards for ongoing monitoring across your stack. For full CLI options and details, see [Metrics](/observability/metrics).

## Alarms

Alarms monitor CloudWatch metrics and fire when a threshold is breached. You can define alarm rules per-resource in your Stacktape configuration or create alarm rules in the Stacktape Console that apply across projects and stages. For the authoritative list of resource types that support config-time alarms, trigger types, and evaluation windows, see [Alarms](/observability/alarms).

**Config-time definition** — use the `alarms` property on supported resources to define threshold-based alarms directly in your Stacktape configuration. These alarms are version-controlled and deploy with your stack. For the full property reference and supported trigger types, see [Alarms](/observability/alarms).

**Console-managed rules** — alarm rules created in the Console monitor AWS metrics for your resources, such as Lambda error rates, database CPU usage, or API latency. When a metric crosses the defined threshold, an alert is sent to the channel you specify. Creating or changing a rule saves it in the Console; Stacktape creates, updates, or removes the underlying CloudWatch Alarms and EventBridge notification routing the next time each matching project and stage is deployed.

**From the CLI**, use [`stacktape alarms`](/cli/alarms) to inspect alarm state in a stack.

## Issues

Issues is an error inbox for your deployed workloads. Instead of manually searching logs for exceptions, Stacktape detects common runtime error patterns, groups repeated occurrences into a single item, and surfaces them with the error message, stack trace, originating resource, project, stage, and occurrence count.

**How detection works** — on deployment, Stacktape adds CloudWatch Logs subscription filters to supported Stacktape-managed Lambda functions and buildpack containers. Matching log events are sent to the Stacktape service Lambda in your stack, parsed, fingerprinted, and reported to the Console. Issues are grouped by fingerprint, project, and stage.

Detection is log-pattern based. It looks for common runtime error markers: Lambda invoke errors, unhandled promise rejections, exceptions, tracebacks, panics, fatal errors, and stack-trace lines for TypeScript/JavaScript, Python, Go, Java, .NET, Ruby, and PHP.

**Enabling issues** — configure in the Stacktape Console per-organization, per-project, or per-stage. Detection wiring requires Stacktape CLI 3.8.0 or newer. Changes apply in two steps: the Console starts or stops accepting events for matching projects and stages immediately, while the AWS wiring (subscription filters) changes on the next deployment of each matching stage.

**From the CLI**, manage issues using [`stacktape issues:list`](/cli/issues-list), [`issues:resolve`](/cli/issues-resolve), [`issues:ignore`](/cli/issues-ignore), and [`issues:reopen`](/cli/issues-reopen). See the CLI reference pages for available options.

**High-volume protection** — Stacktape includes built-in safety limits. Stale log batches are ignored, each detector invocation handles a bounded number of matching errors, context lookups are capped, and the Console stores only recent occurrence examples while keeping the full occurrence count.

**Limitations** — Because detection starts from log messages, it can miss errors that don't match the recognized patterns and can also pick up application logs that merely look like errors. It is best for recurring runtime failures, not a complete observability or tracing system. On the next deployment, Stacktape skips issue detection for workloads with Stacktape log forwarding configured, user-managed packaging, edge functions, unsupported languages, and disabled projects or stages.

For setup, detection scope, and limitations, see [Issues](/observability/issues).

## Alert channels

Alert channels are the destinations where alarm and notification alerts get delivered. You create channels in the Stacktape Console, then use them in notification rules, alarm rules, and budget alerts.

Channels deliver alerts to destinations such as Slack, email, or a webhook. For Console-managed alarm rules and deployment notifications, you select a pre-created channel.

For supported integration types, setup instructions, and authentication details, see [Alert channels](/observability/alert-channels).

## Notifications

Notification rules alert you when deployment lifecycle events happen — a deploy succeeds, fails, or is canceled. Each rule specifies which events to watch and which channel to deliver the alert to.

Notifications are managed in the Stacktape Console. Each notification rule delivers to a configured alert channel.

For event types and scoping, see [Notifications](/observability/notifications).

## Alert history

The Console keeps a unified log of alerts across notifications, alarms, and budgets. Use alert history to see a complete picture of every alert your organization has received, or check the focused histories below to verify delivery.

Stacktape also maintains separate focused histories:

- **Alarm history** — log of alarm events (triggered and resolved) with delivery status
- **Notification history** — log of deployment notification alerts and their delivery outcomes
- **Budget history** — log of budget threshold alerts

For the unified view, see [Alert history](/observability/alert-history).

## Log forwarding

Log forwarding streams logs from your workloads to an external observability platform using AWS Kinesis Data Firehose. Three destination types are supported: Datadog, Highlight.io, and custom HTTPS endpoint — see [Log forwarding](/observability/log-forwarding) for details on each. Failed deliveries are backed up to an S3 bucket automatically. For cost details, see [Managing costs](/managing-costs/overview).

When log forwarding is configured on a workload, Stacktape skips issue detection for that workload — both features use a CloudWatch Logs subscription filter slot, and each log group has a limited number of slots.

For supported targets, configuration details, and provider-specific setup, see [Log forwarding](/observability/log-forwarding).

## CLI vs Console

The CLI debug commands are designed for ad-hoc investigation — you're debugging a problem right now and want quick answers in your terminal. The Console is designed for ongoing monitoring — persistent views, alarm management, and team-wide visibility.

**Use the CLI when:**
- You're actively debugging a failing deployment or runtime error
- You want a quick metric check without leaving your terminal
- You need to query or filter logs
- You're scripting observability checks in CI/CD

**Use the Console when:**
- You want alarm rules that apply across projects and stages
- You need to monitor alarm state across your organization
- You want to manage issues as a team
- You need alert history and delivery audit trails
- You're setting up notification routing for deployment events

Both work against the same underlying CloudWatch data and Stacktape issue store. They're complementary, not competing.

## FAQ

### Can I use Datadog or another external platform instead of CloudWatch?

Yes. Stacktape's [log forwarding](/observability/log-forwarding) streams logs to external platforms via Kinesis Data Firehose — three destination types are available (`datadog`, `highlight`, and `http-endpoint`). See the [Log forwarding](/observability/log-forwarding) page for supported targets and setup. CloudWatch metrics and alarms remain AWS-native — Stacktape doesn't replace CloudWatch, but you can forward the raw log data to your preferred platform for analysis and search.

### Do I need to instrument my code to get logs and metrics?

No. Lambda functions and container workloads write stdout/stderr to CloudWatch Logs automatically. AWS provides infrastructure metrics (invocations, errors, CPU, memory, latency) without code changes. For application-level metrics beyond what AWS provides, consult the [AWS CloudWatch documentation on publishing custom metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html).

### What's the difference between alarms defined in config vs the Console?

Per-resource alarms in your `stacktape.ts` are version-controlled and deploy with your code — each alarm specifies a trigger type and threshold directly on the resource. Console-managed alarm rules are organization-wide policies created through the UI. Both produce CloudWatch Alarms. Use config alarms for resource-specific thresholds tied to your code. Use Console rules for organization-wide standards applied across projects and stages.

### How does issue detection differ from log monitoring?

[Issues](/observability/issues) is an automated error inbox — it detects, groups, and tracks recurring runtime errors without manual setup beyond enabling it per-project in the Console. Log monitoring (via [`stacktape logs`](/cli/logs) or the Console) gives you raw access to all log output. Issues answer "what's broken across my stack?" while logs answer "what happened at this specific time?"

### Why isn't issue detection picking up my errors?

Detection is log-pattern based and only recognizes common runtime error markers (unhandled exceptions, tracebacks, panics, fatal errors) for TypeScript/JavaScript, Python, Go, Java, .NET, Ruby, and PHP — errors that don't match these patterns are missed. It is also skipped entirely for workloads with Stacktape log forwarding configured, user-managed packaging, edge functions, unsupported languages, and disabled projects or stages. Note that wiring requires Stacktape CLI 3.8.0 or newer, and AWS subscription filters only change on the next deployment of each matching stage.

### Why does enabling log forwarding disable issue detection on a workload?

Both features rely on a CloudWatch Logs subscription filter, and each log group has a limited number of filter slots. When [log forwarding](/observability/log-forwarding) is configured on a workload, Stacktape skips issue detection there to avoid exhausting those slots. If you need automated error grouping for a workload, leave log forwarding off for it.

### How much does observability cost on AWS?

For details on CloudWatch, Kinesis Data Firehose, and overall AWS spend management, see [Managing costs](/managing-costs/overview).
