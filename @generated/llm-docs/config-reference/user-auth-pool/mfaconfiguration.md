# MfaConfiguration API Reference

Resource type: `user-auth-pool`

## TypeScript definition

```typescript
type MfaConfiguration = {
  /** Enabled MFA factor types */
  enabledTypes?: Array<"EMAIL_OTP" | "SMS" | "SOFTWARE_TOKEN">;
  /** MFA requirement

OFF: MFA is completely disabled.
ON: All users must complete MFA during sign‑in.
OPTIONAL: Users can opt in to MFA; it&#39;s recommended but not strictly required.

This value configures the Cognito MfaConfiguration property. */
  status?: "OFF" | "ON" | "OPTIONAL";
};
```

## Property: `enabledTypes`

- Required: no
- Type: `Array<string: "EMAIL_OTP" | "SMS" | "SOFTWARE_TOKEN">`

Enabled MFA factor types

Chooses which MFA methods users can use:

`SMS`: One‑time codes are sent via text message. Requires an SNS role so Cognito can send SMS.
`SOFTWARE_TOKEN`: Time‑based one‑time codes from an authenticator app.
`EMAIL_OTP`: Codes are sent by email. AWS requires that you configure a developer email sending identity
(which Stacktape does when you provide `emailConfiguration.sesAddressArn`).

These values are mapped to Cognito's `EnabledMfas` setting (`SMS_MFA`, `SOFTWARE_TOKEN_MFA`, `EMAIL_OTP`),
whose behavior is described in
[EnabledMfas in the AWS::Cognito::UserPool docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool).

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      mfaConfiguration:
        status: OPTIONAL
        enabledTypes:
          - SOFTWARE_TOKEN
          - SMS
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    mfaConfiguration: {
      status: 'OPTIONAL',
      enabledTypes: ['SOFTWARE_TOKEN', 'SMS']
    }
  });
  return { resources: { userPool } };
});
```

## Property: `status`

- Required: no
- Type: `string: "OFF" | "ON" | "OPTIONAL"`

MFA requirement

`OFF`: MFA is completely disabled.
`ON`: All users must complete MFA during sign‑in.
`OPTIONAL`: Users can opt in to MFA; it's recommended but not strictly required.

This value configures the Cognito `MfaConfiguration` property.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      mfaConfiguration:
        status: ON
        enabledTypes:
          - SOFTWARE_TOKEN
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    mfaConfiguration: {
      status: 'ON',
      enabledTypes: ['SOFTWARE_TOKEN']
    }
  });
  return { resources: { userPool } };
});
```
