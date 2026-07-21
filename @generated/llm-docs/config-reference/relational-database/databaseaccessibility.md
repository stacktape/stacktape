# DatabaseAccessibility API Reference

Resource type: `relational-database`

## TypeScript definition

```typescript
type DatabaseAccessibility = {
  /** Controls who can connect to your database. */
  accessibilityMode: "internet" | "scoping-workloads-in-vpc" | "vpc" | "whitelisted-ips-only";
  /** Remove the database&#39;s public IP entirely (VPC-only access). */
  forceDisablePublicIp?: boolean;
  /** IP addresses or CIDR ranges allowed to connect (e.g., 203.0.113.50/32). */
  whitelistedIps?: Array<string>;
};
```

## Property: `accessibilityMode`

- Required: yes
- Type: `string: "internet" | "scoping-workloads-in-vpc" | "vpc" | "whitelisted-ips-only"`
- Default: `internet`

Controls who can connect to your database.

**`internet`** (default): Anyone with the credentials can connect. Simplest setup, great for development.
The database is still protected by username/password.
**`vpc`**: Only your app's resources (and anything in the same VPC) can connect.
You can also whitelist specific IPs (e.g., your office) using `whitelistedIps`.
**`scoping-workloads-in-vpc`**: Most restrictive. Only resources that explicitly list this
database in their `connectTo` can reach it. Best for production.
**`whitelisted-ips-only`**: Only the IP addresses you list in `whitelistedIps` can connect.

  Aurora Serverless engines only support `vpc` or `scoping-workloads-in-vpc`.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    accessibility:
      accessibilityMode: vpc
    engine:
      type: postgres
      properties:
        version: '16.6'
        primaryInstance:
          instanceSize: db.t4g.medium
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  accessibility: {
    accessibilityMode: 'vpc'
  },
  engine: {
    type: 'postgres',
    properties: {
      version: '16.6',
      primaryInstance: { instanceSize: 'db.t4g.medium' }
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `forceDisablePublicIp`

- Required: no
- Type: `boolean`

Remove the database's public IP entirely (VPC-only access).

For Aurora, this can only be set at creation time and cannot be changed later.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    accessibility:
      accessibilityMode: vpc
      forceDisablePublicIp: true
    engine:
      type: postgres
      properties:
        version: '16.6'
        primaryInstance:
          instanceSize: db.t4g.medium
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  accessibility: {
    accessibilityMode: 'vpc',
    forceDisablePublicIp: true
  },
  engine: {
    type: 'postgres',
    properties: {
      version: '16.6',
      primaryInstance: { instanceSize: 'db.t4g.medium' }
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `whitelistedIps`

- Required: no
- Type: `Array<string>`

IP addresses or CIDR ranges allowed to connect (e.g., `203.0.113.50/32`).

In `vpc`/`scoping-workloads-in-vpc`: adds external IPs on top of VPC access (e.g., your office).
In `whitelisted-ips-only`: only these IPs can connect.
No effect in `internet` mode.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    accessibility:
      accessibilityMode: whitelisted-ips-only
      whitelistedIps:
        - 203.0.113.50/32
        - 198.51.100.0/24
    engine:
      type: postgres
      properties:
        version: '16.6'
        primaryInstance:
          instanceSize: db.t4g.medium
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  accessibility: {
    accessibilityMode: 'whitelisted-ips-only',
    whitelistedIps: ['203.0.113.50/32', '198.51.100.0/24']
  },
  engine: {
    type: 'postgres',
    properties: {
      version: '16.6',
      primaryInstance: { instanceSize: 'db.t4g.medium' }
    }
  }
});
return { resources: { mainDatabase } };
});
```
