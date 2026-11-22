# Audit log

The **Audit log** page answers "who changed what" for your organization. It shows three kinds of rows in one table,
newest first:

- **Stacktape events**: changes made through Stacktape, such as a member invited, an API key revoked or an AWS account
  connected.
- **Stack operations**: deploys, deletes and the other CLI operations that the Activity page lists, with who ran them.
- **AWS events**: what AWS CloudTrail recorded in your connected AWS accounts, read live from those accounts.

Open it from **Audit log** in the Organization group of the sidebar. It is available on every plan.

## Who can see it

Owners and Admins. Developers and Viewers do not see the page in the sidebar, and opening its address tells them that
only Owners and Admins can see the audit log.

## What Stacktape records

Stacktape records an event for every change that affects access, credentials, integrations or settings, including:

- members invited, removed, or given another role or other projects and AWS accounts
- API keys created or revoked, deployment tokens created, and CLI logins (`stacktape login`) and logouts
- AWS accounts connected and disconnected
- projects, stages, secrets and SSM parameters created, changed or deleted (names only, never values)
- Git, Slack and AI provider connections
- runner settings and runner terminal sessions
- guardrails, budgets, alert channels and notification rules
- organization settings, such as the two-factor requirement, and single sign-on and SCIM changes
- exports of the audit log itself

Changes people make to their own sign-in appear in every organization they belong to: password changed, authenticator
app turned on or off, passkey added or removed, Google or GitHub connected or disconnected, and sessions ended.
Sign-ins themselves are not recorded.

Refused attempts to change members, API keys, AWS connections, the two-factor requirement and single sign-on are
recorded too, with the outcome **Denied**.

## Reading the table

| Column | What it shows |
|---|---|
| Time | When it happened. Hover for the exact time. |
| Source | **Stacktape** or **AWS** |
| Actor | Who did it, and how: in the Console, from the CLI, with an API key, or through Stacktape in AWS |
| Action | For example `member.removed` or an AWS API call such as `DeleteBucket` |
| Target | What it changed |
| AWS account · region | Where it happened, when it happened in AWS |
| Outcome | **Succeeded**, **Denied**, **Failed**, **In progress** or **Unknown** |

Click a row to see all its fields. For an AWS event, the panel also shows the event record as CloudTrail returned it and
links to the event in the AWS console.

The table shows 50 rows at a time. **Load more** continues further back.

## Filters

- **Time range**: from **Last 24 hours** to **Last 400 days**. The default is **Last 7 days**.
- **Source**: **All sources**, **Stacktape** or **AWS**.
- **Person**: everyone, or one member. Organization keys are listed with "(organization key)".
- **AWS account**: one connected account. It keeps that account's AWS events, the stack operations in it, and the
  Stacktape events that changed it.
- **Read-only AWS events**: off by default, so AWS rows show only changes. Turn it on to include reads, such as
  `Describe*` and `List*` calls.

The filters are part of the page address, so you can share a filtered view by copying the link.

## AWS events are read live

Stacktape does not copy your CloudTrail events into its own storage. When you open or filter the page, Stacktape reads
them from your AWS accounts through each account's connection role.

Stacktape reads:

- every connected AWS account, or the one you filtered on;
- the regions where your organization has run Stacktape operations in that account, plus `us-east-1`, where AWS records
  global services such as IAM, CloudFront and Route 53;
- management events only. Data events, such as S3 object reads or Lambda invocations, are not available here.

For an event in another region, use CloudTrail in the AWS console.

The line above the table says which accounts and regions were read and which time they cover. AWS limits how fast
CloudTrail can be read, so on a busy account the line can say "Complete back to" a time; **Load more** reads further.
When an account cannot be read, the line names it and the reason: access denied, region not enabled, throttled by AWS,
or could not be read.

The **Person** filter works on AWS events after they are read. The line above the table says so when it applies.

## Who did it in AWS

For an AWS event, the **Actor** column names the person when Stacktape can tell:

- **"through Stacktape (purpose)"**: a member caused Stacktape to act in AWS, for example by creating a budget or
  deleting a project in the Console. The purpose says what for, such as "budget" or "project delete".
- **Stacktape, "background work (purpose)"**: Stacktape's own scheduled or background work.
- **"with their own AWS credentials"**: the event used AWS access keys that a member's recorded Stacktape operation also
  used, for example when they ran `stacktape deploy` with their own AWS profile.
- Otherwise the AWS principal as AWS reports it, such as a role or an IAM user.

AWS events name only current members. Someone who has left shows as an unknown Stacktape user there. Stacktape events
keep naming the person after they leave.

### Older AWS account connections

AWS account connections created from an older connection template need an update so that AWS records the person
behind each action everywhere. Until then, Stacktape names the person only for actions the connection role makes directly; actions made
through further roles show the AWS principal instead.

Owners and Admins see an **Update** button next to these accounts on **Configuration → AWS accounts**. It opens a
dialog with the steps and a link that updates the connection stack in AWS CloudFormation. See
[AWS permissions](/stacktape-console/aws-permissions#who-can-use-the-role) for how the person is recorded.

## How long events are kept

| Rows | Kept for | Where |
|---|---|---|
| Stacktape events | 400 days, also after the organization is deleted | Stacktape |
| AWS events | 90 days, CloudTrail's event history | Your AWS account |

The page shows at most the last 400 days. When a time range reaches further back than 90 days, AWS events cover only the
last 90 days and older rows are Stacktape events only; the line above the table says so. To keep AWS events longer, set
up a CloudTrail trail that delivers them to an S3 bucket in your AWS account.

## Export

Click **Export** and choose **Stacktape events as CSV** or **Stacktape events as JSON**.

- The file has the Stacktape events and stack operations of the selected time range, narrowed by the **Person** and
  **AWS account** filters. The **Source** and **Read-only AWS events** filters do not apply.
- AWS events are not exported: you already have them in your AWS account.
- One export holds at most 50,000 rows, the newest ones. When there are more, the Console says so; narrow the time range
  to export the rest.
- The columns are `time`, `type` (`event` or `stack operation`), `actor`, `actorEmail`, `action`, `targetType`,
  `target`, `awsAccountId`, `region`, `outcome`, `details` and `id`. In the CSV file, `details` is a JSON object.
- In the CSV file, a value that starts with `=`, `+`, `-` or `@` gets a leading apostrophe, so a spreadsheet does not run
  it as a formula.

Each export is itself recorded in the audit log, with its format, time range and filters.

## Troubleshooting

### There are no AWS events

Check that the **Source** filter is not **Stacktape**, that the time range ends within the last 90 days, and that the
organization has a connected AWS account. Events from regions where your organization never ran a Stacktape operation
are not read, except `us-east-1`.

### An account shows "access denied"

Stacktape could not use the account's connection role. Check the account's state on the **AWS accounts** page.

### An account shows "throttled by AWS"

AWS limited the reads. Try again in a minute.

### An AWS event shows a role instead of a person

The action did not go through Stacktape, or it went through further roles in an account whose connection has not been
updated. See [Older AWS account connections](#older-aws-account-connections).

## Related features

- [Team and access control](/stacktape-console/team-and-access-control): members, roles and organization keys
- [Single sign-on](/stacktape-console/single-sign-on): SSO and SCIM changes appear in the audit log
- [Connecting your AWS account](/stacktape-console/connecting-your-aws-account): the connection role the AWS events are
  read through
