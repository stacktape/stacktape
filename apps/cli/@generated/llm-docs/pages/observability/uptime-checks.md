# Uptime Checks

Uptime checks probe your HTTP endpoints from multiple AWS regions and alert you when an endpoint stops responding successfully. The probes run inside your own AWS account — Stacktape provisions a small prober Lambda in each monitoring region, so there is no external monitoring vendor and no per-check subscription fee. The Console shows live status, availability and latency history, and an incident timeline for every check.

## When to use

Add an uptime check to every public endpoint whose downtime you want to hear about before your users do: production APIs, customer-facing web apps, and webhook receivers. Checks are cheap (a few Lambda invocations per minute), so the practical default is one check per public-facing service in every production stage.

## When NOT to use

- **Verifying business logic** — an uptime check asserts that an endpoint responds; it does not run flows like sign-in or checkout. Synthetic browser tests cover that (planned).
- **Monitoring internal-only services** — probers reach endpoints over the public internet. A VPC-internal service is not reachable.
- **Catching application errors** — [issues](/observability/issues) group runtime errors from logs; an endpoint can serve 200s while a background job fails.

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

Without `assertions`, a probe succeeds when the response status is 2xx. Without `regions`, Stacktape probes from three regions: the stack's region plus two distant ones.

`notificationChannels` accepts inline channel definitions (Slack, MS Teams, Discord, email, webhook) or `console-channel` references to channels managed in the [Console](/observability/alert-channels). Without any channel, incidents still appear in the Console but nothing is delivered.

Set `enabled: false` to pause a check without deleting its history.

## How it works

- On deploy, Stacktape provisions one shared prober Lambda per monitoring region in your account and stores each check's definition there. Probes run every 30 or 60 seconds.
- A check is marked down only when a quorum of regions (at least two, when the check probes from two or more) fails in the same evaluation window, after `consecutiveFailures` consecutive failing evaluations. This prevents alerts from single-region network blips.
- Recovery follows the same rule symmetrically: `consecutiveSuccesses` consecutive successful evaluations.
- Down and recovery events open and resolve incidents, deliver to your notification channels, and are retried on delivery failure.
- If probing itself stops reporting (for example, the prober was deleted manually), the Console raises a monitoring-silent incident so a dead monitor never masquerades as a healthy endpoint.

Deleting the stack (or the check) removes the check's probing; the shared prober infrastructure stays idle in the account and costs nothing meaningful.

## Limits

- Probed methods are `GET` and `HEAD`. Checks with request bodies are not supported.
- At most 100 uptime checks per stack, and at most 5 regions per check.
- Response bodies are read up to 512 KB for `body-contains` assertions.
- Uptime checks are skipped in [dev mode](/local-development/dev-mode-overview) — ephemeral dev stacks would only produce noise.

## Viewing results

The Console's **Uptime** page lists every check with its live status. Opening a check shows availability and latency history per region and the incident timeline.
