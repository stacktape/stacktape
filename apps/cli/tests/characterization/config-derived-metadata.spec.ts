import { describe, expect, test } from 'bun:test';
import { ConfigManager } from '@domain-services/config-manager';
import type { StackContext } from '@domain-services/stack-context';
import type { StacktapeConfig } from '@stacktape/config';

const stackContext: StackContext = {
  accountId: '123456789999',
  command: 'synth',
  globallyUniqueStackHash: 'derived-metadata',
  invocationId: 'derived-metadata-invocation',
  projectName: 'derived-metadata',
  region: 'eu-west-1',
  stackName: 'derived-metadata-test',
  stage: 'test',
  workingDir: process.cwd()
};

const managerFor = (resources: StacktapeConfig['resources']) => {
  const manager = new ConfigManager();
  manager.setStackContext(stackContext);
  manager.config = { resources };
  return manager;
};

describe('configuration-derived initialization metadata', () => {
  test('includes default and explicitly authored OpenSearch capacity', () => {
    const manager = managerFor({
      defaultSearch: { type: 'open-search-domain' },
      explicitSearch: {
        type: 'open-search-domain',
        properties: {
          version: '2.11',
          clusterConfig: {
            instanceType: 'r6g.large.search',
            instanceCount: 2,
            dedicatedMasterType: 'm6g.large.search',
            dedicatedMasterCount: 3,
            warmType: 'ultrawarm1.medium.search',
            warmCount: 2
          }
        }
      }
    });

    expect(manager.allUsedOpenSearchVersionsAndInstanceTypes).toEqual([
      { version: '2.17', instanceType: 'm4.large.search' },
      { version: '2.11', instanceType: 'r6g.large.search' },
      { version: '2.11', instanceType: 'm6g.large.search' },
      { version: '2.11', instanceType: 'ultrawarm1.medium.search' }
    ]);
  });

  test('loads domain state only when Stacktape manages DNS or the certificate', () => {
    const externallyManagedDomain = {
      domainName: 'externally-managed.example.org',
      disableDnsRecordCreation: true,
      customCertificateArn: 'arn:aws:acm:eu-west-1:123456789999:certificate/external'
    };
    const manager = managerFor({
      api: {
        type: 'http-api-gateway',
        properties: {
          customDomains: [
            externallyManagedDomain,
            {
              domainName: 'dns-managed.example.com',
              customCertificateArn: 'arn:aws:acm:eu-west-1:123456789999:certificate/dns-managed'
            }
          ]
        }
      },
      assets: {
        type: 'bucket',
        properties: {
          cdn: {
            enabled: true,
            customDomains: [
              { ...externallyManagedDomain, domainName: 'cdn-externally-managed.example.org' },
              { domainName: 'certificate-managed.example.net', disableDnsRecordCreation: true }
            ]
          }
        }
      },
      users: {
        type: 'user-auth-pool',
        properties: {
          customDomain: {
            domainName: 'external-auth.example.dev',
            disableDnsRecordCreation: true,
            customCertificateArn: 'arn:aws:acm:us-east-1:123456789999:certificate/external-auth'
          }
        }
      },
      functionCdn: {
        type: 'function',
        properties: {
          packaging: {
            type: 'stacktape-lambda-buildpack',
            properties: { entryfilePath: './src/function.ts' }
          },
          cdn: {
            enabled: true,
            customDomains: [{ domainName: 'function-managed.example.io' }]
          }
        }
      }
    });

    expect(manager.allUsedDomainsInConfig.sort()).toEqual(['example.com', 'example.io', 'example.net']);
  });

  test('rejects duplicate API Gateway domains even when DNS and certificates are externally managed', () => {
    const externalDomain = {
      domainName: 'realtime.example.com',
      disableDnsRecordCreation: true,
      customCertificateArn: 'arn:aws:acm:eu-west-1:123456789999:certificate/external'
    };
    const manager = managerFor({
      httpApi: { type: 'http-api-gateway', properties: { customDomains: [externalDomain] } },
      realtimeApi: { type: 'websocket-api-gateway', properties: { customDomains: [externalDomain] } }
    });

    expect(() => manager.allUsedDomainsInConfig).toThrow('realtime.example.com');
  });
});
