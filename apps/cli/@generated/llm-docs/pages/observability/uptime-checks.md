# Uptime checks

Uptime checks probe your HTTP endpoints from several AWS regions and alert you when an endpoint stops responding. The
probes run in your own AWS account, in a small prober Lambda per region, so there is no monitoring vendor and no fee
per check. The Console shows each check's live status, availability and latency history, and its incidents.

Uptime checks need the [Stacktape Console](/getting-started/add-the-console) (the Free plan works), because the Console
decides when a check is down and sends the alerts. Without a Console connection, a deploy with an uptime check stops at
validation with `CONFIG_NEEDS_CONSOLE` and changes nothing. Connect with `stacktape connect`, or remove the check.

Add a check to every public endpoint whose downtime you want to hear about first: production APIs, web apps and
webhook receivers. An uptime check only tells you that an endpoint answers. To run a flow such as sign-in or checkout,
use a [synthetic test](/observability/synthetic-tests). Probes come from the public internet, so they can't reach a
service that is only inside your VPC.

## Configuration

An uptime check is a standalone resource. The only required property is `url`:

```yaml
resources:
  apiHealth:
    type: uptime-check
    properties:
      url: https://api.example.com/health
```

A full example with assertions, evaluation thresholds, and notifications:

```yaml
resources:
  apiHealth:
    type: uptime-check
    properties:
      url: https://api.example.com/health
      method: GET # GET or HEAD, default GET
      intervalSeconds: 60 # 30 or 60, default 60
      timeoutSeconds: 10 # default 10
      followRedirects: true # default true
      assertions:
        - type: status-code
          properties:
            accepted: [200, 204]
        - type: body-contains
          properties:
            value: '"status":"ok"'
      evaluation:
        consecutiveFailures: 3 # default 2
        consecutiveSuccesses: 2 # default 2
      regions: [eu-west-1, us-east-1, ap-southeast-1]
      notificationChannels:
        - type: console-channel
          properties:
            channelName: on-call-slack
```

Without `assertions`, a probe succeeds when the response status is 2xx or 3xx. Without `regions`, Stacktape probes from three regions: the stack's region plus two distant ones.

`notificationChannels` accepts three kinds of destinations, none of which puts a credential in your configuration:

- `console-channel`: a channel created on the Console's **Channels** page, referenced by name. Use it for Slack with your own bot token, Microsoft Teams, Discord and webhooks. See [alert channels](/observability/alert-channels).
- `slack-app`: a channel of the Slack workspace connected through the Stacktape Slack app, such as `#alerts`.
- `email`: a `sender` and a `recipient` address.

Inline `slack`, `ms-teams`, `discord` and `webhook` channels, which [alarms](/observability/alarms) accept, are rejected on uptime checks. The Stacktape Console decides when a check is down and sends its notifications, so those channels would have to send their bot token or webhook URL to the Console. A `$Secret()` reference does not help: the Console cannot read secrets in your AWS account. Create the channel in the Console once and reference it instead:

```yaml
resources:
  apiHealth:
    type: uptime-check
    properties:
      url: https://api.example.com/health
      notificationChannels:
        - type: console-channel
          properties:
            channelName: on-call-slack
        - type: slack-app
          properties:
            channel: '#alerts'
```

Without any channel, incidents still appear in the Console but nothing is delivered.

Set `enabled: false` to pause a check without deleting its history.

## How it works

- On deploy, Stacktape provisions one shared prober Lambda per monitoring region in your account and stores each check's definition there. Probes run every 30 or 60 seconds.
- A check is marked down only when a quorum of regions (at least two, when the check probes from two or more) is failing at the same time — a region counts as failing for up to ten minutes after its last failing report — and the failure has persisted for `consecutiveFailures` consecutive evaluations. This prevents alerts from single-region network blips.
- Recovery follows the same rule symmetrically: `consecutiveSuccesses` consecutive successful evaluations.
- Down and recovery events open and resolve incidents, deliver to your notification channels, and are retried on delivery failure.
- If probing itself stops reporting (for example, the prober was deleted manually), the Console raises a monitoring-silent incident so a dead monitor never masquerades as a healthy endpoint.

Deleting the stack (or the check) removes the check's probing; the shared prober infrastructure stays idle in the account and costs nothing meaningful.

## What leaves your AWS account

[What leaves your AWS account](/observability/overview#what-leaves-your-aws-account) compares every feature in one table.

The probes run in your account, but the Console decides when a check is down, so it receives:

- **On deploy:** each check's definition: name, URL, method, interval, timeout, redirect setting, assertions, regions, failure and recovery thresholds, and its `notificationChannels`: the `console-channel` name, the `slack-app` channel name and ID, or the email sender and recipient. No channel credential is sent, because uptime checks accept only channels without one.
- **From every probe:** the project, stage, check name and region, up or down, the HTTP status, the total latency, the DNS, connect, TLS and time-to-first-byte timings, a failure reason of at most 500 characters, and the TLS certificate's expiry date.

Response bodies are read only inside the prober to evaluate `body-contains` assertions and are not sent.

## Limits

- Probed methods are `GET` and `HEAD`. Checks with request bodies are not supported.
- At most 100 uptime checks per stack, and at most 5 regions per check. A region's shared prober has a bounded probing budget per minute — with many slow or timing-out endpoints in one region (across all stacks), some probes can be skipped for that tick; keep high-`timeoutSeconds` checks few. A probe that cannot get its full configured timeout is dropped rather than reported as down, and a check that stops getting probed entirely raises a monitoring-silent alert.
- Response bodies are read up to 512 KB for `body-contains` assertions; the asserted text itself is capped at 2000 characters.
- Uptime checks are skipped in [dev mode](/local-development/dev-mode-overview) — ephemeral dev stacks would only produce noise.

## Viewing results

The Console's **Uptime** page lists every check with its live status. Opening a check shows availability and latency history per region and the incident timeline.
