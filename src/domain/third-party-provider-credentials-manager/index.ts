import { eventManager } from '@application-services/event-manager';
import { ParameterNotFound } from '@aws-sdk/client-ssm';
import { GetAtt } from '@cloudform/functions';
import { configManager } from '@domain-services/config-manager';
import { stpErrors } from '@errors';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getSsmParameterNameForThirdPartyCredentials } from '@shared/naming/ssm-secret-parameters';
import {
  MONGODB_PROVIDER_DEFAULT_CREDENTIALS_ID,
  THIRD_PARTY_PROVIDER_CREDENTIALS_REGION,
  UPSTASH_PROVIDER_DEFAULT_CREDENTIALS_ID
} from '@shared/utils/constants';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';

export class ThirdPartyProviderManager {
  init = async ({
    requireAtlasCredentialsParameter,
    requireUpstashCredentialsParameter
  }: {
    requireAtlasCredentialsParameter: boolean;
    requireUpstashCredentialsParameter: boolean;
  }) => {
    if (requireAtlasCredentialsParameter || requireUpstashCredentialsParameter) {
      await eventManager.startEvent({
        eventType: 'LOAD_PROVIDER_CREDENTIALS',
        description: 'Load provider credentials'
      });
      if (requireAtlasCredentialsParameter) {
        try {
          // trying to obtain credentials in
          await awsSdkManager.getSsmParameterValue({
            ssmParameterName: getSsmParameterNameForThirdPartyCredentials({
              credentialsIdentifier: MONGODB_PROVIDER_DEFAULT_CREDENTIALS_ID,
              region: THIRD_PARTY_PROVIDER_CREDENTIALS_REGION
            }),
            region: THIRD_PARTY_PROVIDER_CREDENTIALS_REGION
          });
        } catch (err) {
          if (err instanceof ParameterNotFound) {
            throw stpErrors.e113({ providerType: 'Atlas Mongo' });
          }
          throw err;
        }
      }
      if (requireUpstashCredentialsParameter) {
        try {
          // trying to obtain credentials in
          await awsSdkManager.getSsmParameterValue({
            ssmParameterName: getSsmParameterNameForThirdPartyCredentials({
              credentialsIdentifier: UPSTASH_PROVIDER_DEFAULT_CREDENTIALS_ID,
              region: THIRD_PARTY_PROVIDER_CREDENTIALS_REGION
            }),
            region: THIRD_PARTY_PROVIDER_CREDENTIALS_REGION
          });
        } catch (err) {
          if (`${err}`.includes('ParameterNotFound')) {
            throw stpErrors.e113({ providerType: 'Upstash' });
          }
          throw err;
        }
      }

      await eventManager.finishEvent({
        eventType: 'LOAD_PROVIDER_CREDENTIALS'
      });
    }
  };

  getAtlasMongoDbProviderConfig = (): MongoDbAtlasProvider => {
    return {
      privateKey:
        configManager.mongoDbAtlasProvider?.privateKey ||
        (GetAtt(cfLogicalNames.atlasMongoCredentialsProvider(), 'privateKey') as unknown as string),
      publicKey:
        configManager.mongoDbAtlasProvider?.publicKey ||
        (GetAtt(cfLogicalNames.atlasMongoCredentialsProvider(), 'publicKey') as unknown as string),
      organizationId:
        configManager.mongoDbAtlasProvider?.organizationId ||
        (GetAtt(cfLogicalNames.atlasMongoCredentialsProvider(), 'organizationId') as unknown as string),
      accessibility: configManager.mongoDbAtlasProvider?.accessibility
    };
  };

  getUpstashProviderConfig = (): UpstashProvider => {
    return {
      accountEmail:
        configManager.upstashProvider?.accountEmail ||
        (GetAtt(cfLogicalNames.upstashCredentialsProvider(), 'accountEmail') as unknown as string),
      apiKey:
        configManager.upstashProvider?.apiKey ||
        (GetAtt(cfLogicalNames.upstashCredentialsProvider(), 'apiKey') as unknown as string)
    };
  };
}

export const thirdPartyProviderManager = compose(
  skipInitIfInitialized,
  cancelablePublicMethods
)(new ThirdPartyProviderManager());
