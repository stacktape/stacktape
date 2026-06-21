# Account Settings

Account Settings in the Stacktape Console is your personal profile page. Update your full name, change your password, or enable time-based one-time password (TOTP) multi-factor authentication to secure your login. These settings apply to your individual account, not to your organization or team.


> **Info:** Account Settings controls your personal login credentials and MFA. For organization-wide user management, roles, and permissions, see [Team and access control](/stacktape-console/team-and-access-control).


## Overview

The Account Settings page in the Stacktape Console contains three independent sections: **Change full name**, **Change password**, and **Multi-factor authentication**. The full-name, password, and MFA controls are shown as separate sections. Full-name changes update the profile data in the Console; password changes sign you out after success.

Google-authenticated sessions may show Google-account guidance for password and MFA. The password form detects Google sign-in from the current Cognito username, while the MFA section shows the Google-account message when the MFA preference lookup fails because the session lacks the required scopes.

## Full name

The **Change full name** section updates the name stored on your Stacktape user profile. Enter your new name in the **Full name** field and click **Change full name**. The change takes effect immediately.

The field is pre-filled with your current name. The form requires a non-empty value — you cannot save a blank name.

## Password

The **Change password** section lets you update the password you use to sign in to the Stacktape Console. When the Console detects a Google login for the current session, this section shows a message directing you to your Google account settings instead of the password form.

### Changing your password

1. Enter your current password in the **Old password** field.
2. Enter your new password in the **New Password** field.
3. Re-enter the new password in the **Confirm new password** field.
4. Click **Change password**.

Each password field has a visibility toggle icon (show/hide) so you can verify what you've typed.

### Password requirements

Passwords changed from Account Settings must contain at least 8 characters and at least one number. Both the **New Password** and **Confirm new password** fields enforce these rules. The confirmation field also validates that both entries match.


> **Warning:** After a successful password change, the Console logs you out. You must sign in again with your new password.


## Multi-factor authentication

Multi-factor authentication (MFA) adds a second verification step when you sign in to the Stacktape Console. The Console supports TOTP-based MFA, which works with any authenticator app that generates time-based one-time passwords — Google Authenticator, Authy, Microsoft Authenticator, 1Password, and others.

When the MFA preference lookup fails because the access token lacks the required scopes (typically during Google-authenticated sessions), the MFA section shows a message directing you to enable MFA in your Google account settings instead.

### Enable MFA

1. Click **Setup MFA**. A modal opens titled "Multi-factor authentication setup".
2. **Scan the QR code** with your authenticator app. If you cannot scan the code, click the copy button next to the displayed secret key and enter it manually in your authenticator app.
3. **Enter the 6-digit code** from your authenticator app into the verification field. The code must be exactly 6 digits.
4. Click **Setup**. MFA is now active on your account.

The QR code encodes a standard TOTP URI. The entry appears in your authenticator app as "Stacktape" with your email address as the account identifier.

If the QR code fails to load (for example, due to a network issue), the modal displays a "Failed to display QR code" message. Close the modal and click **Setup MFA** again — clicking Setup MFA clears the previous local secret and calls the TOTP setup flow again.

### Disable MFA

When MFA is enabled, the section shows a **Disable MFA** button in place of the setup button. Clicking it turns off TOTP verification immediately — you will no longer need a code when signing in.


> **Warning:** Disabling MFA removes the second factor from your login. Only disable it if you plan to re-enable it with a new authenticator device or have another way to secure your account.


## Account deletion

Account deletion is not self-service. To delete your Stacktape account, contact [support@stacktape.com](mailto:support@stacktape.com).

## Troubleshooting

### Password change fails

If the password change fails, read the error message shown under the form. The old password field is required, and the new password must meet the displayed password rules (at least 8 characters and at least one number). Use the visibility toggle icon next to each field to verify what you've entered.

### MFA setup QR code does not appear

If the modal shows "Failed to display QR code," close the modal and click **Setup MFA** again. Clicking Setup MFA clears the previous local secret and starts the TOTP setup flow again.

### MFA code is rejected

TOTP codes are time-sensitive. Verify that your device clock is accurate (most phones sync automatically) and enter the current code promptly. If codes are consistently rejected, remove the Stacktape entry from your authenticator app and set up MFA again with a fresh QR code.

### Google login shows limited options

The password section detects Google sign-in from the Cognito username and displays "You are logged in with Google. To change your password, please go to your Google account settings." The MFA section shows similar guidance when the MFA preference lookup fails because the access token lacks the required scopes. This is expected — manage your password and MFA through your Google account settings.

## Related features

- [Team and access control](/stacktape-console/team-and-access-control) — manage organization members, roles, and permissions.
- [API keys](/stacktape-console/api-keys) — create API keys for CLI and CI/CD authentication.
- [Billing and subscription](/stacktape-console/billing-and-subscription) — manage your Stacktape subscription plan and invoices.

## FAQ

### How do I change my email address?

The Account Settings page does not include an email-change form. Your email is tied to your sign-in identity and cannot be changed from this page.

### Which authenticator apps work with Stacktape MFA?

Any authenticator app that supports TOTP (Time-based One-Time Password) works. Common choices include Google Authenticator, Authy, Microsoft Authenticator, and 1Password. The Console generates an `otpauth://totp` QR code, which is the standard format used by TOTP authenticator apps.

### What happens if I lose access to my authenticator app?

The Account Settings page does not provide a self-service MFA recovery flow. If you still have an active session, you can disable MFA from the Account Settings page and set it up again with a new device. If you are locked out entirely, contact your organization administrator or [support@stacktape.com](mailto:support@stacktape.com) for assistance with account deletion — there is no documented self-service recovery for a lost authenticator.

### Does changing my password log me out?

Yes. After a successful password change, the Console logs you out. You must sign in again with your new password. For API key management, see [API keys](/stacktape-console/api-keys).

### Can I be logged in with both Google and email/password?

The Console adapts what it shows based on the active session. The password form checks whether the current Cognito username starts with `Google_` — if so, it displays a message directing you to your Google account settings instead of the password fields. The MFA section shows similar Google-account guidance when the MFA preference lookup fails because the access token lacks the required scopes. When signed in with email and password, the local password and MFA forms are shown.

### Is MFA configured per user or per organization?

Account Settings configures MFA for the current user. Each team member enables or disables MFA independently from their own Account Settings page.

### What are the password requirements?

Passwords changed from Account Settings must contain at least 8 characters and at least one number. The Console validates both the new password and confirmation fields against these rules.

### How do I navigate to Account Settings?

Open Account Settings in the Stacktape Console to manage your personal credentials separately from [organization, project, and stage settings](/stacktape-console/organizations-projects-and-stages).
