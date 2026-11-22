# MongoDB Atlas

A MongoDB Atlas cluster is a MongoDB database that MongoDB runs for you on AWS, in the region of your stack. Stacktape
creates it through your Atlas organization, gives your workloads access to it and peers it with your stack's network.

The cluster runs in MongoDB's account and you pay MongoDB, not AWS. Dedicated clusters start at M10, about $57 a month
([Atlas pricing](https://www.mongodb.com/pricing)). For a document or key-value store that costs nothing while idle and
stays in your AWS account, use [DynamoDB](/resources/databases/dynamodb).

## Basic example

Atlas clusters need API keys for your Atlas organization in `providerConfig.mongoDbAtlas`. Create a key in Atlas under
**Organization Settings → API Keys** with the Organization Project Creator role, and store the private key as a
[secret](/configuration/secrets):

```bash
stacktape secret set mongo-atlas-private-key
```


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';
export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '7.0'
  });

  return {
    providerConfig: {
      mongoDbAtlas: {
        publicKey: 'abcdef12',
        privateKey: "$Secret('mongo-atlas-private-key')",
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
      }
    },
    resources: { mainDb }
  };
});
```


The deploy creates an Atlas project for the stack, an M10 replica set with three nodes running MongoDB 7.0, and a VPC
peering connection between the project and your stack's VPC. The project is named after the stack, so you find the
cluster in the Atlas UI under that name. A new cluster takes several minutes to create.

You can also save the Atlas keys once on the **Third-party providers** page of the [Console](/stacktape-console/console-overview)
instead of adding `providerConfig` to every project.

## Connecting from workloads

Add the cluster to a workload's [`connectTo`](/configuration/connecting-resources). Stacktape injects
`STP_<NAME>_CONNECTION_STRING` (`STP_MAIN_DB_CONNECTION_STRING` here) and creates an Atlas database user for the
workload's IAM role with read and write access to every database in the cluster.


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M10'
  });
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [mainDb]
  });

  return {
    providerConfig: {
      mongoDbAtlas: {
        publicKey: 'abcdef12',
        privateKey: "$Secret('mongo-atlas-private-key')",
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
      }
    },
    resources: { mainDb, api }
  };
});
```


The connection string has no password in it. Your code signs in with the workload's AWS credentials, so tell the driver
to use AWS authentication:

```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.STP_MAIN_DB_CONNECTION_STRING!, {
  authMechanism: 'MONGODB-AWS',
  authSource: '$external'
});
const users = client.db('myapp').collection('users');
```

Mongoose takes the same two options in `connect()`. Create the client outside the handler so warm Lambda invocations
reuse the connection.

### Admin user

For your own access from a laptop or a GUI client, add an admin user. It gets the `atlasAdmin` role on this cluster.


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    adminUserCredentials: {
      userName: 'admin',
      password: "$Secret('mongo-admin-password')"
    }
  });

  return {
    providerConfig: {
      mongoDbAtlas: {
        publicKey: 'abcdef12',
        privateKey: "$Secret('mongo-atlas-private-key')",
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
      }
    },
    resources: { mainDb }
  };
});
```


If the deploy doesn't find the `mongo-admin-password` secret, it generates a random password and stores it there. Your
machine also needs network access: in the default `internet` mode it has it; in the other modes add your address to
`whitelistedIps` or tunnel through a [bastion host](/resources/security/bastion-host).

## Network access

Network settings live in `providerConfig.mongoDbAtlas.accessibility` and apply to every Atlas cluster in the stack.

| Mode | Who can connect |
|---|---|
| `internet` (default) | Anyone on the internet with valid credentials |
| `vpc` | Resources in the stack's VPC, plus `whitelistedIps` |
| `scoping-workloads-in-vpc` | Only workloads that list the cluster in `connectTo`, plus `whitelistedIps` |
| `whitelisted-ips-only` | Only the addresses in `whitelistedIps` |

In `vpc` and `scoping-workloads-in-vpc`, traffic goes over the VPC peering connection. A Lambda function that connects
to the cluster then needs `joinDefaultVpc: true`, and the deploy fails with a message saying so if it's missing.


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M10'
  });

  return {
    providerConfig: {
      mongoDbAtlas: {
        publicKey: 'abcdef12',
        privateKey: "$Secret('mongo-atlas-private-key')",
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e',
        accessibility: {
          accessibilityMode: 'scoping-workloads-in-vpc',
          whitelistedIps: ['203.0.113.4/32']
        }
      }
    },
    resources: { mainDb }
  };
});
```


## Cluster tiers

`clusterTier` sets the size and price of each node, from `M10` up to `M700`, with Low-CPU (`'M40 Low-CPU (R40)'`) and
NVMe (`'M40_NVME'`) variants from M40. Most teams start production on M10 or M20. Sharding needs M30 or larger.

MongoDB retired the shared `M2` and `M5` tiers in 2025. Stacktape still accepts the names, but Atlas no longer creates
new clusters on them, so pick M10 or larger. The free M0 tier and Flex clusters aren't available through Stacktape.

`version` is `'7.0'` by default; `'6.0'` and `'5.0'` are also accepted.

## Scaling

