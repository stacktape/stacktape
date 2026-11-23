import { describe, expect, test } from 'bun:test';
import { getCloudfrontDistributionConfigs } from './cdn';

const certificateArn = 'arn:aws:acm:us-east-1:123456789012:certificate/shared';
const otherCertificateArn = 'arn:aws:acm:us-east-1:123456789012:certificate/other';

const distributionsFor = (
  customDomains: { domainName: string; customCertificateArn: string; disableDnsRecordCreation?: boolean }[]
) =>
  Object.values(
    getCloudfrontDistributionConfigs({
      cdn: { enabled: true, customDomains }
    } as unknown as Parameters<typeof getCloudfrontDistributionConfigs>[0])
  ).map(({ domains, certificateArn: arn, disableDns }) => ({ domains: [...domains], arn, disableDns }));

describe('CDN distributions for custom domains', () => {
  test('keep one distribution per apex domain, in config order, as v3 did', () => {
    // A v3 stack has these as WebServiceCdnDistribution0 and 1. Merging them by certificate would move nomnom.events
    // onto distribution 0, and CloudFront refuses an alias another distribution still holds.
    expect(
      distributionsFor([
        { domainName: 'limesquare.nl', customCertificateArn: certificateArn, disableDnsRecordCreation: true },
        { domainName: 'werkenbij.limesquare.nl', customCertificateArn: certificateArn, disableDnsRecordCreation: true },
        { domainName: 'nomnom.events', customCertificateArn: certificateArn, disableDnsRecordCreation: true }
      ])
    ).toEqual([
      { domains: ['limesquare.nl', 'werkenbij.limesquare.nl'], arn: certificateArn, disableDns: true },
      { domains: ['nomnom.events'], arn: certificateArn, disableDns: true }
    ]);
  });

  test('split an apex domain whose names use different certificates', () => {
    expect(
      distributionsFor([
        { domainName: 'example.com', customCertificateArn: certificateArn },
        { domainName: 'api.example.com', customCertificateArn: otherCertificateArn }
      ]).map(({ domains }) => domains)
    ).toEqual([['example.com'], ['api.example.com']]);
  });
});
