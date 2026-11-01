import { describe, expect, test } from 'bun:test';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { decideSkippedImages, findKeptImagesWithChangedConfiguration, findTemplateImageTag } from './kept-image';

const REPOSITORY = '123456789012.dkr.ecr.eu-north-1.amazonaws.com/shelf-dev-repo';
const DEPLOYED_TAG = 'report-default--67c09c11--v000001';
const JOB_DEFINITION = cfLogicalNames.batchJobDefinition('report');
const JOB_ROLE = 'ReportJobRole';

const jobDefinition = ({
  image = `${REPOSITORY}:${DEPLOYED_TAG}`,
  environment = [{ Name: 'BUCKET', Value: { Ref: 'ReportsBucket' } }],
  command = ['node', 'jobs/report/index.js']
}: { image?: string; environment?: unknown[]; command?: string[] } = {}) => ({
  Type: 'AWS::Batch::JobDefinition',
  Properties: {
    Type: 'container',
    ContainerProperties: {
      Image: image,
      Command: command,
      Environment: environment,
      JobRoleArn: { 'Fn::GetAtt': [JOB_ROLE, 'Arn'] }
    }
  }
});

const template = ({
  definition = jobDefinition(),
  bucket = { Type: 'AWS::S3::Bucket', Properties: { BucketName: 'reports' } } as unknown,
  role = { Type: 'AWS::IAM::Role', Properties: { Policies: [] } } as unknown
} = {}) => ({
  Resources: { [JOB_DEFINITION]: definition, [JOB_ROLE]: role, ReportsBucket: bucket }
});

const images = [{ jobName: 'report-default', workloadName: 'report' }];

describe('which images a dev stack keeps for workloads the session leaves out', () => {
  test('a deployed, stored image is kept, so an unrelated edit builds and pushes nothing', () => {
    expect(
      decideSkippedImages({
        images,
        deployedTemplate: template(),
        repositoryUrl: REPOSITORY,
        storedImageTags: new Set([DEPLOYED_TAG, 'report-default--d5e9e122--v000002'])
      })
    ).toEqual([
      { workloadName: 'report', keep: new Map([['report-default', { tag: DEPLOYED_TAG, digest: '67c09c11' }]]) }
    ]);
  });

  test('a first start, without a deployed image, builds it', () => {
    for (const deployedTemplate of [undefined, { Resources: {} }]) {
      expect(
        decideSkippedImages({ images, deployedTemplate, repositoryUrl: REPOSITORY, storedImageTags: new Set() })
      ).toEqual([{ workloadName: 'report', build: 'not-deployed' }]);
    }
  });

  test('an image the repository no longer stores is built', () => {
    expect(
      decideSkippedImages({
        images,
        deployedTemplate: template(),
        repositoryUrl: REPOSITORY,
        storedImageTags: new Set(['report-default--d5e9e122--v000002'])
      })
    ).toEqual([{ workloadName: 'report', build: 'stored-image-missing' }]);
  });

  test("an image of another stack's repository is not the dev stack's", () => {
    const foreign = template({ definition: jobDefinition({ image: `other.example/repo:${DEPLOYED_TAG}` }) });
    expect(
      decideSkippedImages({
        images,
        deployedTemplate: foreign,
        repositoryUrl: REPOSITORY,
        storedImageTags: new Set([DEPLOYED_TAG])
      })
    ).toEqual([{ workloadName: 'report', build: 'not-deployed' }]);
    expect(findTemplateImageTag({ template: foreign, repositoryUrl: REPOSITORY, jobName: 'report-default' })).toBe(
      undefined
    );
  });

  test('the containers of one workload are kept only together', () => {
    const deployedTemplate = {
      Resources: { Task: { Properties: { ContainerDefinitions: [{ Image: `${REPOSITORY}:api-web--aaaa--v000001` }] } } }
    };
    expect(
      decideSkippedImages({
        images: [
          { jobName: 'api-web', workloadName: 'api' },
          { jobName: 'api-worker', workloadName: 'api' }
        ],
        deployedTemplate,
        repositoryUrl: REPOSITORY,
        storedImageTags: new Set(['api-web--aaaa--v000001'])
      })
    ).toEqual([{ workloadName: 'api', build: 'not-deployed' }]);
  });
});

describe('a kept image whose workload changes otherwise is built', () => {
  const changed = (next: ReturnType<typeof template>, owned = [JOB_DEFINITION, JOB_ROLE]) =>
    findKeptImagesWithChangedConfiguration({
      workloadNames: ['report'],
      ownedLogicalNames: () => owned,
      template: next,
      deployedTemplate: template()
    });

  test('an unchanged deployment keeps it, whatever order DependsOn lists', () => {
    expect(changed(template())).toEqual([]);
    expect(changed(template({ definition: { ...jobDefinition(), DependsOn: ['Other'] } as never }))).toEqual([]);
  });

  test('a changed environment, command or role builds it', () => {
    expect(
      changed(template({ definition: jobDefinition({ environment: [{ Name: 'MODE', Value: 'full' }] }) }))
    ).toEqual(['report']);
    expect(changed(template({ definition: jobDefinition({ command: ['node', 'jobs/report/v2.js'] }) }))).toEqual([
      'report'
    ]);
    expect(
      changed(template({ role: { Type: 'AWS::IAM::Role', Properties: { Policies: [{ PolicyName: 'more' }] } } }))
    ).toEqual(['report']);
  });

  test('a changed resource its environment refers to builds it: the job receives its new values', () => {
    expect(
      changed(template({ bucket: { Type: 'AWS::S3::Bucket', Properties: { BucketName: 'reports-v2' } } }))
    ).toEqual(['report']);
  });

  test('a new resource it owns, or none known, builds it', () => {
    const next = template();
    (next.Resources as Record<string, unknown>).ReportSchedule = { Type: 'AWS::Events::Rule', Properties: {} };
    expect(changed(next, [JOB_DEFINITION, JOB_ROLE, 'ReportSchedule'])).toEqual(['report']);
    expect(changed(template(), [])).toEqual(['report']);
  });
});
