# API keys

An API key signs the Stacktape CLI in to the Console where nobody can open a browser: a CI pipeline, a server or a script. Keys live on **Organization → API keys**, and there are two kinds:

| You need | Use |
|---|---|
| A pipeline or tool your team shares | An **organization key**. It belongs to the organization and keeps working when people leave. Owners and Admins create it. |
| Your own script or server | A **personal key**. It acts as you, with your role and access, and stops working if you leave the organization. |
| The CLI on your own machine | No key: run [`stacktape login`](/cli/login). |

A personal organization has only personal keys. CI that a team shares belongs in a team organization, with an organization key.

## Create an organization key

1. Open **Organization → API keys** and click **New organization key**.
2. Name it after where it runs, for example `github-actions`.
3. Pick its role: **Developer** with the projects and AWS accounts the pipeline deploys, or **Admin** for everything.
4. Pick when it expires, from 30 days to a year.
5. Copy the key from the next dialog. It is shown only once.

Store it as the `STACKTAPE_API_KEY` secret of your CI. When the organization has more than one connected AWS account, pass `--aws-account <name>` on the CLI commands, so a pipeline never has to guess. See [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd).

The table shows each key's access, status, when it was last used, when it expires and who created it. Organization keys can't create organizations or connect AI subscriptions, which belong to people.

## Create a personal key

Click **New personal key** (in a personal organization, **New API key**), give it a name and an expiry, and copy the key from the next dialog. The dialog says whose access the key uses: yours, in the organization that is open, with your role and, for a Developer, your projects and AWS accounts. Viewers have no API keys page and can't create keys.

`stacktape login` creates a key for this machine too. It is listed as a **CLI session**, and [`stacktape logout`](/cli/logout) revokes it.

## What a key can reach

A key never does more than its role. A Developer key reaches only the projects and AWS accounts chosen for it; asking it for credentials in another AWS account fails with "Your access does not include the AWS account". See [Team and access control](/stacktape-console/team-and-access-control) for the roles.

A key is a password. Keep it in your CI's secret store, never in code, chat, issue trackers or shell history.

## Rotate and revoke keys

A key can't be shown again, reactivated or extended. To replace one, create the new key, put it in your CI secret, check that a pipeline run works, then revoke the old key.

**Revoke key** stops every CLI session and pipeline that uses the key at once. Expired and revoked keys stay in the list with their status.

Owners and Admins can also revoke a member's personal keys from the Members page, and removing a member revokes theirs. The removal dialog warns when one of their keys was used in the last 7 days, because a pipeline may depend on it.
