import Mixpanel from 'mixpanel';
import { IS_DEV, MIXPANEL_TOKEN } from '../../src/config/random';

const mixpanelClient = Mixpanel.init(MIXPANEL_TOKEN, {
  host: 'api-eu.mixpanel.com'
});

export const trackEventToMixpanel = (eventName: string, data: Record<string, any>) => {
  return new Promise((resolve, reject) => {
    // wait at most this much ms for the event to be logged so we don't hang out the process
    const timeout = setTimeout(resolve, 2000);
    mixpanelClient.track(eventName, data, (err) => {
      if (err) {
        clearTimeout(timeout);
        if (IS_DEV) {
          reject(err);
        } else {
          // telemetry is not mission critical and shouldn't hang the process
          resolve(null);
        }
      }
      clearTimeout(timeout);
      resolve(null);
    });
  });
};

export const upsertUserToMixpanel = (distinctId: string, data: Record<string, any>) => {
  return new Promise((resolve, reject) => {
    // wait at most this much ms for the event to be logged so we don't hang out the process
    const timeout = setTimeout(resolve, 2000);

    const { fullName, email, ...rest } = data;
    let adjustedData = data;
    if (fullName && email) {
      const [firstName, ...lastNameParts] = fullName.split(' ');
      adjustedData = { ...rest, $email: email, $first_name: firstName, $last_name: lastNameParts.join(' ') };
    }

    mixpanelClient.people.set(distinctId, adjustedData, (err) => {
      if (err) {
        clearTimeout(timeout);
        if (IS_DEV) {
          reject(err);
        } else {
          // telemetry is not mission critical and shouldn't hang the process
          resolve(null);
        }
      }
      clearTimeout(timeout);
      resolve(null);
    });
  });
};

export const identifyUserInMixpanel = async ({ systemId, userId }: { systemId: string; userId: string }) => {
  await deleteUserIdentityFromMixpanel(systemId);
  await mergeUserIdentityInMixpanel({
    alias: systemId,
    distinctId: userId
  });
};

const deleteUserIdentityFromMixpanel = (distinctId: string) => {
  return new Promise((resolve, reject) => {
    // wait at most this much ms for the event to be logged so we don't hang out the process
    const timeout = setTimeout(resolve, 2000);
    mixpanelClient.people.delete_user(distinctId, {}, (err) => {
      if (err) {
        clearTimeout(timeout);
        if (IS_DEV) {
          reject(err);
        } else {
          // telemetry is not mission critical and shouldn't hang the process
          resolve(null);
        }
      }
      clearTimeout(timeout);
      resolve(null);
    });
  });
};

const mergeUserIdentityInMixpanel = ({ distinctId, alias }: { distinctId: string; alias: string }) => {
  return new Promise((resolve, reject) => {
    // wait at most this much ms for the event to be logged so we don't hang out the process
    const timeout = setTimeout(resolve, 2000);
    mixpanelClient.alias(distinctId, alias, (err) => {
      if (err) {
        clearTimeout(timeout);
        if (IS_DEV) {
          reject(err);
        } else {
          // telemetry is not mission critical and shouldn't hang the process
          resolve(null);
        }
      }
      clearTimeout(timeout);
      resolve(null);
    });
  });
};
