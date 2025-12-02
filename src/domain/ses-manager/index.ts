import type { IdentityVerificationAttributes } from '@aws-sdk/client-ses';
import type { GetAccountCommandOutput } from '@aws-sdk/client-sesv2';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stpErrors } from '@errors';
import { isEmailValid } from '@shared/utils/validation';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { getAllParentDomains } from '@utils/domains';

export class SesManager {
  #identities: { [identityName: string]: IdentityVerificationAttributes } = {};
  #sesAccountInfo: GetAccountCommandOutput;
  init = async ({ identities }: { identities: string[] }) => {
    if (identities.length) {
      await eventManager.startEvent({
        eventType: 'FETCH_MAIL_INFO',
        description: 'Fetching email info'
      });
      [this.#sesAccountInfo, this.#identities] = await Promise.all([
        awsSdkManager.getSesAccountDetail(),
        awsSdkManager.getSesIdentitiesStatus({
          identities: identities.map(this.#getRelevantIdentitiesForVerification).flat()
        })
      ]);
      await eventManager.finishEvent({
        eventType: 'FETCH_MAIL_INFO'
      });
    }
  };

  #getRelevantIdentitiesForVerification = (identityToVerify: string) => {
    const identityFullDomain = identityToVerify.includes('@') ? identityToVerify.split('@')[1] : identityToVerify;
    const allParentDomains = getAllParentDomains(identityFullDomain);
    return [identityToVerify, ...allParentDomains];
  };

  isIdentityVerified = ({ identity }: { identity: string }) => {
    return this.#identities[identity]?.VerificationStatus === 'Success';
  };

  getVerifiedIdentityForEmail = ({ email }: { email: string }) => {
    return this.#getRelevantIdentitiesForVerification(email).find((identity) => this.isIdentityVerified({ identity }));
  };

  verifyEmailUsability = ({ email, role }: NotificationEmailInformation) => {
    if (!isEmailValid(email)) {
      throw stpErrors.e55({ invalidEmail: email });
    }
    // sender email needs to be verified always.
    // in a case when production access is not enabled (we are in sandbox) we need to verify all emails including recipients
    const emailNeedsVerification = role === 'sender' || this.#sesAccountInfo.ProductionAccessEnabled !== true;
    if (emailNeedsVerification) {
      const isAWSAccountVerifiedToUseEmail = this.getVerifiedIdentityForEmail({ email });
      if (!isAWSAccountVerifiedToUseEmail) {
        throw role === 'recipient'
          ? stpErrors.e57({ email, region: globalStateManager.region })
          : stpErrors.e56({ email, region: globalStateManager.region });
      }
    }
    return true;
  };
}

export const sesManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new SesManager());
