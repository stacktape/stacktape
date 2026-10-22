import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listAwsProfiles, profileRegionFromConfig } from './aws-config';
import { parse as parseIni } from 'ini';

test('lists complete static credentials from a real INI file without treating other sections as credentials', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-aws-profiles-'));
  const credentialsFile = join(directory, 'credentials');
  try {
    expect(await listAwsProfiles(credentialsFile)).toEqual([]);
    await writeFile(
      credentialsFile,
      `top_level_value=true
[default]
aws_access_key_id=synthetic-id
aws_secret_access_key=synthetic-secret
[role]
role_arn=arn:aws:iam::123456789012:role/example
source_profile=default
[incomplete]
aws_access_key_id=synthetic-id
[malformed-access-key]
aws_access_key_id=true
aws_secret_access_key=synthetic-secret
[malformed-secret-key]
aws_access_key_id=synthetic-id
aws_secret_access_key[]=not-a-string
`
    );
    expect(await listAwsProfiles(credentialsFile)).toEqual([
      {
        profile: 'default',
        AWS_ACCESS_KEY_ID: 'synthetic-id',
        AWS_SECRET_ACCESS_KEY: 'synthetic-secret'
      }
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test.each([
  ['the default profile', 'default', 'us-east-1'],
  ['a named profile in its `[profile name]` section', 'other', 'ap-southeast-2'],
  ['a named profile written as a bare section', 'bare', 'eu-north-1'],
  ['a profile without a region', 'noregion', undefined],
  ['a profile that does not exist', 'missing', undefined]
])('finds the region of %s in the AWS config file', (_name, profile, expected) => {
  const content = parseIni(`[default]
region = us-east-1
[profile other]
region = ap-southeast-2
[bare]
region = eu-north-1
[profile noregion]
output = json
`);
  expect(profileRegionFromConfig(content, profile)).toBe(expected);
});
