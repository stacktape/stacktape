import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listAwsProfiles } from './aws-config';

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
[malformed]
aws_access_key_id=true
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