Set a tier range to let Atlas move the cluster between tiers as CPU and memory load changes:


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    autoScaling: {
      minClusterTier: 'M10',
      maxClusterTier: 'M40'
    }
  });

  return {
    providerConfig: {
      mongoDbAtlas: {
        publicKey: 'abcdef12',
        privateKey: "$Secret('mongo-atlas-private-key')",
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
      }
    },
    resources: { mainDb }
  };
});
```


Tier scaling is off until you set `minClusterTier` or `maxClusterTier`. The maximum caps your bill.
`disableScaleDown: true` lets the cluster grow but never shrink.

Storage grows by itself when the disk is 90% full, and never shrinks. `disableDiskScaling: true` turns that off.
`diskSizeGB` sets the starting size.

## Replication

A cluster has three electable nodes by default. The `replication` property changes the node counts:

- `numElectableNodes` (3, 5 or 7): nodes that can become primary. More nodes survive more failures.
- `numReadOnlyNodes`: extra nodes for read throughput. They never become primary.
- `numAnalyticsNodes`: nodes for long reports and aggregations, so they don't slow production queries.


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M30',
    replication: {
      numElectableNodes: 5,
      numReadOnlyNodes: 2,
      numAnalyticsNodes: 1
    }
  });

  return {
    providerConfig: {
      mongoDbAtlas: {
        publicKey: 'abcdef12',
        privateKey: "$Secret('mongo-atlas-private-key')",
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
      }
    },
    resources: { mainDb }
  };
});
```


## Backups

Backups are off by default. `enableBackups: true` takes a daily snapshot at 18:00 UTC.
`enablePointInTimeRecovery: true` adds restores to any second in the last 7 days and needs `enableBackups`. Turn both on
for production data. Restores happen in the Atlas UI.


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    enableBackups: true,
    enablePointInTimeRecovery: true
  });

  return {
    providerConfig: {
      mongoDbAtlas: {
        publicKey: 'abcdef12',
        privateKey: "$Secret('mongo-atlas-private-key')",
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
      }
    },
    resources: { mainDb }
  };
});
```


## Sharding

`numShards` above 1 splits the data across several replica sets, for write volumes or data sizes one replica set can't
handle. It needs M30 or larger and a well-chosen shard key. Most apps don't need it.


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M30',
    numShards: 3
  });

  return {
    providerConfig: {
      mongoDbAtlas: {
        publicKey: 'abcdef12',
        privateKey: "$Secret('mongo-atlas-private-key')",
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
      }
    },
    resources: { mainDb }
  };
});
```


## BI Connector

The BI Connector gives SQL clients and BI tools read access to the cluster. It uses a lot of CPU, so on M10 and M20 add
an analytics node and read from it:


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';

export default defineConfig(() => {
  const analyticsDb = new MongoDbAtlasCluster({
    clusterTier: 'M30',
    biConnector: {
      enabled: true,
      readPreference: 'analytics'
    },
    replication: {
      numAnalyticsNodes: 1
    }
  });

  return {
    providerConfig: {
      mongoDbAtlas: {
        publicKey: 'abcdef12',
        privateKey: "$Secret('mongo-atlas-private-key')",
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
      }
    },
    resources: { analyticsDb }
  };
});
```


`readPreference: 'analytics'` requires at least one analytics node.

## Dev mode

[`stacktape dev`](/local-development/dev-mode-overview) can't run Atlas locally the way it runs PostgreSQL or Redis.
See [Local databases](/local-development/local-databases).

## Configuration reference


### Definition: `MongoDbAtlasClusterProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/mongo-db-atlas-cluster` with definition name `MongoDbAtlasClusterProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `clusterTier` | yes | `string: "M10" \| "M100" \| "M140" \| "M2" \| "M20" \| "M200" \| "M200 Low-CPU (R200)" \| "M200_NVME" \| "M30" \| "M300" \| "M300 Low-CPU (R300)" \| "M40" \| "M40 Low-CPU (R40)" \| "M400" \| "M400 Low-CPU (R400)" \| "M400_NVME" \| "M40_NVME" \| "M5" \| "M50" \| "M50 Low-CPU (R50)" \| "M50_NVME" \| "M60" \| "M60 Low-CPU (R60)" \| "M60_NVME" \| "M700" \| "M700 Low-CPU (R700)" \| "M80" \| "M80 Low-CPU (R80)" \| "M80_NVME"` | - |
| `adminUserCredentials` | no | `MongoDbAdminUserCredentials` | - |
| `autoScaling` | no | `MongoDbAutoScaling` | - |
| `biConnector` | no | `MongoDbBiConnector` | - |
| `diskSizeGB` | no | `number` | - |
| `enableBackups` | no | `boolean` | - |
| `enablePointInTimeRecovery` | no | `boolean` | - |
| `numShards` | no | `number` | `1` |
| `replication` | no | `MongoDbReplication` | - |
| `version` | no | `string: "5.0" \| "6.0" \| "7.0"` | `7.0` |


## Referenceable parameters


## Referenceable Parameters: `mongo-db-atlas-cluster`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `connectionString` | Connection string (URL) that allows connecting to the cluster. | `$ResourceParam("<<resource-name>>", "connectionString")` |
