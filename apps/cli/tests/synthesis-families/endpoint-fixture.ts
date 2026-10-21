import {
  AppSyncApi,
  AppSyncApiIntegration,
  LambdaFunction,
  JsBundleLambdaPackaging,
  defineConfig
} from '@stacktape/config-authoring';
import type { CloudFormationTemplate, KnownCloudFormationResource } from '@stacktape/cloudformation/resource';
import { join } from 'node:path';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

export const ENDPOINT_CUSTOM_DOMAIN = 'api.example.com';
/** An absolute RFC 3339 timestamp 30 days out, without milliseconds; AppSync rounds key expiry down to the hour. */
export const ENDPOINT_API_KEY_EXPIRES_AT = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .replace(/\.\d{3}Z$/, 'Z');
export const ENDPOINT_CUSTOM_CERTIFICATE_ARN = 'arn:aws:acm:us-east-1:123456789999:certificate/endpoint-fixture';

/**
 * The real endpoint family, with packaging replaced by inline code so this lane owns only routing and permissions.
 * `customDomain` attaches a customer-managed certificate without DNS records, so no domain lookup is needed; the live
 * canary never enables it.
 */
export const synthesizeAppSyncEndpoint = async ({
  accountId = '123456789999',
  authentication = 'aws-iam',
  customDomain = false,
  projectName = 'endpoint',
  region = 'eu-west-1'
}: {
  accountId?: string;
  authentication?: 'aws-iam' | 'api-key';
  customDomain?: boolean;
  projectName?: string;
  region?: 'eu-west-1';
} = {}): Promise<CloudFormationTemplate> => {
  const config = defineConfig(() => {
    const graphql = new AppSyncApi({
      authentication:
        authentication === 'api-key'
          ? { type: 'api-key', properties: { expiresAt: ENDPOINT_API_KEY_EXPIRES_AT } }
          : { type: 'aws-iam' },
      schemaFilePath: 'schema.graphql',
      ...(customDomain
        ? {
            customDomain: {
              domainName: ENDPOINT_CUSTOM_DOMAIN,
              customCertificateArn: ENDPOINT_CUSTOM_CERTIFICATE_ARN,
              disableDnsRecordCreation: true
            }
          }
        : {})
    });
    const handler = new LambdaFunction({
      runtime: 'nodejs22.x',
      memory: 128,
      timeout: 10,
      packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
      events: [new AppSyncApiIntegration({ appsyncApiName: graphql, field: 'Query.user' })]
    });
    return { resources: { graphql, handler }, deploymentConfig: { errorTracking: { enabled: false } } };
  });
  const template = await synthesizeFixture({
    compiledConfig: config({
      projectName,
      stage: 'test',
      region,
      cliArgs: {} as never,
      command: 'synth',
      awsProfile: '',
      user: { id: 'test', name: 'Test', email: 'test@example.com' }
    }),
    identity: { accountId, projectName, region, stage: 'test' },
    workingDir: join(import.meta.dir, '../characterization/fixtures/dense-application')
  });
  const resources = Object.fromEntries(
    Object.entries(template.Resources).filter(
      ([id]) => /^(Graphql|Handler)/.test(id) || (customDomain && id.startsWith('StpApiExampleComDomainName'))
    )
  );
  const handler = resources.HandlerFunction as KnownCloudFormationResource<'AWS::Lambda::Function'>;
  if (handler.Type !== 'AWS::Lambda::Function') throw new Error('Missing synthesized endpoint handler');
  handler.Properties.Code = {
    ZipFile: 'exports.handler = async (event) => ({ id: event.arguments.id, name: "endpoint-canary" });'
  };
  handler.Properties.Tags = [{ Key: 'stacktape:endpoint-fixture', Value: 'inline' }];
  handler.Properties.Handler = 'index.handler';
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Resources: resources,
    Outputs: { Endpoint: { Value: { 'Fn::GetAtt': ['GraphqlAppSyncGraphQlApi', 'GraphQLUrl'] } } }
  };
};
