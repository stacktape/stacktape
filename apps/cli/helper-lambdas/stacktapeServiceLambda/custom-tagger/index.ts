import type { NetworkInterface } from '@aws-sdk/client-ec2';
import { CreateTagsCommand, DescribeNetworkInterfacesCommand, EC2Client } from '@aws-sdk/client-ec2';
import { ChangeTagsForResourceCommand, Route53Client } from '@aws-sdk/client-route-53';
import { GetNamespaceCommand, ServiceDiscoveryClient } from '@aws-sdk/client-servicediscovery';
import { tagNames } from '@shared/naming/tag-names';
import { chunkArray } from '@shared/utils/misc';

const route53Client = new Route53Client({});
const serviceDiscoveryClient = new ServiceDiscoveryClient({});
const ec2Client = new EC2Client({});

export default async ({
  tagHostedZoneAttributedToCloudMapNamespace,
  tagNetworkInterfaceWithSecurityGroup
}: CustomTaggingScheduledRuleInput) => {
  const settledServiceDiscoveryTaggingPromises = await Promise.allSettled(
    tagHostedZoneAttributedToCloudMapNamespace.map(
      async ({ attributionCfResourceLogicalName, namespaceId, extraTags }) => {
        const { Namespace } = await serviceDiscoveryClient.send(new GetNamespaceCommand({ Id: namespaceId as string }));
        return route53Client.send(
          new ChangeTagsForResourceCommand({
            ResourceId: Namespace?.Properties.DnsProperties.HostedZoneId,
            ResourceType: 'hostedzone',
            AddTags: [
              { Key: tagNames.cfAttributionLogicalName(), Value: attributionCfResourceLogicalName },
              { Key: tagNames.stackName(), Value: process.env.STACK_NAME },
              { Key: tagNames.projectName(), Value: process.env.PROJECT_NAME },
              { Key: tagNames.stage(), Value: process.env.STAGE },
              { Key: tagNames.globallyUniqueStackHash(), Value: process.env.GLOBALLY_UNIQUE_STACK_HASH },
              ...(extraTags || [])
            ]
          })
        );
      }
    )
  );
  settledServiceDiscoveryTaggingPromises.forEach((result) => {
    if (result.status === 'rejected') {
      console.error(result.reason);
    }
  });
  const settledNetworkInterfaceTaggingPromises = await Promise.allSettled(
    tagNetworkInterfaceWithSecurityGroup.map(
      async ({ attributionCfResourceLogicalName, securityGroupId, extraTags }) => {
        const networkInterfaces: NetworkInterface[] = [];
        let nextToken: string;

        do {
          const { NetworkInterfaces, NextToken } = await ec2Client.send(
            new DescribeNetworkInterfacesCommand({
              NextToken: nextToken,
              Filters: [{ Name: 'group-id', Values: [securityGroupId as string] }]
            })
          );
          nextToken = NextToken;
          networkInterfaces.push(...NetworkInterfaces);
        } while (nextToken);
        return Promise.allSettled(
          chunkArray(networkInterfaces, 500).map((chunk) => {
            return ec2Client.send(
              new CreateTagsCommand({
                Resources: chunk.map(({ NetworkInterfaceId }) => NetworkInterfaceId),
                Tags: [
                  { Key: tagNames.cfAttributionLogicalName(), Value: attributionCfResourceLogicalName },
                  { Key: tagNames.stackName(), Value: process.env.STACK_NAME },
                  { Key: tagNames.projectName(), Value: process.env.PROJECT_NAME },
                  { Key: tagNames.stage(), Value: process.env.STAGE },
                  { Key: tagNames.globallyUniqueStackHash(), Value: process.env.GLOBALLY_UNIQUE_STACK_HASH },
                  ...(extraTags || [])
                ]
              })
            );
          })
        );
      }
    )
  );
  settledNetworkInterfaceTaggingPromises.forEach((result) => {
    if (result.status === 'rejected') {
      console.error(result.reason);
      return;
    }
    result.value.forEach((opRes) => {
      if (opRes.status === 'rejected') {
        console.error(opRes.reason);
      }
    });
  });
};
