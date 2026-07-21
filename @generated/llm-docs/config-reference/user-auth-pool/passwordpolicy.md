# PasswordPolicy API Reference

Resource type: `user-auth-pool`

## TypeScript definition

```typescript
type PasswordPolicy = {
  /** Minimum password length
The fewest characters a password can have. Longer passwords are generally more secure. */
  minimumLength?: number;
  /** Require at least one lowercase letter */
  requireLowercase?: boolean;
  /** Require at least one number */
  requireNumbers?: boolean;
  /** Require at least one symbol
Symbols are non‑alphanumeric characters such as !, @, or #. */
  requireSymbols?: boolean;
  /** Require at least one uppercase letter */
  requireUppercase?: boolean;
  /** Temporary password validity (days)
How long a temporary password issued to a new user is valid before it must be changed on first sign‑in. */
  temporaryPasswordValidityDays?: number;
};
```

## Property: `minimumLength`

- Required: no
- Type: `number`

Minimum password length

The fewest characters a password can have. Longer passwords are generally more secure.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      passwordPolicy:
        minimumLength: 12
        requireNumbers: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    passwordPolicy: {
      minimumLength: 12,
      requireNumbers: true
    }
  });
  return { resources: { userPool } };
});
```

## Property: `requireLowercase`

- Required: no
- Type: `boolean`

Require at least one lowercase letter

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      passwordPolicy:
        minimumLength: 12
        requireLowercase: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    passwordPolicy: {
      minimumLength: 12,
      requireLowercase: true
    }
  });
  return { resources: { userPool } };
});
```

## Property: `requireNumbers`

- Required: no
- Type: `boolean`

Require at least one number

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      passwordPolicy:
        minimumLength: 12
        requireNumbers: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    passwordPolicy: {
      minimumLength: 12,
      requireNumbers: true
    }
  });
  return { resources: { userPool } };
});
```

## Property: `requireSymbols`

- Required: no
- Type: `boolean`

Require at least one symbol

Symbols are non‑alphanumeric characters such as `!`, `@`, or `#`.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      passwordPolicy:
        minimumLength: 12
        requireSymbols: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    passwordPolicy: {
      minimumLength: 12,
      requireSymbols: true
    }
  });
  return { resources: { userPool } };
});
```

## Property: `requireUppercase`

- Required: no
- Type: `boolean`

Require at least one uppercase letter

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      passwordPolicy:
        minimumLength: 12
        requireUppercase: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    passwordPolicy: {
      minimumLength: 12,
      requireUppercase: true
    }
  });
  return { resources: { userPool } };
});
```

## Property: `temporaryPasswordValidityDays`

- Required: no
- Type: `number`

Temporary password validity (days)

How long a temporary password issued to a new user is valid before it must be changed on first sign‑in.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      passwordPolicy:
        minimumLength: 12
        temporaryPasswordValidityDays: 7
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    passwordPolicy: {
      minimumLength: 12,
      temporaryPasswordValidityDays: 7
    }
  });
  return { resources: { userPool } };
});
```
