import { describe, expect, test } from 'bun:test';
import awsPrices from '@stacktape/cli/catalogs/aws-prices.json';
import cloudformationResourceTypes from '@stacktape/cli/catalogs/cloudformation-resource-types.json';
import rdsEngineVersions from '@stacktape/cli/catalogs/rds-engine-versions.json';
import starterProjects from '@stacktape/cli/starter-projects-metadata.json';

describe('@stacktape/cli catalog exports', () => {
  test('exposes the committed editor and starter-project data', () => {
    expect(awsPrices.ec2Instances.length).toBeGreaterThan(0);
    expect(cloudformationResourceTypes).toContain('AWS::Lambda::Function');
    expect(rdsEngineVersions.rds.postgres.length).toBeGreaterThan(0);
    expect(starterProjects.some(({ starterProjectId }) => starterProjectId === 'hono-api')).toBeTrue();
  });
});
