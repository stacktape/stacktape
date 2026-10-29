import { describe, expect, test } from 'bun:test';
import {
  getSharedEmailConfigurationSetName,
  getSharedEmailFeedbackTopicName,
  getSharedNatStackName,
  getSharedNetworkExportName,
  getSharedNetworkStackName,
  getSharedResourceStackName
} from './shared-stacks';
import { cfLogicalNames } from './cloudformation-logical-names';

describe('shared resource stack names', () => {
  test('are deterministic and do not expose the identity', () => {
    const name = getSharedResourceStackName('email-identity', 'mail@example.com');
    // SHA-256 of the UTF-8 bytes `email-identity\0mail@example.com`, truncated to 20 hex characters.
    expect(name).toBe('stacktape-shared-email-identity-deb8c8b8e827853a69fe');
    expect(name).not.toContain('example.com');
    expect(getSharedResourceStackName('email-identity', 'mail@example.com')).toBe(name);
  });

  test('builds a stable SES configuration-set name within the service limit', () => {
    const name = getSharedEmailConfigurationSetName('example.com');
    expect(name).toMatch(/^stacktape-email-[a-f0-9]{20}$/);
    expect(name.length).toBeLessThanOrEqual(64);
    expect(getSharedEmailFeedbackTopicName('example.com')).toMatch(/^stacktape-email-feedback-[a-f0-9]{20}$/);
  });
});

describe('shared network names', () => {
  // Deployed stages import these exports and name this group: changing them strands every stage in the network.
  test('are fixed per account and region', () => {
    expect(getSharedNetworkStackName()).toBe('stacktape-network');
    expect(getSharedNatStackName()).toBe('stacktape-network-nat');
    expect(getSharedNetworkExportName('vpc-id')).toBe('stacktape-network-vpc-id');
    expect(getSharedNetworkExportName('nat')).toBe('stacktape-network-nat-id');
    expect(cfLogicalNames.stageNetworkSecurityGroup()).toBe('StpStageNetworkSecurityGroup');
  });
});
