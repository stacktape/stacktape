# InviteMessageConfig API Reference

Resource type: `user-auth-pool`

## TypeScript definition

```typescript
type InviteMessageConfig = {
  /** Invitation email body */
  emailMessage?: string;
  /** Invitation email subject */
  emailSubject?: string;
  /** Invitation SMS body */
  smsMessage?: string;
};
```

## Property: `emailMessage`

- Required: no
- Type: `string`

Invitation email body

The text of the email sent when an administrator creates a new user.
You can reference placeholders like `{username}` and `{####}` (temporary password or code) in the message.

### Example 1 (yaml)

```yaml
resources:
  adminPool:
    type: user-auth-pool
    properties:
      allowOnlyAdminsToCreateAccount: true
      inviteMessageConfig:
        emailSubject: Welcome to Acme
        emailMessage: 'Hi {username}, your temporary password is {####}.'
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const adminPool = new UserAuthPool({
    allowOnlyAdminsToCreateAccount: true,
    inviteMessageConfig: {
      emailSubject: 'Welcome to Acme',
      emailMessage: 'Hi {username}, your temporary password is {####}.'
    }
  });
  return { resources: { adminPool } };
});
```

## Property: `emailSubject`

- Required: no
- Type: `string`

Invitation email subject

### Example 1 (yaml)

```yaml
resources:
  adminPool:
    type: user-auth-pool
    properties:
      allowOnlyAdminsToCreateAccount: true
      inviteMessageConfig:
        emailSubject: Welcome to Acme
        emailMessage: 'Hi {username}, your temporary password is {####}.'
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const adminPool = new UserAuthPool({
    allowOnlyAdminsToCreateAccount: true,
    inviteMessageConfig: {
      emailSubject: 'Welcome to Acme',
      emailMessage: 'Hi {username}, your temporary password is {####}.'
    }
  });
  return { resources: { adminPool } };
});
```

## Property: `smsMessage`

- Required: no
- Type: `string`

Invitation SMS body

The content of the SMS message sent when new users are created with a phone number.
As with email, you can include placeholders such as `{username}` and `{####}`.

### Example 1 (yaml)

```yaml
resources:
  adminPool:
    type: user-auth-pool
    properties:
      allowOnlyAdminsToCreateAccount: true
      allowPhoneNumberAsUserName: true
      inviteMessageConfig:
        emailSubject: Welcome to Acme
        emailMessage: 'Hi {username}, your temporary password is {####}.'
        smsMessage: 'Acme login: {username} / {####}'
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const adminPool = new UserAuthPool({
    allowOnlyAdminsToCreateAccount: true,
    allowPhoneNumberAsUserName: true,
    inviteMessageConfig: {
      emailSubject: 'Welcome to Acme',
      emailMessage: 'Hi {username}, your temporary password is {####}.',
      smsMessage: 'Acme login: {username} / {####}'
    }
  });
  return { resources: { adminPool } };
});
```
