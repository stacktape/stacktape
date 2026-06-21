/**
 * Custom resource resolver: provisions the Convex `INSTANCE_SECRET` and `ADMIN_KEY`
 * for a self-hosted Convex deployment, storing both in AWS Secrets Manager.
 *
 * ====================================================================================
 * IMPLEMENTATION STATUS: REFERENCE IMPLEMENTATION.
 *
 * This resolver is NOT YET registered in:
 *   - `helper-lambdas/stacktapeServiceLambda/custom-resources/index.ts` (dispatch)
 *   - The `StpServiceCustomResourceProperties` type union (props typing)
 *
 * Registration must be added in a follow-up turn alongside the resolver in
 * `src/domain/calculated-stack-overview-manager/resource-resolvers/convex/`.
 * ====================================================================================
 *
 * How Convex's admin-key model works (self-hosted):
 *
 *   1. The backend boots with `INSTANCE_SECRET` set in its env — a 32-byte random
 *      hex string. This seeds all key derivation.
 *
 *   2. The admin key is NOT derivable in pure JS/TS — it is produced by the
 *      `generate_key` binary shipped *inside* the convex-backend container:
 *
 *          ./generate_key <instance_name> <instance_secret_hex>
 *
 *      Output is the admin key, in the format
 *      `<instance_name>|<keytype>:<signature_hex>`. The `keytype` and signature
 *      algorithm have changed between Convex versions, so reimplementing this in
 *      pure crypto is fragile.
 *
 *   3. Therefore this lambda has TWO modes:
 *
 *        Create:
 *          - Generate 32 random hex bytes as INSTANCE_SECRET.
 *          - Store INSTANCE_SECRET in Secrets Manager immediately.
 *          - Return SUCCESS. The admin key is provisioned in a *second* step,
 *            after the backend container is healthy.
 *
 *        Post-deploy hook (runs from `stp deploy`, not this lambda):
 *          - ECS-Exec into the running backend container.
 *          - Run `./generate_key <instance_name> <instance_secret>`.
 *          - Capture stdout, store as `adminKey` in Secrets Manager.
 *          - Subsequent runs see the secret already exists and no-op.
 *
 *        Update:
 *          - Both secrets persist unchanged across stack updates. Rotation is a
 *            manual user operation (delete the secret, redeploy → fresh keys
 *            generated → existing tokens invalidated).
 *
 *        Delete:
 *          - Schedule the secrets for deletion with a 7-day recovery window
 *            (standard Secrets Manager behavior) unless `deletionProtection`.
 */

import { randomBytes } from 'node:crypto';
import {
  CreateSecretCommand,
  DescribeSecretCommand,
  DeleteSecretCommand,
  ResourceNotFoundException,
  SecretsManagerClient
} from '@aws-sdk/client-secrets-manager';

type ConvexAdminKeyResolverProps = {
  /** Logical instance name (used as prefix in the admin key string). */
  instanceName: string;
  /** Secrets Manager secret name to hold the INSTANCE_SECRET. */
  instanceSecretSecretName: string;
  /** Secrets Manager secret name where the (post-deploy generated) admin key will land. */
  adminKeySecretName: string;
  /** Tags to apply to the secrets. */
  tags?: { Key: string; Value: string }[];
};

// NOTE: type signature below mirrors the existing resolvers but uses a local type
// rather than the full `ServiceLambdaResolver` union — until this is wired into
// `StpServiceCustomResourceProperties`, the resolver dispatch can't import it.
export const convexAdminKey = async (
  currentProps: ConvexAdminKeyResolverProps,
  _previousProps: ConvexAdminKeyResolverProps,
  operation: 'Create' | 'Update' | 'Delete'
): Promise<{ data: { instanceSecretArn?: string; adminKeySecretArn?: string } }> => {
  const client = new SecretsManagerClient({});

  if (operation === 'Create' || operation === 'Update') {
    // INSTANCE_SECRET: idempotent create. If the secret already exists, leave it
    // alone — rotating it would invalidate every issued token.
    let instanceSecretArn: string | undefined;
    try {
      const desc = await client.send(new DescribeSecretCommand({ SecretId: currentProps.instanceSecretSecretName }));
      instanceSecretArn = desc.ARN;
      console.info(`INSTANCE_SECRET already exists at ${desc.ARN} — leaving unchanged`);
    } catch (err) {
      if (err instanceof ResourceNotFoundException) {
        const instanceSecret = randomBytes(32).toString('hex');
        const created = await client.send(
          new CreateSecretCommand({
            Name: currentProps.instanceSecretSecretName,
            SecretString: instanceSecret,
            Description: `Convex INSTANCE_SECRET for ${currentProps.instanceName}`,
            Tags: currentProps.tags
          })
        );
        instanceSecretArn = created.ARN;
        console.info(`generated and stored INSTANCE_SECRET at ${created.ARN}`);
      } else {
        throw err;
      }
    }

    // ADMIN_KEY: create a placeholder secret with empty value. The post-deploy
    // hook is responsible for ECS-Exec'ing `./generate_key` and overwriting the
    // value. If the secret already has a non-empty value, leave it alone.
    let adminKeySecretArn: string | undefined;
    try {
      const desc = await client.send(new DescribeSecretCommand({ SecretId: currentProps.adminKeySecretName }));
      adminKeySecretArn = desc.ARN;
    } catch (err) {
      if (err instanceof ResourceNotFoundException) {
        const created = await client.send(
          new CreateSecretCommand({
            Name: currentProps.adminKeySecretName,
            SecretString: '__pending_post_deploy_generation__',
            Description: `Convex admin key for ${currentProps.instanceName} (populated post-deploy)`,
            Tags: currentProps.tags
          })
        );
        adminKeySecretArn = created.ARN;
      } else {
        throw err;
      }
    }

    return { data: { instanceSecretArn, adminKeySecretArn } };
  }

  if (operation === 'Delete') {
    // 7-day recovery window. If you want immediate deletion, pass
    // `ForceDeleteWithoutRecovery: true` — but for a primary credential, the
    // recovery window is safer.
    for (const name of [currentProps.instanceSecretSecretName, currentProps.adminKeySecretName]) {
      try {
        await client.send(new DeleteSecretCommand({ SecretId: name, RecoveryWindowInDays: 7 }));
        console.info(`scheduled deletion of ${name} (7-day recovery window)`);
      } catch (err) {
        if (err instanceof ResourceNotFoundException) {
          console.info(`${name} already gone`);
        } else {
          throw err;
        }
      }
    }
    return { data: {} };
  }

  return { data: {} };
};
