# UserPoolHooks API Reference

Resource type: `user-auth-pool`

## TypeScript definition

```typescript
type UserPoolHooks = {
  /** Create auth challenge hook
Part of Cognito&#39;s custom auth flow. This trigger is used to generate a challenge (for example sending a custom OTP)
after DefineAuthChallenge decides a challenge is needed. */
  createAuthChallenge?: string;
  /** Custom message hook
Triggered whenever Cognito is about to send an email or SMS (sign‑up, verification, password reset, etc.).
Lets you fully customize message contents or dynamically choose language/branding.
Value must be the ARN of a Lambda function configured to handle the &quot;Custom Message&quot; trigger. */
  customMessage?: string;
  /** Define auth challenge hook
Also part of the custom auth flow. It decides whether a user needs another challenge, has passed, or has failed,
based on previous challenges and responses. */
  defineAuthChallenge?: string;
  /** Post-authentication hook
Runs after a user has successfully authenticated. You can use this to record analytics, update last‑login timestamps,
or block access based on additional checks. */
  postAuthentication?: string;
  /** Post-confirmation hook
Runs right after a user confirms their account (for example via email link or admin confirmation).
This is often used to create user records in your own database or to provision resources. */
  postConfirmation?: string;
  /** Pre-authentication hook
Invoked just before Cognito validates a user&#39;s credentials. You can use this to block sign‑in attempts
based on IP, device, or user state (for example, soft‑deleting an account). */
  preAuthentication?: string;
  /** Pre-sign-up hook
Called before a new user is created. Useful for validating input, auto‑confirming trusted users,
or blocking sign‑ups that don&#39;t meet your business rules. */
  preSignUp?: string;
  /** Pre-token-generation hook
Runs right before Cognito issues tokens. Lets you customize token claims (for example, adding roles or flags)
based on external systems or additional logic. */
  preTokenGeneration?: string;
  /** User migration hook
Lets you migrate users on‑the‑fly from another user store. When someone tries to sign in but doesn&#39;t exist in Cognito,
this trigger can look them up elsewhere, import them, and let the sign‑in continue. */
  userMigration?: string;
  /** Verify auth challenge response hook
Validates the user&#39;s response to a custom challenge (for example, checking an OTP the user provides). */
  verifyAuthChallengeResponse?: string;
};
```

## Property: `createAuthChallenge`

- Required: no
- Type: `string`

Create auth challenge hook

Part of Cognito's custom auth flow. This trigger is used to generate a challenge (for example sending a custom OTP)
after `DefineAuthChallenge` decides a challenge is needed.

### Example 1 (yaml)

```yaml
resources:
  createAuthChallengeFn:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/create-auth-challenge.ts
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      hooks:
        createAuthChallenge: $ResourceParam('createAuthChallengeFn', 'arn')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const createAuthChallengeFn = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/create-auth-challenge.ts' } }
  });
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    hooks: {
      createAuthChallenge: $ResourceParam('createAuthChallengeFn', 'arn')
    }
  });
  return { resources: { createAuthChallengeFn, userPool } };
});
```

## Property: `customMessage`

- Required: no
- Type: `string`

Custom message hook

Triggered whenever Cognito is about to send an email or SMS (sign‑up, verification, password reset, etc.).
Lets you fully customize message contents or dynamically choose language/branding.

Value must be the ARN of a Lambda function configured to handle the "Custom Message" trigger.

### Example 1 (yaml)

```yaml
resources:
  customMessageFn:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/custom-message.ts
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      hooks:
        customMessage: $ResourceParam('customMessageFn', 'arn')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const customMessageFn = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/custom-message.ts' } }
  });
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    hooks: {
      customMessage: $ResourceParam('customMessageFn', 'arn')
    }
  });
  return { resources: { customMessageFn, userPool } };
});
```

## Property: `defineAuthChallenge`

- Required: no
- Type: `string`

Define auth challenge hook

Also part of the custom auth flow. It decides whether a user needs another challenge, has passed, or has failed,
based on previous challenges and responses.

### Example 1 (yaml)

```yaml
resources:
  defineAuthChallengeFn:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/define-auth-challenge.ts
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      hooks:
        defineAuthChallenge: $ResourceParam('defineAuthChallengeFn', 'arn')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const defineAuthChallengeFn = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/define-auth-challenge.ts' } }
  });
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    hooks: {
      defineAuthChallenge: $ResourceParam('defineAuthChallengeFn', 'arn')
    }
  });
  return { resources: { defineAuthChallengeFn, userPool } };
});
```

## Property: `postAuthentication`

- Required: no
- Type: `string`

Post-authentication hook

Runs after a user has successfully authenticated. You can use this to record analytics, update last‑login timestamps,
or block access based on additional checks.

