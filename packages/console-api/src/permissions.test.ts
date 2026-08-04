import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ASSIGNABLE_ROLES,
  getPermissionsForRole,
  getRoleLevel,
  isAlwaysUnscopedRole,
  isProjectScopableRole,
  PERMISSIONS,
  roleHasPermission
} from './permissions.js';

test('the owner has every declared permission and the deprecated member role follows developer policy', () => {
  assert.deepEqual([...getPermissionsForRole('OWNER')], [...PERMISSIONS]);
  assert.deepEqual([...getPermissionsForRole('MEMBER')], [...getPermissionsForRole('DEVELOPER')]);
  assert.equal(roleHasPermission('VIEWER', 'observability:view'), true);
  assert.equal(roleHasPermission('VIEWER', 'secrets:manage'), false);
});

test('role scope, hierarchy and assignability describe the same role model', () => {
  assert.deepEqual(ASSIGNABLE_ROLES, ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER']);
  assert.equal(isAlwaysUnscopedRole('OWNER'), true);
  assert.equal(isProjectScopableRole('DEVELOPER'), true);
  assert.equal(isProjectScopableRole('MEMBER'), false);
  assert.equal(getRoleLevel('MEMBER'), getRoleLevel('DEVELOPER'));
  assert.ok(getRoleLevel('OWNER') > getRoleLevel('VIEWER'));
});
