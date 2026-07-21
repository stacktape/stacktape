# AttributeSchema API Reference

Resource type: `user-auth-pool`

## TypeScript definition

```typescript
type AttributeSchema = {
  /** Attribute data type
The value type stored for this attribute (String, Number, etc.).
This is passed to Cognito&#39;s AttributeDataType. */
  attributeDataType?: string;
  /** Developer-only attribute
If true, the attribute is only readable/writable by privileged backend code and not exposed to end users directly. */
  developerOnlyAttribute?: boolean;
  /** Mutable after sign-up
Controls whether the attribute can be changed after it has been initially set. */
  mutable?: boolean;
  /** Attribute name
The logical name of the attribute as it appears on the user (for example given_name, plan, or tenantId). */
  name?: string;
  /** Maximum numeric value */
  numberMaxValue?: number;
  /** Minimum numeric value */
  numberMinValue?: number;
  /** Required at sign-up
If true, users must supply this attribute when creating an account. */
  required?: boolean;
  /** Maximum string length */
  stringMaxLength?: number;
  /** Minimum string length */
  stringMinLength?: number;
};
```

## Property: `attributeDataType`

- Required: no
- Type: `string`

Attribute data type

The value type stored for this attribute (`String`, `Number`, etc.).
This is passed to Cognito's `AttributeDataType`.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      schema:
        - name: plan
          attributeDataType: String
          mutable: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    schema: [
      {
        name: 'plan',
        attributeDataType: 'String',
        mutable: true
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `developerOnlyAttribute`

- Required: no
- Type: `boolean`

Developer-only attribute

If true, the attribute is only readable/writable by privileged backend code and not exposed to end users directly.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      schema:
        - name: plan
          attributeDataType: String
          developerOnlyAttribute: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    schema: [
      {
        name: 'plan',
        attributeDataType: 'String',
        developerOnlyAttribute: true
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `mutable`

- Required: no
- Type: `boolean`

Mutable after sign-up

Controls whether the attribute can be changed after it has been initially set.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      schema:
        - name: plan
          attributeDataType: String
          mutable: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    schema: [
      {
        name: 'plan',
        attributeDataType: 'String',
        mutable: true
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `name`

- Required: no
- Type: `string`

Attribute name

The logical name of the attribute as it appears on the user (for example `given_name`, `plan`, or `tenantId`).

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      schema:
        - name: plan
          attributeDataType: String
          mutable: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    schema: [
      {
        name: 'plan',
        attributeDataType: 'String',
        mutable: true
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `numberMaxValue`

- Required: no
- Type: `number`

Maximum numeric value

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      schema:
        - name: seats
          attributeDataType: Number
          mutable: true
          numberMaxValue: 1000
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    schema: [
      {
        name: 'seats',
        attributeDataType: 'Number',
        mutable: true,
        numberMaxValue: 1000
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `numberMinValue`

- Required: no
- Type: `number`

Minimum numeric value

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      schema:
        - name: seats
          attributeDataType: Number
          mutable: true
          numberMinValue: 1
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    schema: [
      {
        name: 'seats',
        attributeDataType: 'Number',
        mutable: true,
        numberMinValue: 1
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `required`

- Required: no
- Type: `boolean`

Required at sign-up

If true, users must supply this attribute when creating an account.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      schema:
        - name: plan
          attributeDataType: String
          required: false
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    schema: [
      {
        name: 'plan',
        attributeDataType: 'String',
        required: false
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `stringMaxLength`

- Required: no
- Type: `number`

Maximum string length

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      schema:
        - name: plan
          attributeDataType: String
          stringMaxLength: 128
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    schema: [
      {
        name: 'plan',
        attributeDataType: 'String',
        stringMaxLength: 128
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `stringMinLength`

- Required: no
- Type: `number`

Minimum string length

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      schema:
        - name: plan
          attributeDataType: String
          stringMinLength: 1
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    schema: [
      {
        name: 'plan',
        attributeDataType: 'String',
        stringMinLength: 1
      }
    ]
  });
  return { resources: { userPool } };
});
```
