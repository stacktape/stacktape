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

/** The real endpoint family, with packaging replaced by inline code so this lane owns only routing and permissions. */
export const synthesizeAppSyncEndpoint = async ({
  accountId = '123456789999',
  projectName = 'endpoint',
  region = 'eu-west-1'
}: { accountId?: string; projectName?: string; region?: 'eu-west-1' } = {}): Promise<CloudFormationTemplate> => {
  const config = defineConfig(() => {
    const graphql = new AppSyncApi({ authentication: { type: 'aws-iam' }, schemaFilePath: 'schema.graphql' });
    const handler = new LambdaFunction({
      runtime: 'nodejs22.x',
      memory: 128,
      timeout: 10,
      packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
      events: [new AppSyncApiIntegration({ appsyncApiName: graphql, field: 'Query.user' })]
    });
    return { resources: { graphql, handler }, deploymentConfig: { issues: { enabled: false } } };
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
    Object.entries(template.Resources).filter(([id]) => /^(Graphql|Handler)/.test(id))
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
