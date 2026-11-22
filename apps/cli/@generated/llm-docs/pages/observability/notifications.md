# Notification rules

A notification rule decides which Stacktape events an [alert channel](/observability/alert-channels) receives, such as
an opened incident, a failed deploy or a changed secret. Each rule belongs to one channel, lists the events it sends and
can be limited to some projects and stages. You manage rules on the channel's page in the Console.

Rules cover events Stacktape records: incidents, deploys, rollbacks, deletes, Git deployments, script runs, secret and
SSM parameter changes, and new security findings. Metric thresholds such as CPU or error rates are
[alarms](/observability/alarms), defined in your config. A firing alarm opens an [incident](/observability/incidents),
so a rule that sends incident events also covers alarms.

## Add a rule

1. Open **Alerting → Channels** and click the channel.
2. Click **New rule**.
3. Choose the events. A new rule starts with the failure events, the incident events and new security findings.
4. Optionally, limit it to some projects and stages, for example only `production`.
5. Click **Add rule**.

To remove a rule, choose **Delete** in its row menu; the channel stays. Adding and deleting rules needs the
`org:manage-notifications` permission (Owners and Admins). Every member can see them.

A new channel already has rules, so it starts receiving alerts right away:

- incidents opened, escalated and resolved, from every stage;
- failed deploys, rollbacks and deletes, from every stage;
- successful deploys and rollbacks, from production stages;
- new security findings.

## Events

| Group | Events |
|---|---|
| **Incidents** | Incident opened, Incident escalated, Incident resolved |
| **Security** | New critical or high security findings |
| **Deployment** | Deploy started, Deploy succeeded, Deploy failed, Deploy rolled back |
| **Git deployments** | Preview deploy succeeded, Preview deploy failed, Git push deploy succeeded, Git push deploy failed |
| **Rollback** | Rollback succeeded, Rollback failed |
| **Deletion** | Delete started, Delete succeeded, Delete failed |
| **Scripts** | Script run succeeded, Script run failed |
| **Secrets** | Secret created, Secret updated, Secret deleted |
| **SSM parameters** | Parameter created, Parameter updated, Parameter deleted |

Secret and SSM parameter events belong to the whole organization, so a rule that watches only those has no project or
stage scope.

## Route events to different channels

Each channel has its own rules, so give each one the events and scope it should get. A common split:

- an on-call Slack channel: incident events and production deploy failures;
- a team channel: every deploy of its own projects;
- a webhook into your incident tool: incident events only.

The channel's page lists its rules with their **Events**, the projects and stages they come **From**, and when each
was **Added**. The Channels list sums this up in its **Receives** column.

## Check what was sent

[Sent alerts](/observability/alert-history) lists every alert the Console sent, with the delivery result per channel.
Set **Delivery** to **Failed** to find alerts that didn't arrive. Each channel's page also shows its recent alerts.

## Rules, alarms and budgets

| | Watches | Set up in |
|---|---|---|
| **Notification rules** | Stacktape events, such as a failed deploy or an opened incident | The Console, on each channel's page |
| **[Alarms](/observability/alarms)** | CloudWatch metrics, such as error rate, CPU or queue depth | Your config, in a resource's `alarms`; created on deploy |
| **[Budgets](/managing-costs/budgets)** | AWS spend | The Console, **Alerting → Budgets** |

All three can deliver to the same channel.
