# UserVerificationMessageConfig API Reference

Resource type: `user-auth-pool`

## TypeScript definition

```typescript
type UserVerificationMessageConfig = {
  /** Email body when verifying with a code
Used when userVerificationType is email-code. The message typically contains a {####} placeholder
that Cognito replaces with a one‑time verification code. */
  emailMessageUsingCode?: string;
  /** Email body when verifying with a link
Used when userVerificationType is email-link. Cognito replaces special markers like {##verify your email##}
with a clickable URL. */
  emailMessageUsingLink?: string;
  /** Email subject when verifying with a code */
  emailSubjectUsingCode?: string;
  /** Email subject when verifying with a link */
  emailSubjectUsingLink?: string;
  /** SMS verification message */
  smsMessage?: string;
};
```

## Property: `emailMessageUsingCode`

- Required: no
- Type: `string`

Email body when verifying with a code

Used when `userVerificationType` is `email-code`. The message typically contains a `{####}` placeholder
that Cognito replaces with a one‑time verification code.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      userVerificationMessageConfig:
        emailSubjectUsingCode: Verify your Acme account
        emailMessageUsingCode: 'Your verification code is {####}.'
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    userVerificationMessageConfig: {
      emailSubjectUsingCode: 'Verify your Acme account',
      emailMessageUsingCode: 'Your verification code is {####}.'
    }
  });
  return { resources: { userPool } };
});
```

## Property: `emailMessageUsingLink`

- Required: no
- Type: `string`

Email body when verifying with a link

Used when `userVerificationType` is `email-link`. Cognito replaces special markers like `{##verify your email##}`
with a clickable URL.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-link
      userVerificationMessageConfig:
        emailSubjectUsingLink: Confirm your Acme account
        emailMessageUsingLink: 'Please click {##verify your email##} to confirm.'
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-link',
    userVerificationMessageConfig: {
      emailSubjectUsingLink: 'Confirm your Acme account',
      emailMessageUsingLink: 'Please click {##verify your email##} to confirm.'
    }
  });
  return { resources: { userPool } };
});
```

## Property: `emailSubjectUsingCode`

- Required: no
- Type: `string`

Email subject when verifying with a code

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      userVerificationMessageConfig:
        emailSubjectUsingCode: Verify your Acme account
        emailMessageUsingCode: 'Your verification code is {####}.'
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    userVerificationMessageConfig: {
      emailSubjectUsingCode: 'Verify your Acme account',
      emailMessageUsingCode: 'Your verification code is {####}.'
    }
  });
  return { resources: { userPool } };
});
```

## Property: `emailSubjectUsingLink`

- Required: no
- Type: `string`

Email subject when verifying with a link

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-link
      userVerificationMessageConfig:
        emailSubjectUsingLink: Confirm your Acme account
        emailMessageUsingLink: 'Please click {##verify your email##} to confirm.'
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-link',
    userVerificationMessageConfig: {
      emailSubjectUsingLink: 'Confirm your Acme account',
      emailMessageUsingLink: 'Please click {##verify your email##} to confirm.'
    }
  });
  return { resources: { userPool } };
});
```

## Property: `smsMessage`

- Required: no
- Type: `string`

SMS verification message

Text of the SMS Cognito sends when verifying a phone number (for example containing `{####}`).

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: sms
      userVerificationMessageConfig:
        smsMessage: 'Your Acme verification code is {####}.'
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'sms',
    userVerificationMessageConfig: {
      smsMessage: 'Your Acme verification code is {####}.'
    }
  });
  return { resources: { userPool } };
});
```
