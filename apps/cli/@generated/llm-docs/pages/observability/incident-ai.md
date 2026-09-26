# AI Assessment, Investigation and Fixes

Stacktape uses AI on [incidents](/observability/incidents) in three ways:

- **Automatic briefing.** Every incident gets a short AI assessment of what is happening and what to check next. It needs no setup, and Stacktape pays for it.
- **Investigate with AI.** When you ask, Claude Code investigates the incident on your project's runner in your AWS account. It reads the stack's logs, metrics, alarms and runtime configuration, and your source code when the repository is connected, then reports what it found. It changes nothing.
- **Fix with AI.** When you ask, the same kind of run may also edit your code, and Stacktape opens a draft pull request with the change for you to review. Nothing is deployed.

You start Investigate and Fix from the incident page in the Console, and fund them with your organization's Anthropic API key or your own Claude subscription.

| | Automatic briefing | Investigate with AI | Fix with AI |
|---|---|---|---|
| Starts | For every incident | When someone asks | When someone asks |
| Paid by | Stacktape | Your Anthropic API key or your Claude subscription | Your Anthropic API key or your Claude subscription |
| Runs on | Stacktape, with a Stacktape-managed model | Your project's runner, in your AWS account | Your project's runner, in your AWS account |
| Reads | What Stacktape already stores about the incident | Also the stack's logs, metrics, alarms and runtime configuration, and the source of the recorded commit | The same as Investigate |
| Result | A briefing on the incident page and its Slack card | A report on the incident page | A report and a pull request |
| Changes | Nothing | Nothing | Opens one pull request and deploys nothing |

## Automatic briefing

Every incident gets an AI briefing when it opens, without any setup. Stacktape prepares a new one when the incident changes: a new signal joins it, it escalates, or it reopens. A briefing usually arrives within two minutes of the change. Alerts and pages never wait for it.

The briefing contains:

- a short summary;
- **Observed impact**;
- **Why it may need attention now**, with a note when the model thinks the severity may be understated or overstated;
- **Hypotheses, most likely first**, each with a confidence;
- **Not known**: what the evidence could not establish;
- a **Likely remedy**, labeled as a hypothesis, only when the evidence supports one;
- a **Suggested next step**.

Statements cite the evidence they rest on, such as a signal, an error group, an uptime check, the release that was live, a deploy or alert event around that time, or an earlier related incident of the same project. The incident page also lists those earlier related incidents.

The briefing gives hypotheses from stored evidence, not a verified diagnosis. The incident's status, severity and signals come from live monitoring, and the briefing never changes them. After the incident resolves, the page labels the briefing as the one made while the incident was open.

The briefing appears:

