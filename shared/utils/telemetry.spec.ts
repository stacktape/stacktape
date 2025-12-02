import { beforeEach, describe, expect, mock, test } from 'bun:test';

// Mock Mixpanel
const mockMixpanelClient = {
  track: mock((event, data, callback) => callback(null)),
  people: {
    set: mock((id, data, callback) => callback(null)),
    delete_user: mock((id, options, callback) => callback(null))
  },
  alias: mock((id, alias, callback) => callback(null))
};

mock.module('mixpanel', () => ({
  default: {
    init: mock(() => mockMixpanelClient)
  }
}));

mock.module('../../src/config/random', () => ({
  MIXPANEL_TOKEN: 'test-token',
  IS_DEV: false
}));

describe('telemetry', () => {
  beforeEach(() => {
    mockMixpanelClient.track.mockClear();
    mockMixpanelClient.people.set.mockClear();
    mockMixpanelClient.people.delete_user.mockClear();
    mockMixpanelClient.alias.mockClear();
  });

  describe('trackEventToMixpanel', () => {
    test('should track event with data', async () => {
      const { trackEventToMixpanel } = await import('./telemetry');

      await trackEventToMixpanel('test_event', { property: 'value' });

      expect(mockMixpanelClient.track).toHaveBeenCalledWith('test_event', { property: 'value' }, expect.any(Function));
    });

    test('should handle errors in non-dev mode', async () => {
      mockMixpanelClient.track = mock((event, data, callback) => callback(new Error('Network error')));

      const { trackEventToMixpanel } = await import('./telemetry');

      await expect(trackEventToMixpanel('test_event', {})).resolves.toBeNull();
    });

    test('should timeout after 2 seconds', async () => {
      mockMixpanelClient.track = mock(() => {
        // Never call callback to simulate timeout
      });

      const { trackEventToMixpanel } = await import('./telemetry');
      const start = Date.now();

      await trackEventToMixpanel('test_event', {});

      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(1900);
      expect(duration).toBeLessThan(2500);
    });
  });

  describe('upsertUserToMixpanel', () => {
    test('should upsert user with basic data', async () => {
      const { upsertUserToMixpanel } = await import('./telemetry');

      await upsertUserToMixpanel('user-123', { customProp: 'value' });

      expect(mockMixpanelClient.people.set).toHaveBeenCalledWith(
        'user-123',
        { customProp: 'value' },
        expect.any(Function)
      );
    });

    test('should split fullName into first and last name', async () => {
      const { upsertUserToMixpanel } = await import('./telemetry');

      await upsertUserToMixpanel('user-123', {
        fullName: 'John Doe Smith',
        email: 'john@example.com'
      });

      const callArgs = mockMixpanelClient.people.set.mock.calls[0];
      expect(callArgs[1].$email).toBe('john@example.com');
      expect(callArgs[1].$first_name).toBe('John');
      expect(callArgs[1].$last_name).toBe('Doe Smith');
    });
  });

  describe('identifyUserInMixpanel', () => {
    test('should delete old identity and create alias', async () => {
      const { identifyUserInMixpanel } = await import('./telemetry');

      await identifyUserInMixpanel({
        systemId: 'system-123',
        userId: 'user-456'
      });

      expect(mockMixpanelClient.people.delete_user).toHaveBeenCalledWith('system-123', {}, expect.any(Function));
      expect(mockMixpanelClient.alias).toHaveBeenCalledWith('user-456', 'system-123', expect.any(Function));
    });
  });

  describe('deleteUserIdentityFromMixpanel', () => {
    test('should delete user identity', async () => {
      const { deleteUserIdentityFromMixpanel } = await import('./telemetry');

      await deleteUserIdentityFromMixpanel('user-123');

      expect(mockMixpanelClient.people.delete_user).toHaveBeenCalledWith('user-123', {}, expect.any(Function));
    });
  });

  describe('mergeUserIdentityInMixpanel', () => {
    test('should merge user identities', async () => {
      const { mergeUserIdentityInMixpanel } = await import('./telemetry');

      await mergeUserIdentityInMixpanel({
        distinctId: 'user-123',
        alias: 'system-456'
      });

      expect(mockMixpanelClient.alias).toHaveBeenCalledWith('user-123', 'system-456', expect.any(Function));
    });
  });
});
