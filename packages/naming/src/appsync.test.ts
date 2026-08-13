import { describe, expect, test } from 'bun:test';
import { awsResourceNames } from './aws-resource-names';
import { cfLogicalNames } from './cloudformation-logical-names';

describe('AppSync names', () => {
  test('keeps replacement-sensitive logical names deterministic', () => {
    expect(cfLogicalNames.appsyncApi('graphql')).toBe('GraphqlAppSyncGraphQlApi');
    expect(
      cfLogicalNames.appsyncApiResolver({
        fieldName: 'user',
        stpAppsyncApiName: 'graphql',
        typeName: 'Query'
      })
    ).toBe('GraphqlQueryUserAppSyncResolver');
  });

  test('generates strict, collision-resistant AppSync data source names', () => {
    const hyphenated = awsResourceNames.appsyncDataSource({
      stpAppsyncApiName: 'graphql',
      stpLambdaFunctionName: 'get-user'
    });
    const underscored = awsResourceNames.appsyncDataSource({
      stpAppsyncApiName: 'graphql',
      stpLambdaFunctionName: 'get_user'
    });
    expect(hyphenated).toMatch(/^[_A-Za-z][_0-9A-Za-z]*$/);
    expect(hyphenated).not.toBe(underscored);
  });
});