- on the incident page in the Console, under **AI assessment**, with the time its evidence was collected;
- on the incident's card in Slack when the incident goes to a [Stacktape Slack app](/observability/alert-channels#slack-stacktape-app) channel: the summary and why it may need attention now, with a link to the full assessment. The card is updated when a new briefing is ready;
- in the [agent handoff](/observability/incidents#agent-handoff-bundle) that **Copy details for agent** and `stacktape incidents:show` return.

A Stacktape-managed model writes the briefing from a scrubbed, bounded snapshot of what Stacktape already stores about the incident (see [What leaves your AWS account](#what-leaves-your-aws-account)). It does not read raw log lines, your source code or live state in your AWS account. Stacktape pays for it and limits how many briefings it prepares per organization per hour, so during a burst of incidents some briefings wait. A briefing that cannot be prepared within a day is dropped. Alerts and monitoring are unaffected either way.

## Investigate with AI

**Investigate with AI** on the incident page runs Claude Code on your project's [runner](/ci-cd-and-gitops/build-runners): the EC2 instance in the incident's AWS account and region that also runs the project's Console deployments. If the runner is stopped or does not exist yet, Stacktape starts or creates it first. Claude Code runs without its built-in tools. It has no shell and no file access of its own, only the tools Stacktape gives it.

The agent can read:

- the incident and the project's other incidents, with their signals, evidence, releases, timelines and briefings;
- the stack's resources and status, including any CloudFormation resource in a failed state;
- CloudWatch Logs of the stack's resources, through Logs Insights queries;
- the metrics Stacktape charts for each resource;
- the stack's CloudWatch alarms with their state and reason, and the recent history of the ones that are firing;
- the runtime configuration of the stack's functions and container services: runtime, memory, timeouts, environment variable names (never their values), deployments and recent service events;
- the source of the commit Stacktape recorded for the release live on the stack, when the project's repository is connected. The runner checks out that exact commit, never a branch head. This works for repositories on github.com, gitlab.com and bitbucket.org connected to the project, and for public repositories on those hosts. Without a connected repository or a recorded full commit, the agent works without source and the report says so.

Stacktape performs the log, metric, alarm and configuration reads for the agent. It uses your connected AWS account's role, narrowed to read-only access, and limits every read to the incident's stack, whatever the agent asks for. The AWS session is named after the run, so your CloudTrail shows which run read what. Before the agent sees any output, Stacktape masks known sensitive shapes: secrets and tokens, values under sensitive key names, email and IP addresses, card numbers and user home paths. The runner masks the source the same way and never reads environment, key or credential files such as `.env` files and private keys.

Every read gets a reference, such as `T3`, that the report can cite. Stacktape records which reads happened (the tool and its target), not what they returned.

When the run ends, the incident page shows its report:

- a summary;
- **What the agent reports reading**: each observation with its source and, when it came from a Stacktape read, that read's reference. A reference shows that the read happened, not that the sentence is right;
- **Agent conclusions**, each with a confidence. They are model output, to be checked;
- **Not known**: what the agent could not establish.

An investigation never changes, deploys, rolls back or resolves anything.

A few limits apply:

- One run per incident can be queued or running at a time.
- Each run is limited in turns, model spend and diagnostic reads, and stops after about 30 minutes.
- A run waits for free capacity on the runner and fails without starting if none is free within 30 minutes.
- The incident must belong to a stack in an AWS account connected to your organization.

The incident's card in Slack also has **Investigate with AI** and **Fix with AI** buttons. They open the incident in the Console, where you sign in and choose who pays. Nothing starts from Slack itself.

## Fix with AI

**Fix with AI** starts the same kind of run, but the agent may also edit the checked-out commit. After the agent ends, Stacktape opens a pull request with the change for a person to review, test and merge.

A fix needs:

- a GitHub repository, private or public, connected to the project through the Stacktape GitHub App;
- **Contents** and **Pull requests** write permission for the App on that repository. If the installation lacks them, an owner of the GitHub account can accept the App's updated permissions in GitHub;
- a release whose full commit Stacktape recorded, which happens when you deploy from a Git checkout, and that commit in the repository.

The incident page shows **Fix with AI** as unavailable, with the reason, when the repository is on GitLab or Bitbucket, when no repository is connected through the Stacktape GitHub App, or when Stacktape recorded no full commit for the live release. When you request a fix, Stacktape asks GitHub whether the App has the permissions, whether the repository is not archived, and whether it has the recorded commit. If any answer is no, the request is refused with the reason, and nothing starts or is charged.

A fix then works like this:

1. The runner checks out the recorded commit. The agent reads it as in an investigation, and can create new text files and edit existing ones. It cannot delete or rename files, write binary files, change Git data, or write environment, key or credential files. A change is limited to 20 files and 384 KB, and a new file to 256 KB.
2. After the agent ends, the runner sends Stacktape only the lines the agent wrote. Stacktape checks the change with `git diff --check` for whitespace errors and nothing else. It does not run the project's tests or any code from your repository.
3. Stacktape rebuilds the changed files from the recorded commit and commits them on a new branch, `stacktape/fix-<run>`, whose parent is the recorded commit. It opens a pull request from that branch into the branch the release was deployed from, or into the default branch when that branch no longer exists.
4. The pull request is a draft. Where your GitHub plan offers no draft pull requests for the repository, it is a regular pull request, and its description says so. In a private repository, the description is the agent's, followed by a link to the incident with its title, who requested the fix, the recorded commit, the checks Stacktape ran, and a note that nothing was deployed or merged. In a public repository, anyone can read the pull request, so its description holds nothing about the incident: the change's title, a link to the incident that only your organization's members can open, the recorded commit, the checks and the same note. The incident page shows the agent's description either way.
5. The incident page shows the agent's report, the changed files and the pull request link, together with **Checks Stacktape ran**, **Project tests: not run** and **Deployed: nothing**.

Stacktape writes the branch and the pull request with a GitHub token it mints for that one repository. The token never reaches the runner or the agent. Stacktape writes only the new `stacktape/fix-<run>` branch and never merges it.

Stacktape deploys nothing for a fix and starts no preview deployment for its pull request, even when your project deploys previews of pull requests. Workflows in your repository that run on pull requests or pushes, such as your CI, still run as you configured them. Merging and deploying the change is up to you and your usual deployment. Whether the incident then recovers comes from monitoring, as for any incident; a run never marks an incident fixed.

The pull request is based on the commit Stacktape recorded for the release. If you deployed from a local checkout that had uncommitted changes, those changes are not in that commit, so they are not in the pull request either.

If Stacktape cannot open the pull request, for example because GitHub refused the write, the run fails with GitHub's reason and lists the files the change touched. Start a new fix once the cause is resolved.

## Who pays and which credential

Each time you start a run, you choose the Anthropic credential that funds it. Nothing is preselected.

- **The organization's Anthropic API key.** An Owner or Admin connects it once, and Stacktape checks it with Anthropic before saving it. Members can choose it for their runs but never see it. Usage is billed to the organization's Anthropic account.
- **Your own Claude subscription.** Each member can connect their own token, the one `claude setup-token` prints. Only the runs that member requests use it, and they count against the member's plan limits. The subscription is the member's own arrangement with Anthropic, under Anthropic's terms, which Anthropic can change. Stacktape does not check the plan or promise that its limits cover a run. A member's token is deleted when they leave or are removed from the organization.

A run uses only the credential chosen for it. If that credential is missing, expired, rejected or out of quota, the run fails and says so. Stacktape never switches to the other credential, and one member's subscription never funds another member's run.

Stacktape keeps both kinds of credential encrypted in its AWS Secrets Manager and never shows them back. To start a run, Stacktape copies the chosen credential into an encrypted, expiring SSM parameter in the incident's AWS account. The runner deletes the parameter as soon as it reads it. Until then, an administrator of that AWS account may be able to read it.

The runner's compute is billed to your AWS account, as for your deployments. The automatic briefing costs you nothing.

## What leaves your AWS account

- **For the automatic briefing:** the Stacktape-managed model, through OpenRouter, receives a scrubbed, bounded snapshot of what Stacktape already stores about the incident. The snapshot holds incident and signal metadata, excerpts of signal evidence, error messages and stack frames, uptime, deploy and alert-event facts, and earlier incidents of the same project. It holds no raw log lines, source code or live AWS state.
- **For Investigate and Fix:** Claude Code sends Anthropic, under the terms of the credential that funds the run:
  - the incident handoff;
  - the diagnostic excerpts the agent asks for: log lines, metric values, alarm states and runtime configuration of the incident's stack. Stacktape reads them for the agent with a read-only role limited to that stack, masks them before they reach the agent, and records which reads happened, not their content;
  - source files of the recorded commit when the repository is connected, masked the same way. Environment, key and credential files are never read.
- **For a fix:** the runner sends Stacktape the lines the agent wrote, not the rest of your source: at most 20 files and 384 KB, unmasked, because they are the change itself. Stacktape keeps them only until the pull request exists; when the pull request cannot be opened, they stay with the failed run. The pull request goes to your GitHub repository. In a private repository, it carries the agent's description, the incident's title and who requested the fix. In a public repository, anyone can read the pull request and the change, so it carries only the change's title, a link to the incident that needs a Stacktape login, the recorded commit and Stacktape's checks.
- **For every run:** Stacktape keeps the outcome with the incident, with what the agent reports reading, its conclusions, the checks Stacktape ran and the pull request kept apart. Whether a change was deployed and the incident recovered comes from Stacktape's own records, never from the run.

Stacktape masks known sensitive shapes before data leaves: secrets and tokens, values under sensitive key names such as `password` or `authorization`, email addresses, IP addresses, card numbers and user home paths. Free text can carry anything your application logged, so Stacktape does not promise that no personal data leaves.

## Roles

- **Reading briefings and run results:** every role, including Viewer, on the projects the member can access.
- **Requesting Investigate or Fix:** Owner, Admin and Developer (the `incidents:manage` permission), with access to the incident's project. The person who requested a run must still have that access when the run starts.
- **Connecting, replacing or removing the organization's Anthropic API key:** Owner and Admin.
- **Connecting or removing a Claude subscription token:** each member who can request runs, for their own token, in the dialog that starts a run.

See [Team and access control](/stacktape-console/team-and-access-control#roles-and-permissions) for how roles are assigned.

## Using your own coding agent instead

**Copy details for agent** on the incident page, [`stacktape incidents:show`](/cli/incidents-show) and the MCP server's [`stacktape_incident`](/using-with-ai/mcp-server-setup#incident-tool) tool return the same [handoff](/observability/incidents#agent-handoff-bundle). It holds the incident's signals, evidence, releases, timeline and related incidents, the automatic briefing, and the reports of hosted runs on the incident. Give it to a coding agent on your own machine when:

- the repository is on GitLab or Bitbucket, so Fix with AI is not available;
- no Anthropic credential is connected;
- you prefer to diagnose and change the code with your own agent and tools.

## FAQ

### Does Investigate or Fix deploy anything?

No. An investigation only reads. A fix ends in a pull request on a new branch. Stacktape deploys nothing, merges nothing and starts no preview deployment for it. You review, test, merge and deploy the change yourself.

### Can I use it without connecting a Git repository?

The automatic briefing and Investigate with AI work without one. The investigation then diagnoses from the incident and the stack's diagnostics, and its report says the source was not available. Fix with AI needs a GitHub repository, private or public, connected through the Stacktape GitHub App.

### What happens when a run fails?

The incident page shows why. For example, Anthropic rejected the credential, a usage limit was reached, the runner had no free capacity, or the run took too long. Nothing is retried with another credential. A fix whose pull request could not be opened lists the files it changed. You can start a new run once the cause is resolved.

### Is my source code sent to Anthropic?

Only in Investigate and Fix runs, and only when your repository is connected and Stacktape recorded the full commit of the live release. The agent reads files of that commit on your runner, masked, and Claude Code sends what it reads to Anthropic under the terms of the credential you chose. Environment, key and credential files are never read. The automatic briefing never reads source code.

### Can a Viewer start a run?

No. Viewers can read briefings and run results on the projects they can access. Starting a run needs the Owner, Admin or Developer role and access to the project.

### Does the briefing change the incident's severity or alerts?

No. Severity, status, signals and pages come from monitoring, and alerts never wait for the briefing. When the model thinks the severity may be understated or overstated, the briefing says so, and the severity stays as monitoring set it.

### Can Stacktape change my main branch?

No. For a fix, Stacktape creates one new branch, `stacktape/fix-<run>`, and opens a pull request from it. It does not push to any other branch and never merges.
