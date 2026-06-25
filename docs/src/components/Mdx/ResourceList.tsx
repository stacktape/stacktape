import { createElement } from 'react';
import {
  ArchitectureServiceAmazonAPIGateway,
  ArchitectureServiceAmazonCognito,
  ArchitectureServiceAmazonDynamoDB,
  ArchitectureServiceAmazonElastiCache,
  ArchitectureServiceAmazonRDS,
  ArchitectureServiceAmazonSimpleNotificationService,
  ArchitectureServiceAmazonSimpleQueueService,
  ArchitectureServiceAWSBatch,
  ArchitectureServiceAWSFargate,
  ArchitectureServiceAWSStepFunctions,
  ArchitectureServiceElasticLoadBalancing,
  ResourceAmazonCloudFrontFunctions,
  ResourceAmazonEC2Instance,
  ResourceAmazonElastiCacheElastiCacheforRedis,
  ResourceAmazonEventBridgeEvent,
  ResourceAmazonRoute53ResolverDNSFirewall,
  ResourceAmazonSimpleStorageServiceS3Standard,
  ResourceAmazonWorkSpacesFamilyAmazonWorkSpaces,
  ResourceAWSLambdaLambdaFunction
} from 'aws-react-icons';
import { capitalCase } from 'change-case';
import { Img as Image } from '@/components/Img';
import { BiAtom } from 'react-icons/bi';
import resources from '../../../.resources.json';
import MongoDbIconSvg from '../../assets/technology-icons/mongodb.svg';
import NextJsIconSvg from '../../assets/technology-icons/nextjs-icon-dark-bg.svg';
import UpstashIconSvg from '../../assets/technology-icons/upstash-icon-dark-bg.svg';
import { GridList } from '../Misc/GridList';
import { NavBox } from './DeploymentOptions';

const getPrettyResourceName = (resourceName: string) => {
  return capitalCase(resourceName)
    .replaceAll(' Db', 'Db')
    .replace('Sqs', 'SQS')
    .replace('Sns', 'SNS')
    .replace('Aws Cdk', 'AWS CDK')
    .replace('Relational Database', 'SQL database')
    .replace('Open Search Domain', 'OpenSearch (Elastic)')
    .replace('Bastion', 'Bastion (Jump Host)')
    .replace('Event Bus', 'Event Bus (EventBridge)')
    .replace('State Machine', 'State Machine')
    .replace('Application Load', 'Load');
};

export const referenceableParams = resources
  .map(({ resourceType, referenceableParams }) => {
    return Object.entries(referenceableParams).map(([paramName, paramDescription]) => {
      if (paramName === '_hasCdn') {
        return null;
      }
      return { resourceType, paramName, paramDescription };
    });
  })
  .flat()
  .filter(Boolean) as {
  resourceType: string;
  paramName: string;
  paramDescription: string;
}[];

function AwsFargate({ size }) {
  return (
    <ArchitectureServiceAWSFargate
      className="m-[-6px] [&_path:first-of-type]:fill-transparent [&_path:nth-of-type(2)]:fill-aws-compute"
      size={size + 12}
    />
  );
}

