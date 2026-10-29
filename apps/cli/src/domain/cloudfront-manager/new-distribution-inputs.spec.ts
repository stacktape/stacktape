import { describe, expect, test } from 'bun:test';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { type PreparedEdgeHelperVersion, useNewDistributionInputs } from './new-distribution-inputs';

const CUSTOM_RESOURCE = 'CdnOriginRequestLambdaEdgeLambdaCustomResource';
const CREATED_VERSION = 'arn:aws:lambda:us-east-1:123456789012:function:app-stage-stpOReq-eu-west-1:1';

const edgeLambda = (overrides: Record<string, unknown> = {}) => ({
  name: 'cdnOriginRequestLambda',
  resourceName: 'app-stage-stpOReq-eu-west-1',
  lambdaRoleResourceName: 'app-stage-cdnOriginRequestLambda-eu-west-1',
  handler: 'index.default',
  runtime: 'nodejs22.x',
  memory: 256,
  timeout: 10,
  packaging: { type: 'helper-lambda', properties: { digest: 'abc123' } },
  ...overrides
});

const customResource = (overrides: Record<string, unknown> = {}) => ({
  Type: 'AWS::CloudFormation::CustomResource',
  Properties: {
    ServiceToken: { 'Fn::GetAtt': ['StacktapeServiceLambdaCustomResourceFunction', 'Arn'] },
    edgeLambda: edgeLambda(overrides)
  }
});

const CERTIFICATE_RESOURCE = 'StpDefaultDomainCertCustomResource';
const FOUND_CERTIFICATE = 'arn:aws:acm:us-east-1:123456789012:certificate/found';
const customResourceCertificate = { 'Fn::GetAtt': [CERTIFICATE_RESOURCE, 'usEast1CertArn'] };
const certificateResource = (certDomainSuffix = '.stacktape-app.com') => ({
  Type: 'AWS::CloudFormation::CustomResource',
  Properties: {
    ServiceToken: { 'Fn::GetAtt': ['StacktapeServiceLambdaCustomResourceFunction', 'Arn'] },
    defaultDomainCert: { certDomainSuffix, version: 1 }
  }
});

const distribution = (
  versionArn: unknown,
  pathVersionArn: unknown = versionArn,
  certificateArn: unknown = customResourceCertificate
) => ({
  Type: 'AWS::CloudFront::Distribution',
  Properties: {
    DistributionConfig: {
      ViewerCertificate: { AcmCertificateArn: certificateArn, SslSupportMethod: 'sni-only' },
      DefaultCacheBehavior: {
        LambdaFunctionAssociations: [{ EventType: 'origin-request', LambdaFunctionARN: versionArn }]
      },
      CacheBehaviors: [
        {
          PathPattern: '/assets/*',
          LambdaFunctionAssociations: [{ EventType: 'origin-request', LambdaFunctionARN: pathVersionArn }]
        }
      ]
    }
  }
});

const customResourceVersion = { 'Fn::GetAtt': [CUSTOM_RESOURCE, 'versionArn'] };

const prepared: PreparedEdgeHelperVersion[] = [
  {
    customResourceLogicalId: CUSTOM_RESOURCE,
    versionArn: CREATED_VERSION,
    function: {
      resourceName: 'app-stage-stpOReq-eu-west-1',
      lambdaRoleResourceName: 'app-stage-cdnOriginRequestLambda-eu-west-1',
      handler: 'index.default',
      runtime: 'nodejs22.x',
      memory: 256,
      timeout: 10,
      digest: 'abc123'
    }
  }
];

const foundCertificate = { arn: FOUND_CERTIFICATE, certDomainSuffix: '.stacktape-app.com', version: 1 };

const transform = ({
  resources,
  deployed,
  versions = prepared,
  certificate = foundCertificate
}: {
  resources: Record<string, unknown>;
  deployed?: Record<string, unknown>;
  versions?: PreparedEdgeHelperVersion[];
  /** null: no certificate was found. */
  certificate?: typeof foundCertificate | null;
}) => {
  const template = { Resources: structuredClone(resources) } as unknown as CloudFormationTemplate;
  useNewDistributionInputs({
    template,
    deployedTemplate: deployed ? ({ Resources: deployed } as unknown as CloudFormationTemplate) : undefined,
    deployedLogicalIds: new Set(Object.keys(deployed ?? {})),
    prepared: { edgeVersions: versions, defaultDomainCertificate: certificate ?? undefined }
  });
  return (template.Resources.SiteCdn as ReturnType<typeof distribution>).Properties.DistributionConfig;
};

/** The edge function versions of both cache behaviors. */
const run = (args: Parameters<typeof transform>[0]) => {
  const config = transform(args);
  return [
    config.DefaultCacheBehavior.LambdaFunctionAssociations[0].LambdaFunctionARN,
    config.CacheBehaviors[0].LambdaFunctionAssociations[0].LambdaFunctionARN
  ];
};

const certificateOf = (args: Parameters<typeof transform>[0]) => transform(args).ViewerCertificate.AcmCertificateArn;

