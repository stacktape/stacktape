import type { CloudFormationCustomResourceHandler, CloudFormationCustomResourceUpdateEvent } from 'aws-lambda';
import { respondToCloudformation } from '@shared/aws/cloudformation';
import { getAwsSdkManager } from '../utils';
import { assetReplacer } from './resolvers/asset-replacer';
import { setDatabaseDeletionProtection } from './resolvers/database-deletion-protection';
import { defaultDomain } from './resolvers/default-domain';
import { defaultDomainCert } from './resolvers/default-domain-cert';
import { disableEcsManagedTerminationProtection } from './resolvers/disable-ecs-managed-termination-protection';
import { edgeFunctions } from './resolvers/edge-functions';
import { edgeLambda } from './resolvers/edge-lambda';
import { edgeLambdaBucket } from './resolvers/edge-lambda-bucket';
import { forceDeleteAsg } from './resolvers/force-delete-asg';
import { openSearch } from './resolvers/open-search';
import { publishLambdaVersion } from './resolvers/publish-lambda-version';
import { s3Events } from './resolvers/s3-event';
import { scriptFunction } from './resolvers/script-function';
import { sensitiveData } from './resolvers/sensitive-data';
import { ssmParameterRetrieve } from './resolvers/ssm-parameter-retrieve';
import { userPoolDetails } from './resolvers/user-pool-details';
import { acceptVpcPeeringConnections } from './resolvers/vpc-peering-connections';
import { webAppFirewall } from './resolvers/web-app-firewall';

const resolversMap: {
  [_customResourceType in keyof StpServiceCustomResourceProperties]: ServiceLambdaResolver<any>;
} = {
  s3Events,
  // @ deprecated - use edgeLambda instead
  edgeFunctions,
  acceptVpcPeeringConnections,
  setDatabaseDeletionProtection,
  sensitiveData,
  scriptFunction,
  publishLambdaVersion,
  webAppFirewall,
  openSearch,
  forceDeleteAsg,
  disableEcsManagedTerminationProtection,
  defaultDomainCert,
  defaultDomain,
  edgeLambda,
  edgeLambdaBucket,
  assetReplacer,
  userPoolDetails,
  ssmParameterRetrieve
};

const handler: CloudFormationCustomResourceHandler = async (event, context) => {
  let error: any;
  let data: { [dataKey: string]: string } = {};
  let physicalResourceId: string;
  let chainInvocation = false;
  const { attempt = 1 } = event as CloudFormationCustomResourceUpdateEvent & { attempt?: number };
  try {
    const currentResourceProperties = event.ResourceProperties as StpServiceCustomResourceProperties;
    const previousResourceProperties = (event as CloudFormationCustomResourceUpdateEvent)
      .OldResourceProperties as StpServiceCustomResourceProperties;

    const detectedResolvers = new Set<string>();

    Object.keys(resolversMap).forEach((propertyName) => {
      if (currentResourceProperties?.[propertyName] || previousResourceProperties?.[propertyName]) {
        detectedResolvers.add(propertyName);
      }
    });

    if (detectedResolvers.size !== 1) {
      throw new Error(
        `Each stacktape custom resource can target only one resolver. This custom resource targets resolvers: ${Array.from(
          detectedResolvers
        )
          .map((resolverName) => `"${resolverName}"`)
          .join(', ')}`
      );
    }

    const resolverName = Array.from(detectedResolvers)[0] as keyof StpServiceCustomResourceProperties;
    const resolver = resolversMap[resolverName];

    if (!(event.RequestType === 'Create' || event.RequestType === 'Update' || event.RequestType === 'Delete')) {
      throw new Error(`Unsupported custom resource operation: '${(event as any).RequestType}'.`);
    }

    ({ data, physicalResourceId, chainInvocation } = await resolver(
      currentResourceProperties?.[resolverName],
      previousResourceProperties?.[resolverName],
      event.RequestType,
      (event as CloudFormationCustomResourceUpdateEvent).PhysicalResourceId,
      context
    ));

    if (chainInvocation) {
      console.info('Resolver returned chainInvocation. Attempting to run chained lambda...');
      if (attempt >= 4) {
        console.error('Cannot chain invocation as maximum number of attempts have been reached (4).');
        throw new Error('Creation of custom resource timed out. No more chaining possible.');
      }
      const awsSdkManager = await getAwsSdkManager();
      const payload: CloudFormationCustomResourceUpdateEvent & { attempt: number } = {
        ...(event as CloudFormationCustomResourceUpdateEvent),
        PhysicalResourceId: physicalResourceId || (event as CloudFormationCustomResourceUpdateEvent).PhysicalResourceId,
        attempt: attempt + 1
      };
      await awsSdkManager.invokeLambdaFunction({
        lambdaResourceName: context.functionName,
        payload,
        asynchronous: true
      });
      console.info('Chained lambda started successfully');
      // return without responding to cloudformation
      return;
    }
  } catch (err) {
    console.error(err);
    error = err;
  }

  await respondToCloudformation({
    event,
    logGroupName: context.logGroupName,
    data,
    physicalResourceId,
    error
  });
  // url: event.ResponseURL,
  // responseBody: {
  //   LogicalResourceId: event.LogicalResourceId,
  //   PhysicalResourceId: physicalResourceId || 'stpservicecustomresource',
  //   RequestId: event.RequestId,
  //   StackId: event.StackId,
  //   Status: error ? 'FAILED' : 'SUCCESS',
  //   // maximum size for reason is 4k therefore we truncate error response
  //   Reason: error
  //     ? `\n${`${error}`.slice(0, 800)}\n\nSee custom resource logs at:\n${consoleLinks.logGroup(
  //         process.env.AWS_REGION,
  //         context.logGroupName
  //       )}`
  //     : 'Custom resource success',
  //   Data: data || {}
  // }
};

// const respondToCloudformation = async ({
//   url,
//   responseBody
// }: {
//   url: string;
//   responseBody: CloudFormationCustomResourceResponse;
// }) => {
//   const stringifiedBody = JSON.stringify(responseBody);
//   return fetch(url, {
//     headers: { 'content-length': `${stringifiedBody.length}` },
//     method: 'PUT',
//     body: stringifiedBody
//   });
// };

export default handler;
