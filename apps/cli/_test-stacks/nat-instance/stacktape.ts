/**
 * Disposable real-AWS fixture for `scripts/real-aws/nat-instance-canary.ts`: one Node.js function in the VPC, whose
 * only way to the internet is the stack's NAT instances (`stackConfig.nat: ha-ec2`, one per zone in two
 * zones). The function returns the public IP it left through, which names the zone that served it.
 *
 * The canary sets the environment variables below (`STP_AWS_NAT_CANARY_NAT` picks `gateway`, `ha-ec2` or `ec2` for the
 * kind-switch scenario); the defaults only keep the file loadable on its own.
 */
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from '@stacktape/config-authoring';

export default defineConfig(() => {
  const canaryOwner = process.env.STP_AWS_NAT_CANARY_OWNER ?? 'local';
  const instanceSize = process.env.STP_AWS_NAT_CANARY_INSTANCE_SIZE ?? 't4g.nano';
  const natKind = process.env.STP_AWS_NAT_CANARY_NAT ?? 'ha-ec2';
  const nat =
    natKind === 'gateway'
      ? ({ type: 'gateway', availabilityZones: 2 } as const)
      : natKind === 'ec2'
        ? ({ type: 'ec2', instanceSize } as const)
        : ({ type: 'ha-ec2', availabilityZones: 2, instanceSize } as const);
  const egress = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/egress.ts' }),
    joinDefaultVpc: true,
    memory: 128,
    timeout: 10
  });

  return {
    resources: { egress },
    stackConfig: {
      nat,
      tags: [{ name: 'stacktape-canary-owner', value: canaryOwner }]
    }
  };
});
