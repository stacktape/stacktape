import { CliError } from '@utils/errors';

const configError = (code: string, message: string, hints: string) =>
  new CliError({ category: 'CONFIG_VALIDATION', code, message, hints });

export const vpcErrors = {
  reuseTargetNotFound: (vpcReference: string) =>
    configError(
      'VPC_REUSE_TARGET_NOT_FOUND',
      `Stacktape cannot reuse VPC \`${vpcReference}\` because no valid VPC was found.`,
      'You can reuse a VPC by ID or from another deployed Stacktape stack.'
    ),

  publicSubnetsInsufficient: ({ vpcId, foundCount }: { vpcId: string; foundCount: number }) =>
    configError(
      'VPC_PUBLIC_SUBNETS_INSUFFICIENT',
      `VPC \`${vpcId}\` has ${foundCount} public subnet${foundCount === 1 ? '' : 's'}; at least 3 are required.`,
      'A public subnet must have a `0.0.0.0/0` route to an Internet Gateway (`igw-*`) in its associated route table.'
    ),

  cidrNotPrivate: ({ vpcId, cidrBlock }: { vpcId: string; cidrBlock: string }) =>
    configError(
      'VPC_CIDR_NOT_PRIVATE',
      `VPC \`${vpcId}\` uses CIDR block \`${cidrBlock}\`, which is not an RFC 1918 private range.`,
      'Use an address in `10.0.0.0/8`, `172.16.0.0/12`, or `192.168.0.0/16`.'
    ),

  privateSubnetsInsufficient: ({
    vpcId,
    foundCount,
    requiringResources
  }: {
    vpcId: string;
    foundCount: number;
    requiringResources: string[];
  }) =>
    configError(
      'VPC_PRIVATE_SUBNETS_INSUFFICIENT',
      `VPC \`${vpcId}\` has ${foundCount} private subnet${foundCount === 1 ? '' : 's'}; at least 2 are required when resources use \`usePrivateSubnetsWithNAT\`.`,
      `These resources require private subnets: ${requiringResources.map((resourceName) => `\`${resourceName}\``).join(', ')}. A private subnet must not have a direct route to an Internet Gateway.`
    )
};
