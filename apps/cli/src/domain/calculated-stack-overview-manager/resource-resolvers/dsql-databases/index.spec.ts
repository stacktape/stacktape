import { expect, test } from 'bun:test';
import { AURORA_DSQL_REGIONS } from '@stacktape/config/dsql-databases';
import { CliError } from '@utils/errors';
import { assertDsqlRegionSupported } from '.';

test('DSQL fails early with a stable actionable error in unsupported Stacktape regions', () => {
  expect(() => assertDsqlRegionSupported('eu-west-1')).not.toThrow();
  expect(() => assertDsqlRegionSupported('eu-south-1')).toThrow(CliError);
  try {
    assertDsqlRegionSupported('eu-south-1');
    throw new Error('Expected unsupported DSQL region to fail');
  } catch (error) {
    expect(error).toMatchObject({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_DSQL_REGION_UNSUPPORTED',
      message: 'Amazon Aurora DSQL is not available in region `eu-south-1`.'
    });
    expect((error as CliError).hints).toEqual([`Choose one of: ${AURORA_DSQL_REGIONS.join(', ')}.`]);
  }
});
