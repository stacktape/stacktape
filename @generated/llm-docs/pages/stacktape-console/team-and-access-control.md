# Team and Access Control

The Stacktape Console Users page lets you manage who has access to your organization. Invite team members, assign roles that control what each person can view and modify, and revoke access when someone leaves. Each member has a role, and the permission system gates actions based on your own role.

## What this part of the Console does

The Users page in the Stacktape Console displays all members of your organization in a table. Each row shows a member's name, email, role (with a color-coded badge), creation date, account status, and MFA status. From this page you can invite new members, edit roles, revoke API keys, and remove members — with each action gated by your current permissions.


> Screenshot: Stacktape Console Users page showing a table of organization members with role badges, account status, MFA status, and action buttons for editing, revoking keys, and removing members Caption: The Users page lists organization members with role badges and per-member actions.


The page filters out internal service accounts automatically, showing only human team members.

## Roles and permissions

Every organization member has a role that determines which actions they can perform. Roles are displayed as labeled badges in the Users table. The permission system enforces four specific action gates visible on this page:

| Permission | Controls |
|-----------|----------|
| `members:invite` | Ability to invite new members |
| `members:remove` | Ability to remove existing members |
| `members:update-role` | Ability to edit a member's role |
| `api-keys:revoke-all` | Ability to revoke all of a member's API keys |

When your role lacks a required permission, the corresponding action button does not appear for that member's row. One additional rule is enforced in the UI: users with the Admin role cannot perform actions on members who hold the Owner role.


> **Info:** The full list of roles and their associated permissions is enforced server-side. The Users page surfaces these four action-level permissions to control what you see and can do on this page.


## Walkthrough: inviting a team member

1. In the Stacktape Console, navigate to the **Users** page for your organization.
2. Click the **Invite new member** button in the top-right area.
3. Complete the fields in the invite form that opens.
4. Submit the form. The new member appears in the table with status "Invited" until they confirm their account via the email invitation.

The **Invite new member** button is disabled in three situations:

- You are viewing a personal (default) organization — personal organizations do not support additional members.
- Your organization has reached its maximum member count for the current subscription plan.
- Your role does not include the `members:invite` permission.


> **Warning:** You cannot invite members to a personal (default) organization. Create a named organization first, then invite your team there.


## Common tasks

### Editing a member's role

When your role includes the `members:update-role` permission, an edit button appears next to eligible members in the Users table. Clicking it opens the update form where you can change the member's role. Admin users do not see this action on Owner members.

### Removing a member

When your role includes the `members:remove` permission, a delete button appears next to eligible members. Clicking it opens a confirmation dialog showing the member's name and current role. Confirming immediately removes the member from the organization.

### Revoking a member's API keys

When your role includes the `api-keys:revoke-all` permission, a key-revoke button appears next to eligible members. Clicking it opens a confirmation dialog stating: "This will immediately invalidate all their active API keys in this organization." Once confirmed, revocation takes effect immediately.


> **Tip:** Revoking API keys and removing a member are separate actions. If you need to fully offboard someone, perform both actions — removing alone does not guarantee their [API keys](/stacktape-console/api-keys) stop working.


### Checking member status and MFA

The Users table shows two status-related columns:

- **Status** — displays "Invited" for members who have not yet confirmed their account. Confirmed members show their account state (Confirmed, External provider, etc.).
- **MFA** — shows "External" for members authenticated solely through an external identity provider, "Enabled" for those with multi-factor authentication configured, or "Disabled" otherwise. Unconfirmed members always show "Disabled".

You cannot force MFA from this page — each member enables it in their own account settings.

## Member limits

The maximum number of members you can invite depends on your organization's subscription plan. The `Invite new member` button becomes disabled when your organization has reached its computed limit.

If you see the disabled tooltip message "You can not invite more members to this organization. To invite more, upgrade your plan," visit [Billing and Subscription](/stacktape-console/billing-and-subscription) to upgrade.

## Troubleshooting

### "You do not have permission to invite members"

Your role does not include the `members:invite` permission. Ask an Owner or Admin in your organization to either invite the member for you or update your role.

### Invite button disabled on a non-personal organization

Your organization has reached the maximum member count for its subscription plan. Check [Billing and Subscription](/stacktape-console/billing-and-subscription) to see your current plan and upgrade options.

### Member shows "Invited" status indefinitely

The invited member has not confirmed their account yet. They need to check their email for the invitation and complete the sign-up flow. If the invitation email was lost, remove them and send a new invitation.

### No action buttons visible for a member

This happens for two reasons: either your role lacks the relevant permissions (`members:update-role`, `members:remove`, `api-keys:revoke-all`), or you hold the Admin role and the target member is an Owner. Only Owners can perform actions on other Owner-role members.

### Member shows "External provider" status

This member authenticated through an external identity provider (such as SSO) rather than a direct email/password account. Their MFA column shows "External" because authentication is managed by the identity provider.

## Related features

- [API Keys](/stacktape-console/api-keys) — create and manage API keys for CLI and CI/CD authentication.
- [Organizations, Projects, and Stages](/stacktape-console/organizations-projects-and-stages) — understand how projects and stages are organized within an organization.
- [Billing and Subscription](/stacktape-console/billing-and-subscription) — manage your subscription plan and member limits.
- [Guardrails](/guardrails/overview) — set organization-wide deployment rules that apply to all members.
- [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) — configure automated deployments that respect the same permission model.

## FAQ

### What roles are available in Stacktape?

The Users page displays role labels as color-coded badges for each member. The available roles and their full permission sets are enforced server-side. From the Console UI, you can observe that Admin-role users cannot act on Owner-role members, indicating a hierarchy. The exact capabilities of each role are applied through the permission system when you interact with various Console features.

### How do I invite someone to my organization?

Navigate to the Users page and click **Invite new member**. The button opens an invite form. The button is only active when your role has the `members:invite` permission, you are not on a personal organization, and your organization has not reached its member limit. See [Billing and Subscription](/stacktape-console/billing-and-subscription) if you need to increase your limit.

### Can an Admin remove an Owner?

No. The Console UI prevents Admin-role users from performing any actions (edit, remove, revoke keys) on Owner-role members. Only another Owner can manage Owner members.

### What happens when I revoke someone's API keys?

All their active [API keys](/stacktape-console/api-keys) in the organization are immediately invalidated. Any CLI sessions or CI/CD pipelines using those keys will fail on the next request. This is useful when offboarding a team member or responding to a compromised credential.

### Is removing a member the same as revoking their API keys?

No — these are separate actions on the Users page. Removing a member revokes their Console access. Revoking API keys invalidates their programmatic credentials. For complete offboarding, consider doing both.

### How many members can I add to my organization?

Member limits depend on your subscription plan type. The Console computes the maximum based on whether the organization is personal and its plan type. When the limit is reached, the Invite button becomes disabled with a message directing you to upgrade. Check [Billing and Subscription](/stacktape-console/billing-and-subscription) for your plan's specifics.

### Does Stacktape support external identity providers?

The Users page shows "External provider" as the account status for members who authenticated through an external identity provider, and their MFA column shows "External." This indicates external identity provider support is available. Contact Stacktape for details on configuring it for your organization.

### Can I enforce MFA for all organization members?

The Users page displays each member's MFA status but does not offer an organization-wide enforcement toggle. Each member enables MFA in their own account settings. If you use an external identity provider, MFA enforcement can be managed at the provider level.

### Where can I see who deployed what?

The Activity page in the Stacktape Console shows a log of CLI operations (deploys, deletes, scripts, and other recorded commands) across your organization, attributed to the member who ran them. This helps track deployment history and accountability.