describe('the default-domain certificate looked up during the build', () => {
  test('a new distribution references the certificate', () => {
    expect(
      certificateOf({ resources: { SiteCdn: distribution(null), [CERTIFICATE_RESOURCE]: certificateResource() } })
    ).toBe(FOUND_CERTIFICATE);
  });

  test('a certificate of another default domain is not used', () => {
    expect(
      certificateOf({
        resources: { SiteCdn: distribution(null), [CERTIFICATE_RESOURCE]: certificateResource('.other.com') }
      })
    ).toEqual(customResourceCertificate);
  });

  test('without a certificate, a new distribution waits for the custom resource as before', () => {
    expect(
      certificateOf({
        resources: { SiteCdn: distribution(null), [CERTIFICATE_RESOURCE]: certificateResource() },
        certificate: null
      })
    ).toEqual(customResourceCertificate);
  });

  test("a distribution that moves from a custom domain to the default domain gets the custom resource's certificate", () => {
    const customDomain = distribution(null, null, 'arn:aws:acm:us-east-1:123456789012:certificate/custom-domain');
    customDomain.Properties.DistributionConfig = {
      ...customDomain.Properties.DistributionConfig,
      Aliases: ['www.example.com']
    } as typeof customDomain.Properties.DistributionConfig;
    expect(
      certificateOf({
        resources: { SiteCdn: distribution(null), [CERTIFICATE_RESOURCE]: certificateResource() },
        deployed: { SiteCdn: customDomain, [CERTIFICATE_RESOURCE]: certificateResource() }
      })
    ).toEqual(customResourceCertificate);
  });

  test('a deployed distribution keeps the certificate it was created with while the custom resource is unchanged', () => {
    const deployed = {
      SiteCdn: distribution(null, null, 'arn:aws:acm:us-east-1:123456789012:certificate/deployed'),
      [CERTIFICATE_RESOURCE]: certificateResource()
    };
    expect(
      certificateOf({
        resources: { SiteCdn: distribution(null), [CERTIFICATE_RESOURCE]: certificateResource() },
        deployed
      })
    ).toBe('arn:aws:acm:us-east-1:123456789012:certificate/deployed');
    expect(
      certificateOf({
        resources: { SiteCdn: distribution(null), [CERTIFICATE_RESOURCE]: certificateResource('.other.com') },
        deployed
      })
    ).toEqual(customResourceCertificate);
  });
});

describe('helper edge function versions created during the build', () => {
  test('a new distribution references the created version in every cache behavior', () => {
    expect(
      run({ resources: { SiteCdn: distribution(customResourceVersion), [CUSTOM_RESOURCE]: customResource() } })
    ).toEqual([CREATED_VERSION, CREATED_VERSION]);
  });

  test.each([
    ['another helper artifact', { packaging: { type: 'helper-lambda', properties: { digest: 'other' } } }],
    ['another memory size', { memory: 512 }],
    ['another runtime', { runtime: 'nodejs20.x' }]
  ])('a version created from %s is not used', (_name, overrides) => {
    expect(
      run({
        resources: { SiteCdn: distribution(customResourceVersion), [CUSTOM_RESOURCE]: customResource(overrides) }
      })
    ).toEqual([customResourceVersion, customResourceVersion]);
  });

  test('without a created version, a new distribution waits for the custom resource as before', () => {
    expect(
      run({
        resources: { SiteCdn: distribution(customResourceVersion), [CUSTOM_RESOURCE]: customResource() },
        versions: []
      })
    ).toEqual([customResourceVersion, customResourceVersion]);
  });

  test('a deployed distribution keeps the custom resource form it was deployed with', () => {
    const resources = { SiteCdn: distribution(customResourceVersion), [CUSTOM_RESOURCE]: customResource() };
    expect(run({ resources, deployed: resources })).toEqual([customResourceVersion, customResourceVersion]);
  });

  test('a distribution created with the version keeps it while the custom resource is unchanged', () => {
    expect(
      run({
        resources: { SiteCdn: distribution(customResourceVersion), [CUSTOM_RESOURCE]: customResource() },
        deployed: { SiteCdn: distribution(CREATED_VERSION), [CUSTOM_RESOURCE]: customResource() }
      })
    ).toEqual([CREATED_VERSION, CREATED_VERSION]);
  });

  test("a behavior that used another edge function before gets the helper's custom resource version", () => {
    const removedFunction = 'arn:aws:lambda:us-east-1:123456789012:function:my-rewrite:3';
    expect(
      run({
        resources: { SiteCdn: distribution(customResourceVersion), [CUSTOM_RESOURCE]: customResource() },
        deployed: { SiteCdn: distribution(removedFunction), [CUSTOM_RESOURCE]: customResource() }
      })
    ).toEqual([customResourceVersion, customResourceVersion]);
  });

  test("a changed custom resource (a new helper) gives the distribution the custom resource's version again", () => {
    expect(
      run({
        resources: {
          SiteCdn: distribution(customResourceVersion),
          [CUSTOM_RESOURCE]: customResource({ packaging: { type: 'helper-lambda', properties: { digest: 'next' } } })
        },
        deployed: { SiteCdn: distribution(CREATED_VERSION), [CUSTOM_RESOURCE]: customResource() }
      })
    ).toEqual([customResourceVersion, customResourceVersion]);
  });

  test("a user's own edge function keeps referencing its custom resource", () => {
    const userResource = 'RewriteEdgeLambdaCustomResource';
    const userVersion = { 'Fn::GetAtt': [userResource, 'versionArn'] };
    expect(
      run({
        resources: {
          SiteCdn: distribution(userVersion),
          [userResource]: customResource({ name: 'rewrite' })
        },
        versions: [{ ...prepared[0], customResourceLogicalId: userResource }]
      })
    ).toEqual([userVersion, userVersion]);
  });
});
