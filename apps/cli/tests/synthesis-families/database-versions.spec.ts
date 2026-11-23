/**
 * Database versions through the real synthesis path.
 *
 * AWS retires minor versions, and the list of versions in this CLI is a snapshot. A config that names a release line
 * (`17`, `8.4`) keeps deploying; one that pins a minor version stops when AWS retires it. A database that is already
 * deployed must keep deploying and keep its version, whatever the list says today.
 */
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import versions from '../../@generated/db-engine-versions/versions.json' with { type: 'json' };
import { getEngineVersionConfigurationData } from '../../src/domain/calculated-stack-overview-manager/resource-resolvers/databases/utils';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

type Template = CloudFormationTemplate & {
  Resources: Record<string, { Type: string; Properties?: Record<string, any> }>;
};

const fixturesDir = join(import.meta.dir, 'fixtures');
const database = (type: string, version: string) => ({
  type: 'relational-database',
  properties: {
    credentials: { masterUserPassword: 'not-a-real-password' },
    engine: {
      type,
      properties: type.startsWith('aurora')
        ? { version, instances: [{ instanceSize: 'db.t4g.medium' }] }
        : { version, primaryInstance: { instanceSize: 'db.t4g.micro' } }
    }
  }
});
const synthesize = async (resources: Record<string, unknown>, deployedTemplate?: CloudFormationTemplate) =>
  (await synthesizeFixture({
    compiledConfig: { config: { resources } } as never,
    workingDir: fixturesDir,
    ...(deployedTemplate ? { deployedTemplate } : {})
  })) as Template;
const instanceVersion = (template: Template, name = 'db') =>
  template.Resources[cfLogicalNames.dbInstance(name)]!.Properties!.EngineVersion;
/** A full version of a line that today's list has, so the tests don't age with the list. */
const fullVersionOf = (line: string) => {
  const version = (versions.rds.postgres as string[]).find((candidate) => candidate.startsWith(`${line}.`));
  if (!version) throw new Error(`The version list has no PostgreSQL ${line}.`);
  return version;
};

describe('database versions', () => {
  // A refreshed list brings engine generations whose family the CLI has to know: without it, a version that passes
  // validation fails later with "Cannot find parameter group family".
  test('every version in the list has a parameter group family', () => {
    const withoutFamily = Object.entries(versions.rds as Record<string, string[]>).flatMap(([engineType, list]) =>
      list
        .filter((engineVersion) => {
          try {
            getEngineVersionConfigurationData({
              engineType: engineType as never,
              engineVersion,
              instanceType: 'db.t4g.micro'
            });
            return false;
          } catch {
            return true;
          }
        })
        .map((engineVersion) => `${engineType} ${engineVersion}`)
    );
    expect(withoutFamily).toEqual([]);
  });

  test('a release line reaches CloudFormation as written, with the parameter group family of the line', async () => {
    const template = await synthesize({
      pg: database('postgres', '17'),
      my: database('mysql', '8.4'),
      maria: database('mariadb', '11.4'),
      aurora: database('aurora-postgresql', '17')
    });
    expect(instanceVersion(template, 'pg')).toBe('17');
    expect(instanceVersion(template, 'my')).toBe('8.4');
    expect(instanceVersion(template, 'maria')).toBe('11.4');
    expect(template.Resources[cfLogicalNames.auroraDbCluster('aurora')]!.Properties!.EngineVersion).toBe('17');
    expect(template.Resources[cfLogicalNames.dbInstanceParameterGroup('pg')]!.Properties!.Family).toBe('postgres17');
    expect(template.Resources[cfLogicalNames.dbInstanceParameterGroup('my')]!.Properties!.Family).toBe('mysql8.4');
    expect(template.Resources[cfLogicalNames.dbInstanceParameterGroup('maria')]!.Properties!.Family).toBe(
      'mariadb11.4'
    );
    expect(template.Resources[cfLogicalNames.auroraDbClusterParameterGroup('aurora')]!.Properties!.Family).toBe(
      'aurora-postgresql17'
    );
  });

  test('a version the list does not have is refused, and the message offers the release line', async () => {
    await expect(synthesize({ db: database('postgres', '16.999') })).rejects.toThrow(/not a valid available version/);
    await expect(synthesize({ db: database('postgres', '16.999') })).rejects.toMatchObject({
      hint: expect.stringContaining('release line')
    });
    // A line that does not exist is not a line.
    await expect(synthesize({ db: database('postgres', '99') })).rejects.toThrow(/not a valid available version/);
    // Only the documented parts name a line: `8` is neither the 8.0 nor the 8.4 line.
    await expect(synthesize({ db: database('mysql', '8') })).rejects.toThrow(/not a valid available version/);
  });

  test('a deployed database keeps its version when its config moves to the release line', async () => {
    const pinned = fullVersionOf('16');
    const deployed = await synthesize({ db: database('postgres', pinned) });
    expect(instanceVersion(deployed)).toBe(pinned);

    // Sending `16` would make RDS move the running database to the line's default minor version during the deploy.
    expect(instanceVersion(await synthesize({ db: database('postgres', '16') }, deployed))).toBe(pinned);
    // Another line is a real change.
    expect(instanceVersion(await synthesize({ db: database('postgres', '17') }, deployed))).toBe('17');
    // So is another full version.
    const other = fullVersionOf('17');
    expect(instanceVersion(await synthesize({ db: database('postgres', other) }, deployed))).toBe(other);
  });

  test('a database deployed with a version that the list has dropped since keeps deploying', async () => {
    const deployed = await synthesize({ db: database('postgres', fullVersionOf('16')) });
    // What a stack deployed a year ago looks like: AWS and the list have both moved past its minor version.
    deployed.Resources[cfLogicalNames.dbInstance('db')]!.Properties!.EngineVersion = '16.1';
    expect(instanceVersion(await synthesize({ db: database('postgres', '16.1') }, deployed))).toBe('16.1');
    expect(instanceVersion(await synthesize({ db: database('postgres', '16') }, deployed))).toBe('16.1');
  });
});

describe('Oracle license model', () => {
  // RDS sells Enterprise Edition only as bring-your-own-license; asking for license-included fails the deploy in AWS.
  test('Enterprise Edition brings its own license, Standard Edition 2 includes it', async () => {
    const oracleVersion = (versions.rds['oracle-ee'] as string[])[0]!;
    const template = await synthesize({
      ee: database('oracle-ee', oracleVersion),
      se2: database('oracle-se2', (versions.rds['oracle-se2'] as string[])[0]!),
      pg: database('postgres', '17')
    });
    const licenseModel = (name: string) =>
      template.Resources[cfLogicalNames.dbInstance(name)]!.Properties!.LicenseModel;
    expect(licenseModel('ee')).toBe('bring-your-own-license');
    expect(licenseModel('se2')).toBe('license-included');
    expect(licenseModel('pg')).toBeUndefined();
  });
});
