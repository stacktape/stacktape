# AI Assessment, Investigation and Fixes

Stacktape uses AI on [incidents](/observability/incidents) in three ways:

- **Automatic briefing.** Every incident gets a short AI assessment of what is happening and what to check next. It needs no setup, and Stacktape pays for it.
- **Investigate with AI.** When you ask, the coding agent you choose (Claude Code, Codex, Grok or OpenCode) investigates the incident on your project's runner in your AWS account, in a checkout of your code. It works like your own coding agent: it reads and runs the code, installs packages, runs tests and reads documentation. It reads AWS only through Stacktape's reviewed read-only operations, which Stacktape executes for it. Then it reports what it found. It publishes and deploys nothing.
- **Fix with AI.** When you ask, the same kind of run also changes the code and runs the relevant tests. The runner pushes the change as a branch, and Stacktape opens a draft pull request for you to review. Nothing is deployed.

You start Investigate and Fix from the incident page in the Console. For each run you choose the agent and who pays: your organization's API key with the agent's provider, or your own subscription with it.

| | Automatic briefing | Investigate with AI | Fix with AI |
|---|---|---|---|
| Starts | For every incident | When someone asks | When someone asks |
| Paid by | Stacktape | Your organization's API key or your own subscription | Your organization's API key or your own subscription |
| Runs on | Stacktape, with a Stacktape-managed model | Your project's runner, in your AWS account | Your project's runner, in your AWS account |
| Reads | What Stacktape already stores about the incident | Also your code at the recorded commit, AWS through Stacktape's read-only operations, and the web | The same as Investigate |
| Result | A briefing on the incident page and its Slack card | A report and what the agent did, on the incident page | A report, what the agent did, and a pull request |
| Changes | Nothing | Nothing outside the runner | Pushes one branch, opens one pull request, deploys nothing |

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

