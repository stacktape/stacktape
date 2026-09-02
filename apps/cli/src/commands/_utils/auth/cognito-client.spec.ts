import { expect, test } from 'bun:test';
import { createGoogleAuthorizationUrl } from './cognito-client';

test('Google CLI login requires a fresh federated authentication', () => {
  const url = createGoogleAuthorizationUrl({
    redirectUri: 'http://localhost:19835/callback',
    challenge: 'challenge',
    state: 'state'
  });

  expect(url.searchParams.get('identity_provider')).toBe('Google');
  expect(url.searchParams.get('prompt')).toBe('login');
  expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  expect(url.searchParams.get('state')).toBe('state');
});