const resourceIcons: { [resourceType: string]: any } = {
  bucket: ({ size }) => (
    <ResourceAmazonSimpleStorageServiceS3Standard
      className="m-[-3px] [&_path]:fill-aws-storage"
      size={size + 2}
    />
  ),
  'hosting-bucket': ({ size }) => (
    <ResourceAmazonWorkSpacesFamilyAmazonWorkSpaces
      className="m-[-3px] [&_path]:fill-aws-storage"
      size={size + 2}
    />
  ),
  function: ({ size }) => (
    <ResourceAWSLambdaLambdaFunction
      className="m-[-3px] [&_path]:fill-aws-compute"
      size={size + 2}
    />
  ),
  'web-service': AwsFargate,
  'private-service': AwsFargate,
  'worker-service': AwsFargate,
  'multi-container-workload': AwsFargate,
  'application-load-balancer': ({ size }) => (
    <ArchitectureServiceElasticLoadBalancing
      className="m-[-6px] [&_path:first-of-type]:fill-transparent [&_path:nth-of-type(2)]:fill-aws-network"
      size={size + 12}
    />
  ),
  'aws-cdk-construct': null,
  'batch-job': ({ size }) => (
    <ArchitectureServiceAWSBatch
      className="m-[-6px] [&_path:first-of-type]:fill-transparent [&_path:nth-of-type(2)]:fill-aws-compute"
      size={size + 12}
    />
  ),
  'deployment-script': null,
  'dynamo-db-table': ({ size }) => (
    <ArchitectureServiceAmazonDynamoDB
      className="m-[-6px] [&_path:first-of-type]:fill-transparent [&_path:nth-of-type(2)]:fill-aws-database"
      size={size + 12}
    />
  ),
  'edge-lambda-function': ({ size }) => (
    <ResourceAmazonCloudFrontFunctions
      className="m-[-3px] [&_path]:fill-aws-compute"
      size={size + 2}
    />
  ),
  'event-bus': ({ size }) => (
    <ResourceAmazonEventBridgeEvent
      className="m-[-3px] [&_path]:fill-aws-integration"
      size={size + 2}
    />
  ),
  'http-api-gateway': ({ size }) => (
    <ArchitectureServiceAmazonAPIGateway
      className="m-[-6px] [&_path:first-of-type]:fill-transparent [&_path:nth-of-type(2)]:fill-aws-network"
      size={size + 12}
    />
  ),
  'mongo-db-atlas-cluster': ({ size }) => (
    <Image className="p-0" width={size} height={size} src={MongoDbIconSvg} alt="mongo-db-icon" />
  ),
  'nextjs-web': ({ size }) => (
    <Image className="p-0" width={size} height={size} src={NextJsIconSvg} alt="nextjs-icon" />
  ),
  'open-search-domain': ({ size }) => (
    <ArchitectureServiceAmazonElastiCache
      className="m-[-6px] [&_path:first-of-type]:fill-transparent [&_path:nth-of-type(2)]:fill-aws-database"
      size={size + 12}
    />
  ),
  'redis-cluster': ({ size }) => (
    <ResourceAmazonElastiCacheElastiCacheforRedis
      className="m-[-3px] [&_path]:fill-aws-database"
      size={size + 2}
    />
  ),
  'relational-database': ({ size }) => (
    <ArchitectureServiceAmazonRDS
      className="m-[-6px] [&_path:first-of-type]:fill-transparent [&_path:nth-of-type(2)]:fill-aws-database"
      size={size + 12}
    />
  ),
  'sns-topic': ({ size }) => (
    <ArchitectureServiceAmazonSimpleNotificationService
      className="m-[-6px] [&_path:first-of-type]:fill-transparent [&_path:nth-of-type(2)]:fill-aws-integration"
      size={size + 12}
    />
  ),
  'sqs-queue': ({ size }) => (
    <ArchitectureServiceAmazonSimpleQueueService
      className="m-[-6px] [&_path:first-of-type]:fill-transparent [&_path:nth-of-type(2)]:fill-aws-integration"
      size={size + 12}
    />
  ),
  'state-machine': ({ size }) => (
    <ArchitectureServiceAWSStepFunctions
      className="m-[-6px] [&_path:first-of-type]:fill-transparent [&_path:nth-of-type(2)]:fill-aws-integration"
      size={size + 12}
    />
  ),
  'upstash-redis': ({ size }) => (
    <Image className="p-0" width={size} height={size} src={UpstashIconSvg} alt="upstash-icon" />
  ),
  'user-auth-pool': ({ size }) => (
    <ArchitectureServiceAmazonCognito
      className="m-[-6px] [&_path:first-of-type]:fill-transparent [&_path:nth-of-type(2)]:fill-aws-security"
      size={size + 12}
    />
  ),
  'web-app-firewall': ({ size }) => (
    <ResourceAmazonRoute53ResolverDNSFirewall
      className="m-[-3px] [&_path]:fill-aws-security"
      size={size + 2}
    />
  ),
  'custom-resource-definition': null,
  'custom-resource-instance': null,
  bastion: ResourceAmazonEC2Instance
};

export const allResources = resources.map(({ resourceType, category }) => {
  return {
    type: resourceType,
    prettyType: getPrettyResourceName(resourceType),
    category,
    icon: ({ size }) => (resourceIcons[resourceType] ? resourceIcons[resourceType]({ size }) : <BiAtom size={size} />)
  };
});

export function ResourceList() {
  return (
    <GridList minItemWidth="422px" className="mt-5 max-[650px]:block max-[650px]:w-full">
      {allResources
        .filter(
          (resource) =>
            !['custom-resource-definition', 'custom-resource-instance', 'aws-cdk-construct'].includes(resource.type)
        )
        .map((resource) => (
          <NavBox
            key={resource.type}
            icon={createElement(resource.icon, { size: 28 })}
            text={resource.prettyType}
            url={`${resource.category}s/${resource.type}${resource.type.endsWith('s') ? 'es' : 's'}`}
          />
        ))}
    </GridList>
  );
}
