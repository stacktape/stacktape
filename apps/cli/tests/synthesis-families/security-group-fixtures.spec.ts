import { expect, test } from 'bun:test';
import { findStaleSecurityGroupFixtures, synthesizeSecurityGroupFixtures } from './security-group-fixtures';

test("the isometric diagram's security-group fixtures are the templates the CLI synthesizes today", async () => {
  // On failure, regenerate with `bun apps/cli/tests/synthesis-families/security-group-fixtures.ts`, then review the
  // template diff and `packages/ui-react/src/isometric-diagram/security-groups.test.ts`.
  expect(await findStaleSecurityGroupFixtures(await synthesizeSecurityGroupFixtures())).toEqual([]);
});