**Investigate with AI** on the incident page runs the [coding agent you choose](#coding-agents) on your project's [runner](/ci-cd-and-gitops/build-runners): the EC2 instance in the incident's AWS account and region that also runs the project's Console deployments. If the runner is stopped or does not exist yet, Stacktape starts or creates it first.

When the project's repository is connected, the runner checks out the commit Stacktape recorded for the release live on the stack, never a branch head. This works for repositories on github.com, gitlab.com and bitbucket.org connected to the project, and for public repositories on those hosts. The agent works in that checkout with its built-in tools, as your own coding agent would: it reads, searches, edits and deletes files, runs commands, installs packages, runs the project's tests and reproductions, searches the web and fetches documentation, with the internet access the runner has, and without asking for approval. Claude Code also reads the repository's `CLAUDE.md`. Without a connected repository or a recorded full commit, the agent works without source and the report says so.

For Stacktape and AWS, the agent has Stacktape's tools:

- the incident and the project's other incidents, with their signals, evidence, releases, timelines and briefings;
- `aws_call`: any operation from Stacktape's reviewed read-only catalog, the same list [`stacktape aws:call`](/cli/aws-call) accepts, anywhere in the incident's AWS account. An operation outside the catalog is refused. Secret values are not in the catalog: Secrets Manager secret values, SSM parameter values and the values of function and container environment variables are never returned;
- the resources of the incident's stack, CloudWatch Logs Insights queries over their logs, their metrics, alarms and runtime configuration, by the resource names in your Stacktape config;
- a search of Stacktape's documentation.

Stacktape executes every AWS read for the agent, with your connected AWS account's role, in a session named after the run, so your CloudTrail shows which run read what. Before the agent sees an answer, Stacktape masks known sensitive shapes in it: secrets and tokens, values under sensitive key names, email and IP addresses, card numbers and user home paths. The agent itself has no AWS credentials: nothing on the runner that it can reach holds an AWS credential, a Stacktape API key, a deployment credential or a Git write token. The credential that funds the run goes only to the agent's own process, and to its sign-in file for as long as the agent runs. Whether the commands the agent runs can read it depends on the agent: see [Coding agents](#coding-agents).

When the run ends, the incident page shows its report:

- a summary;
- **What the agent reports seeing**: each observation with where the agent says it saw it;
- **Agent conclusions**, each with a confidence. They are model output, to be checked;
- **Not known**: what the agent could not establish;
- **What the agent did**: every command it ran, file it read, wrote or edited, page it fetched and Stacktape tool it called, in order, recorded from the agent's own output and masked. Stacktape keeps up to 300 steps and counts the rest.

An investigation deploys, rolls back and resolves nothing, and changes nothing in your AWS account. What it changes in the checkout on the runner is discarded with the run.

A few limits apply:

- One run per incident can be queued or running at a time.
- A run stops after 60 minutes. A run funded by the organization's API key also stops at 20 USD of model spend where the agent reports its spend while it works: Claude Code stops itself, and Stacktape stops OpenCode. Codex and Grok report none, so only the 60 minutes bound them. A run funded by a member's subscription counts against that plan's limits.
- A run waits for free capacity on the runner and fails without starting if none is free within 30 minutes.
- The incident must belong to a stack in an AWS account connected to your organization.

The incident's card in Slack also has **Investigate with AI** and **Fix with AI** buttons. They open the incident in the Console, where you sign in and choose the agent and who pays. Nothing starts from Slack itself.

## Coding agents

Each run uses one of these agents, at the release Stacktape pinned for it. The runner installs that release and checks its checksum before it reads any credential.

| Agent | Provider | Your own subscription | The organization's API key |
|---|---|---|---|
| Claude Code 2.1.281 | Anthropic | Your Claude subscription: the token `claude setup-token` prints | An Anthropic API key |
| Codex 0.157.0 | OpenAI | Your ChatGPT plan: the sign-in of your Codex CLI | An OpenAI API key |
| Grok 1.0.41 | xAI | Your Grok sign-in: the sign-in of your Grok CLI | An xAI API key |
| OpenCode 1.18.32 | The provider it signed in to or whose key it uses | What your OpenCode CLI is signed in to (`opencode auth login`) | None of its own: one of the organization's Anthropic, OpenAI or xAI keys, chosen for the run |

Every agent gets the same prompt, the same Stacktape tools through an MCP server, which is the only one it loads, and the same limits. They differ in how they hold the credential:

- **Claude Code** gets the credential in one environment variable of its own process. It runs the agent's commands in its sandbox, without the credential and without a view of its own process or of the run's files. The sandbox needs bubblewrap and socat, which the run installs when the runner image lacks them.
- **Codex** gets an API key in its own environment, or a ChatGPT sign-in as its own sign-in file. It runs the agent's commands in its sandbox: without the key in their environment, without a view of its own process, and unable to read the sign-in file or the run's files.
- **Grok** gets an API key in its own environment, or a sign-in as its own sign-in file. The key is left out of its commands' environment, but Grok has no sandbox Stacktape can use: the commands run as the same user as Grok and can read the sign-in file, Grok's own environment, and the run's files. Those hold the run's job credential, which lets them call Stacktape's tools for the run as the agent can, until the run ends.
- **OpenCode** gets its sign-in file, or a file naming the organization's key. It has no sandbox: its commands can read that file and the run's files. It does not load the repository's own OpenCode configuration or plugins.

A sign-in file is deleted when the agent exits. When the agent's commands must not be able to read the credential, choose Claude Code or Codex.

## Fix with AI

**Fix with AI** starts the same kind of run, and the agent also changes the checked-out code, runs the relevant tests and reports what it ran. After the agent ends, the runner pushes the change as a branch, and Stacktape opens a pull request for a person to review, test and merge.

A fix needs:

- a GitHub repository, private or public, connected to the project through the Stacktape GitHub App;
- **Contents** and **Pull requests** write permission for the App on that repository. If the installation lacks them, an owner of the GitHub account can accept the App's updated permissions in GitHub;
- a release whose full commit Stacktape recorded, which happens when you deploy from a Git checkout, and that commit in the repository.

The incident page shows **Fix with AI** as unavailable, with the reason, when the repository is on GitLab or Bitbucket, when no repository is connected through the Stacktape GitHub App, or when Stacktape recorded no full commit for the live release. When you request a fix, Stacktape asks GitHub whether the App has the permissions, whether the repository is not archived, and whether it has the recorded commit. If any answer is no, the request is refused with the reason, and nothing starts or is charged.

A fix then works like this:

1. The runner checks out the recorded commit, and the agent works in it as in an investigation: it finds the cause, changes the code and runs the project's tests.
2. After the agent ends and its processes are stopped, the runner takes everything the agent changed in the checkout, as Git sees it with the repository's own ignore rules: added, edited, deleted and renamed files, binary files included. It refuses only a change that touches Git's own data, such as a nested repository, and one larger than 20 MB.
3. Stacktape mints a GitHub token that can write this one repository's contents and nothing else, and hands it to the runner through an SSM parameter in your AWS account that only the runner's own role can read. The runner reads and deletes it; the agent never sees it. The runner commits the change on the recorded commit and pushes it as a new branch, `stacktape/fix-<run>`.
4. Stacktape opens a pull request from that branch into the branch the release was deployed from, or into the default branch when that branch no longer exists. The pull request is a draft. Where your GitHub plan offers no draft pull requests for the repository, it is a regular pull request, and its description says so. In a private repository, the description is the agent's, followed by a link to the incident with its title, who requested the fix, the recorded commit, what the agent says it ran, and a note that nothing was deployed or merged. In a public repository, anyone can read the pull request, so its description holds nothing about the incident: the change's title, a link to the incident that only your organization's members can open, the recorded commit and the same note. The incident page shows the agent's description either way.
5. The incident page shows the agent's report, the changed files and the pull request link, together with **What the agent says it ran**, next to **What the agent did**, and **Deployed: nothing**.

Stacktape opens the pull request with a GitHub token it mints for that one repository, and that token never leaves Stacktape. Neither Stacktape nor the runner writes anything but the new `stacktape/fix-<run>` branch, and neither merges it.

Stacktape deploys nothing for a fix and starts no preview deployment for its pull request, even when your project deploys previews of pull requests. Workflows in your repository that run on pull requests or pushes, such as your CI, still run as you configured them. Merging and deploying the change is up to you and your usual deployment. Whether the incident then recovers comes from monitoring, as for any incident; a run never marks an incident fixed.

The pull request is based on the commit Stacktape recorded for the release. If you deployed from a local checkout that had uncommitted changes, those changes are not in that commit, so they are not in the pull request either.

If GitHub refuses the push, or Stacktape cannot open the pull request, the run fails with GitHub's reason. The incident page then lists the files the change touched and shows the change as a patch, so that it is not lost. Start a new fix once the cause is resolved.

## Who pays and which credential

Each time you start a run, you choose the agent and the credential that funds it. Nothing is preselected.

- **The organization's API key.** An Owner or Admin connects an Anthropic, OpenAI or xAI key once, and Stacktape checks it with that provider before saving it: it lists Anthropic's or OpenAI's models, or asks xAI to describe the key. Members can choose it for their runs but never see it. Usage is billed to the organization's account with that provider. An OpenCode run on the organization's money uses one of these keys, chosen when the run starts.
- **Your own subscription.** Each member can connect their own sign-in with each provider by running [`stacktape ai:connect`](/cli/ai-connect): the token `claude setup-token` prints, the ChatGPT sign-in of the Codex CLI, the sign-in of the Grok CLI, or what the OpenCode CLI is signed in to. A Claude token can also be pasted in the dialog that starts a run. Only the runs that member requests use it, and they count against the member's plan limits. The subscription is the member's own arrangement with the provider, under the provider's terms, which the provider can change. Stacktape does not check the plan or promise that its limits cover a run. A member's sign-ins are deleted when they leave or are removed from the organization.

A run uses only the credential chosen for it. If that credential is missing, expired, rejected or out of quota, the run fails and says so. Stacktape never switches to another credential, and one member's subscription never funds another member's run.

A Codex, Grok or OpenCode sign-in holds a refresh token. A run may refresh its copy, and nothing is written back to Stacktape. When a provider replaces the refresh token on refresh, the copy Stacktape stores, or the one on the member's machine, stops working: the run fails saying the provider did not accept the sign-in, and the member reconnects it with `stacktape ai:connect`. [`ai:connect`](/cli/ai-connect#sign-ins-that-refresh) shows how to give runs a sign-in of their own.

Stacktape keeps every credential encrypted in its AWS Secrets Manager and never shows it back. To start a run, Stacktape copies the chosen credential into an encrypted, expiring SSM parameter in the incident's AWS account. The runner deletes the parameter as soon as it reads it. Until then, an administrator of that AWS account may be able to read it.

The runner's compute is billed to your AWS account, as for your deployments. The automatic briefing costs you nothing.

## What leaves your AWS account

- **For the automatic briefing:** the Stacktape-managed model, through OpenRouter, receives a scrubbed, bounded snapshot of what Stacktape already stores about the incident. The snapshot holds incident and signal metadata, excerpts of signal evidence, error messages and stack frames, uptime, deploy and alert-event facts, and earlier incidents of the same project. It holds no raw log lines, source code or live AWS state.
- **For Investigate and Fix:** the agent sends its provider, under the terms of the credential that funds the run, whatever it reads while it works: the incident handoff, the answers of Stacktape's tools (AWS data, masked by Stacktape), your source code, the output of the commands it runs, and the web pages it fetches. The provider is Anthropic for Claude Code, OpenAI for Codex, xAI for Grok, and for OpenCode the provider its sign-in or key belongs to. Your source code and command output are not masked.
- **For a fix:** the runner pushes the change to your GitHub repository. Stacktape keeps the list of changed files and, when the push or the pull request fails, the change as a patch of up to 256 KB. In a private repository, the pull request carries the agent's description, the incident's title, who requested the fix and what the agent says it ran. In a public repository, anyone can read the pull request and the change, so it carries only the change's title, a link to the incident that needs a Stacktape login and the recorded commit.
- **For every run:** Stacktape keeps the outcome with the incident: what the agent did (the commands, files, pages and Stacktape tools it used, masked), what it reports seeing and concluded, what it says it ran and the pull request, kept apart. Whether a change was deployed and the incident recovered comes from Stacktape's own records, never from the run.

Stacktape masks known sensitive shapes in the answers of its tools and in what it keeps: secrets and tokens, values under sensitive key names such as `password` or `authorization`, email addresses, IP addresses, card numbers and user home paths. Free text can carry anything your application logged, so Stacktape does not promise that no personal data leaves.

## Roles

- **Reading briefings and run results:** every role, including Viewer, on the projects the member can access.
- **Requesting Investigate or Fix:** Owner, Admin and Developer (the `incidents:manage` permission), with access to the incident's project. The person who requested a run must still have that access when the run starts.
- **Connecting, replacing or removing the organization's Anthropic, OpenAI or xAI API key:** Owner and Admin.
- **Connecting or removing their own sign-in with a provider:** each member, for their own, with `stacktape ai:connect` and `stacktape ai:disconnect`, or in the dialog that starts a run.

See [Team and access control](/stacktape-console/team-and-access-control#roles-and-permissions) for how roles are assigned.

## Using your own coding agent instead

**Copy details for agent** on the incident page, [`stacktape incidents:show`](/cli/incidents-show) and the MCP server's [`stacktape_incident`](/using-with-ai/mcp-server-setup#incident-tool) tool return the same [handoff](/observability/incidents#agent-handoff-bundle). It holds the incident's signals, evidence, releases, timeline and related incidents, the automatic briefing, and the reports of hosted runs on the incident. Give it to a coding agent on your own machine when:

- the repository is on GitLab or Bitbucket, so Fix with AI is not available;
- no credential is connected for the agent you want;
- you prefer to diagnose and change the code with your own agent and tools.

## FAQ

### Does Investigate or Fix deploy anything?

No. An investigation publishes nothing: what it changes in the checkout on the runner is discarded. A fix ends in a pull request on a new branch. Stacktape deploys nothing, merges nothing and starts no preview deployment for it. You review, test, merge and deploy the change yourself.

### Can the agent change my AWS resources?

No. The agent has no AWS credentials. It reads AWS only through Stacktape's reviewed read-only operations, which Stacktape executes for it, and an operation outside that catalog is refused. A change to production goes through the pull request you merge and deploy.

### Can I use it without connecting a Git repository?

The automatic briefing and Investigate with AI work without one. The investigation then diagnoses from the incident and your AWS account, and its report says the source was not available. Fix with AI needs a GitHub repository, private or public, connected through the Stacktape GitHub App.

### What happens when a run fails?

The incident page shows why. For example, the provider rejected the credential, a usage or spend limit was reached, the runner had no free capacity, or the run took too long. Nothing is retried with another credential. A fix whose change could not be pushed or published keeps it with the run: the page lists the changed files and shows the change as a patch. You can start a new run once the cause is resolved.

### Is my source code sent to the AI provider?

Only in Investigate and Fix runs, and only when your repository is connected and Stacktape recorded the full commit of the live release. The agent reads and runs your code on your runner and sends what it reads to its provider under the terms of the credential you chose. Unlike the answers of Stacktape's tools, source code and command output are not masked. The automatic briefing never reads source code.

### Which agent should I choose?

The one your team already uses and pays for. When the agent's commands must not be able to read its credential or the run's files, choose Claude Code or Codex (see [Coding agents](#coding-agents)). On the organization's API key, Claude Code and OpenCode also stop at the run's spend limit.

### Can a Viewer start a run?

No. Viewers can read briefings and run results on the projects they can access. Starting a run needs the Owner, Admin or Developer role and access to the project.

### Does the briefing change the incident's severity or alerts?

No. Severity, status, signals and pages come from monitoring, and alerts never wait for the briefing. When the model thinks the severity may be understated or overstated, the briefing says so, and the severity stays as monitoring set it.

### Can Stacktape change my main branch?

No. For a fix, the runner pushes one new branch, `stacktape/fix-<run>`, and Stacktape opens a pull request from it. Neither pushes to any other branch or merges.