### Example 1 (yaml)

```yaml
resources:
  postAuthenticationFn:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/post-authentication.ts
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      hooks:
        postAuthentication: $ResourceParam('postAuthenticationFn', 'arn')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const postAuthenticationFn = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/post-authentication.ts' } }
  });
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    hooks: {
      postAuthentication: $ResourceParam('postAuthenticationFn', 'arn')
    }
  });
  return { resources: { postAuthenticationFn, userPool } };
});
```

## Property: `postConfirmation`

- Required: no
- Type: `string`

Post-confirmation hook

Runs right after a user confirms their account (for example via email link or admin confirmation).
This is often used to create user records in your own database or to provision resources.

### Example 1 (yaml)

```yaml
resources:
  postConfirmationFn:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/post-confirmation.ts
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      hooks:
        postConfirmation: $ResourceParam('postConfirmationFn', 'arn')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const postConfirmationFn = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/post-confirmation.ts' } }
  });
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    hooks: {
      postConfirmation: $ResourceParam('postConfirmationFn', 'arn')
    }
  });
  return { resources: { postConfirmationFn, userPool } };
});
```

## Property: `preAuthentication`

- Required: no
- Type: `string`

Pre-authentication hook

Invoked just before Cognito validates a user's credentials. You can use this to block sign‑in attempts
based on IP, device, or user state (for example, soft‑deleting an account).

### Example 1 (yaml)

```yaml
resources:
  preAuthenticationFn:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/pre-authentication.ts
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      hooks:
        preAuthentication: $ResourceParam('preAuthenticationFn', 'arn')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const preAuthenticationFn = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/pre-authentication.ts' } }
  });
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    hooks: {
      preAuthentication: $ResourceParam('preAuthenticationFn', 'arn')
    }
  });
  return { resources: { preAuthenticationFn, userPool } };
});
```

## Property: `preSignUp`

- Required: no
- Type: `string`

Pre-sign-up hook

Called before a new user is created. Useful for validating input, auto‑confirming trusted users,
or blocking sign‑ups that don't meet your business rules.

### Example 1 (yaml)

```yaml
resources:
  preSignUpFn:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/pre-sign-up.ts
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      hooks:
        preSignUp: $ResourceParam('preSignUpFn', 'arn')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const preSignUpFn = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/pre-sign-up.ts' } }
  });
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    hooks: {
      preSignUp: $ResourceParam('preSignUpFn', 'arn')
    }
  });
  return { resources: { preSignUpFn, userPool } };
});
```

## Property: `preTokenGeneration`

- Required: no
- Type: `string`

Pre-token-generation hook

Runs right before Cognito issues tokens. Lets you customize token claims (for example, adding roles or flags)
based on external systems or additional logic.

### Example 1 (yaml)

```yaml
resources:
  preTokenGenerationFn:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/pre-token-generation.ts
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      hooks:
        preTokenGeneration: $ResourceParam('preTokenGenerationFn', 'arn')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const preTokenGenerationFn = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/pre-token-generation.ts' } }
  });
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    hooks: {
      preTokenGeneration: $ResourceParam('preTokenGenerationFn', 'arn')
    }
  });
  return { resources: { preTokenGenerationFn, userPool } };
});
```

## Property: `userMigration`

- Required: no
- Type: `string`

User migration hook

Lets you migrate users on‑the‑fly from another user store. When someone tries to sign in but doesn't exist in Cognito,
this trigger can look them up elsewhere, import them, and let the sign‑in continue.

### Example 1 (yaml)

```yaml
resources:
  userMigrationFn:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/user-migration.ts
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      hooks:
        userMigration: $ResourceParam('userMigrationFn', 'arn')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userMigrationFn = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/user-migration.ts' } }
  });
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    hooks: {
      userMigration: $ResourceParam('userMigrationFn', 'arn')
    }
  });
  return { resources: { userMigrationFn, userPool } };
});
```

## Property: `verifyAuthChallengeResponse`

- Required: no
- Type: `string`

Verify auth challenge response hook

Validates the user's response to a custom challenge (for example, checking an OTP the user provides).

### Example 1 (yaml)

```yaml
resources:
  verifyAuthChallengeResponseFn:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/verify-auth-challenge-response.ts
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      hooks:
        verifyAuthChallengeResponse: $ResourceParam('verifyAuthChallengeResponseFn', 'arn')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const verifyAuthChallengeResponseFn = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/verify-auth-challenge-response.ts' } }
  });
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    hooks: {
      verifyAuthChallengeResponse: $ResourceParam('verifyAuthChallengeResponseFn', 'arn')
    }
  });
  return { resources: { verifyAuthChallengeResponseFn, userPool } };
});
```
