# EmailConfiguration API Reference

Resource type: `user-auth-pool`

## TypeScript definition

```typescript
type EmailConfiguration = {
  /** From address */
  from?: string;
  /** Reply-to address */
  replyToEmailAddress?: string;
  /** SES identity to send emails from */
  sesAddressArn?: string;
};
```

## Property: `from`

- Required: no
- Type: `string`

From address

The email address that appears in the "From" field of messages sent by Cognito (if you're using SES).
This address must be verified in SES if you're sending through your own identity.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      emailConfiguration:
        sesAddressArn: arn:aws:ses:eu-west-1:123456789012:identity/example.com
        from: no-reply@example.com
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    emailConfiguration: {
      sesAddressArn: 'arn:aws:ses:eu-west-1:123456789012:identity/example.com',
      from: 'no-reply@example.com'
    }
  });
  return { resources: { userPool } };
});
```

## Property: `replyToEmailAddress`

- Required: no
- Type: `string`

Reply-to address

Optional address where replies to Cognito emails should be delivered.
If not set, replies go to the `from` address (or the default Cognito sender).

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      emailConfiguration:
        sesAddressArn: arn:aws:ses:eu-west-1:123456789012:identity/example.com
        from: no-reply@example.com
        replyToEmailAddress: support@example.com
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    emailConfiguration: {
      sesAddressArn: 'arn:aws:ses:eu-west-1:123456789012:identity/example.com',
      from: 'no-reply@example.com',
      replyToEmailAddress: 'support@example.com'
    }
  });
  return { resources: { userPool } };
});
```

## Property: `sesAddressArn`

- Required: no
- Type: `string`

SES identity to send emails from

ARN of an SES verified identity (email address or domain) that Cognito should use when sending emails.
Required when you want full control over sending (for example for MFA via `EMAIL_OTP`), because Cognito
must switch into `DEVELOPER` email sending mode.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      emailConfiguration:
        sesAddressArn: arn:aws:ses:eu-west-1:123456789012:identity/example.com
        from: no-reply@example.com
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    emailConfiguration: {
      sesAddressArn: 'arn:aws:ses:eu-west-1:123456789012:identity/example.com',
      from: 'no-reply@example.com'
    }
  });
  return { resources: { userPool } };
});
```
