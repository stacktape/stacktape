# Team and Access Control

The **Members** page in the Organization group of the Stacktape Console controls who has access to your organization and what they can do. Invite members, assign roles that determine each person's permissions, resend or cancel invitations, revoke API keys, and remove members when they leave. The page requires the `members:view` permission.

## Overview

The Members page lists the human members of your organization in a table with the columns Name, Email, Role, Status, Two-factor and Added, plus a row actions menu. Internal service accounts are filtered out, so you only see real members.

## Roles and permissions

Every member has a role that determines which actions they can perform. The Members page shows each member's role as a colored badge. Four permissions control the actions on this page:

| Permission | Controls |
|-----------|----------|
| `members:invite` | Inviting new members and resending invitations |
| `members:remove` | Removing members and cancelling invitations |
| `members:update-role` | Editing a member's role |
| `api-keys:revoke-all` | Revoking all of a member's API keys |

When your role has none of these permissions, the row actions menu does not appear. When it has some of them, the menu appears and the actions you lack are disabled. Admins never see the row actions menu on Owner rows, whatever their permissions.

## Walkthrough: inviting a member

1. In the Stacktape Console, open **Members** in the Organization group.
2. Click **Invite member** in the top-right corner to open the invite form.
3. Complete the form and submit the invitation.

The new member appears in the table with the status **Invited** and, when known, who invited them. Once they accept, the table shows their account status instead.

The **Invite member** button is disabled in three situations, each with its own tooltip:

- **Your role lacks the `members:invite` permission.** The tooltip reads "You do not have permission to invite members."
- **You are in a personal organization.** The tooltip explains that personal organizations do not support additional members and asks you to create another organization.
- **Your organization has reached its member limit.** The tooltip asks you to upgrade your plan.


> **Warning:** You cannot invite members to a personal (default) organization. Create another organization first, then invite your team there.


## Common tasks

### Editing a member's role

Open the member's row actions menu and choose **Edit member** to change their role. The action requires `members:update-role`.

### Removing a member

Open the member's row actions menu and choose **Remove member**. The confirmation dialog warns that the member loses access to the organization's projects immediately. For a pending invitation the action is **Cancel invitation**, which stops the invitation link from working. Both require `members:remove`.

### Resending an invitation

For a member who has not accepted yet, open the row actions menu and choose **Resend invitation**. The Added column then shows when the invitation was last sent again. The action requires `members:invite`.

### Revoking a member's API keys

Open the member's row actions menu and choose **Revoke all API keys**. The confirmation dialog states: "This will immediately invalidate all their active API keys in this organization." Once confirmed, all of that member's [API keys](/stacktape-console/api-keys) in the organization are revoked. The action requires `api-keys:revoke-all` and is not available for pending invitations.


> **Tip:** Removing a member and revoking their API keys are separate actions with separate confirmation dialogs. When offboarding a member, revoke their API keys to invalidate programmatic credentials, then remove them.


### Checking member status and two-factor authentication

Two columns describe each member's account:

- **Status** shows "Invited" for members who have not accepted their invitation. Other members show their account status: Active, Active (Google), Email not confirmed, Invitation pending, Password reset required, Archived, Compromised or Unknown.
- **Two-factor** shows "On" when the member has multi-factor authentication configured, "Off" otherwise, and "Via Google" for members who sign in only with Google. It is empty for pending invitations.

Each member manages their own password and two-factor settings. See [Account Settings](/stacktape-console/account-settings).

## Member limits

The maximum number of members depends on the organization type and subscription plan. The Console disables the **Invite member** button when the member count reaches that maximum.

Personal organizations cannot invite additional members. For other organizations, the limit depends on the subscription plan. See [Billing and Subscription](/stacktape-console/billing-and-subscription) for your plan's limits and upgrade options.

## Troubleshooting

### "You do not have permission to invite members"

Your role does not include the `members:invite` permission. Ask someone with that permission to invite the member, or someone with `members:update-role` to change your role.

### Invite button disabled in a non-personal organization

Your organization has reached the maximum member count for its subscription plan. Check [Billing and Subscription](/stacktape-console/billing-and-subscription) for your current plan and upgrade options.

### No row actions for a member

Either your role has none of the four member permissions, or you hold the Admin role and the member is an Owner.

### Member shows "Invited" for a long time

The member has not accepted the invitation. The email may have been missed or filtered. Use **Resend invitation** from the row actions menu.

### Member shows "Active (Google)"

The member signs in with Google rather than an email and password. Their Two-factor column shows "Via Google" because Google handles the second factor.

## Related features

- [Account Settings](/stacktape-console/account-settings): manage your personal account, password and two-factor authentication
- [API Keys](/stacktape-console/api-keys): create and manage API keys for CLI and CI/CD authentication
- [Organizations, Projects, and Stages](/stacktape-console/organizations-projects-and-stages): how projects and stages are organized within an organization
- [Billing and Subscription](/stacktape-console/billing-and-subscription): subscription plan and member limits
- [Guardrails](/guardrails/overview): organization-wide deployment rules
- [GitOps with Console](/ci-cd-and-gitops/gitops-with-console): automated deployments from your repositories

## FAQ

### Can an Admin remove or edit an Owner?

No. Admins do not see the row actions menu on Owner rows, regardless of their permissions.

### Is removing a member the same as revoking their API keys?

No. They are two independent actions, each with its own confirmation dialog. Removing a member removes them from the organization. Revoking API keys invalidates their programmatic credentials. For a complete offboarding, revoke the API keys, then remove the member.

### Can I enforce two-factor authentication for all members?

No. The Members page shows each member's two-factor status but has no organization-wide enforcement setting. Each member turns it on in their own [Account Settings](/stacktape-console/account-settings).

### Why is a member stuck on "Invited"?

The member has not accepted the invitation yet; the table shows their account status only after they do. If the email was missed, choose **Resend invitation** in the row actions menu.

### Why can't I invite members to my organization?

If the **Invite member** button is disabled, its tooltip names one of three reasons: your role lacks `members:invite`, you are in a personal organization, or your organization has reached its member limit. See [Billing and Subscription](/stacktape-console/billing-and-subscription) for upgrade options.

### How do I choose the right role for a member?

Assign the least-privileged role that lets the member do their job. Owners have every permission. Admins have everything except deleting the organization. Developers can deploy, delete non-production stages and manage secrets and parameters. Viewers have read-only access. To change a role, choose **Edit member** in the member's row actions menu.
