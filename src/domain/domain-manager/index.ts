import type { HostedZone } from '@aws-sdk/client-route-53';
import type { WhoisSearchResult } from 'whoiser';
import { promises as dnsPromises } from 'node:dns';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { CertificateStatus } from '@aws-sdk/client-acm';
import { stpErrors } from '@errors';
import { getPrefixForUserAppResourceDefaultDomainName } from '@shared/naming/domain-names';
import {
  getSsmParameterNameForDomainInfo,
  parseDomainNameFromSmmParamName
} from '@shared/naming/ssm-secret-parameters';
import { COMMENT_FOR_STACKTAPE_ZONE } from '@shared/utils/constants';
import { jsonFetch } from '@shared/utils/json-fetch';
import { areStringArraysContentsEqual } from '@shared/utils/misc';
import { shortHash } from '@shared/utils/short-hash';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { getApexDomain } from '@utils/domains';
import { validateDomain } from '@utils/validator';
import { parse as tldtsParse } from 'tldts';
import whoiser from 'whoiser';

type DefaultDomainsInfo = {
  suffix: string;
  certDomainSuffix: string;
  version: number;
};

export class DomainManager {
  domainStatuses: { [domainName: string]: StpDomainStatus } = {};
  publicHostedZones: HostedZone[] = [];
  dnsResolver: dnsPromises.Resolver;
  // populating with dummy values to make resource resolvers work (in dummy mode) without trpc api
  defaultDomainsInfo: DefaultDomainsInfo = {
    suffix: '-xxxxxxxx.stacktape-app.com',
    certDomainSuffix: '.stacktape-app.com',
    version: 1
  };

  // populating with dummy values to make resource resolvers work (in dummy mode) without trpc api
  #stackName: string = 'project-stage';
  init = async ({
    stackName,
    domains,
    fromParameterStore,
    parentEventType
  }: {
    stackName?: string;
    domains: string[];
    fromParameterStore?: boolean;
    /** Optional parent event for grouping (e.g., LOAD_METADATA_FROM_AWS) */
    parentEventType?: LoggableEventType;
  }) => {
    // if (!domains.length) {
    //   return;
    // }
    this.dnsResolver = new dnsPromises.Resolver();
    this.dnsResolver.setServers(['8.8.8.8']);
    await eventManager.startEvent({
      eventType: 'FETCH_DOMAIN_STATUSES',
      description: 'Fetching domain statuses',
      parentEventType,
      instanceId: parentEventType ? 'Domain statuses' : undefined
    });
    this.#stackName = stackName;
    const [fetchedDefaultDomainsInfo] = await Promise.all([
      stackName
        ? stacktapeTrpcApiManager.apiClient.defaultDomainsInfo({
            stackName,
            region: globalStateManager.region,
            awsAccountId: globalStateManager.targetAwsAccount.awsAccountId
          })
        : undefined,
      fromParameterStore
        ? domains.length && this.#fetchDomainStatusesFromParameterStore({ domains })
        : domains.length && this.#fetchDomainStatuses({ domains })
    ]);
    this.defaultDomainsInfo = stackName && this.#validateDefaultDomainsInfo(fetchedDefaultDomainsInfo);
    await eventManager.finishEvent({
      eventType: 'FETCH_DOMAIN_STATUSES',
      parentEventType,
      instanceId: parentEventType ? 'Domain statuses' : undefined
    });
  };

  #validateDefaultDomainsInfo(info: Partial<DefaultDomainsInfo> | undefined): DefaultDomainsInfo {
    if (!info || info?.suffix === undefined || info?.certDomainSuffix === undefined || info?.version === undefined) {
      throw new Error(`Fetched default domains info invalid: ${JSON.stringify(info)}`);
    }
    return { suffix: info.suffix, certDomainSuffix: info.certDomainSuffix, version: info.version };
  }

  getDomainStatus = (domainName: string): StpDomainStatus => {
    return this.domainStatuses[getApexDomain(domainName)];
  };

  getDefaultDomainForResource = ({
    stpResourceName,
    cdn,
    customPrefix
  }: {
    stpResourceName: string;
    cdn?: boolean;
    customPrefix?: string;
  }) => {
    let prefix =
      customPrefix ||
      getPrefixForUserAppResourceDefaultDomainName({ stpResourceName, cdn, stackName: this.#stackName });
    const labelSuffixLength = this.defaultDomainsInfo.suffix.split('.').at(0).length;
    if (prefix.length + labelSuffixLength > 63) {
      const prefixHash = shortHash(prefix);
      prefix = `${prefix.slice(0, 63 - prefixHash.length - labelSuffixLength)}${prefixHash}`;
    }
    return `${prefix}${this.defaultDomainsInfo.suffix}`;
  };

  #fetchDomainStatusesFromParameterStore = async ({ domains }: { domains: string[] }) => {
    const parameters = await awsSdkManager.getSsmParametersValues({
      ssmParametersNames: domains.map((domainName) =>
        getSsmParameterNameForDomainInfo({ domainName, region: globalStateManager.region })
      )
    });

    await Promise.all(
      (parameters || []).map(async ({ Name, Value }) => {
        const domainName = parseDomainNameFromSmmParamName({ paramName: Name, region: globalStateManager.region });
        validateDomain(domainName);
        const status = JSON.parse(Value) as StpDomainStatus;
        const lookupNameServers = await this.resolveCurrentNameServersForDomain(domainName);
        // refreshing few properties that are quick to verify
        status.registered = !!lookupNameServers;
        status.ownershipVerified = areStringArraysContentsEqual(
          status.hostedZoneInfo?.DelegationSet?.NameServers,
          lookupNameServers
        );
        this.domainStatuses[domainName] = status;
      })
    );
  };

  storeDomainStatusIntoParameterStore = async ({
    domainName,
    status
  }: {
    domainName: string;
    status: StpDomainStatus;
  }) => {
    // parameter size is limited to 4096 chars
    // therefore we do not preserve all details about domain status(particularly details about certs)
    // in case of need, this information can be fetched directly through AWS API (see #getCertificatesRecordedInHostedZone)
    const cleanedStatus = status;
    delete cleanedStatus.regionalCert?.DomainValidationOptions;
    delete cleanedStatus.usEast1Cert?.DomainValidationOptions;
    delete cleanedStatus.regionalCert?.InUseBy;
    delete cleanedStatus.usEast1Cert?.InUseBy;
    delete cleanedStatus.regionalCert?.RenewalSummary;
    delete cleanedStatus.usEast1Cert?.RenewalSummary;
    await awsSdkManager.putSsmParameterValue({
      ssmParameterName: getSsmParameterNameForDomainInfo({ domainName, region: globalStateManager.region }),
      value: JSON.stringify(cleanedStatus)
    });
  };

  #fetchDomainStatuses = async ({ domains }: { domains: string[] }) => {
    this.publicHostedZones = await this.#listAllPublicHostedZones();
    await Promise.all(
      domains.map(async (domainName) => {
        validateDomain(domainName);
        const status = await this.#fetchDomainStatus(domainName);
        this.domainStatuses[domainName] = status;
      })
    );
  };

  #fetchDomainStatus = async (domainName: string): Promise<StpDomainStatus> => {
    const lookupNameServers = await this.resolveCurrentNameServersForDomain(domainName, true);
    // if we were unable to lookup nameservers, the domain is not registered
    if (!lookupNameServers) {
      return {
        registered: false,
        ownershipVerified: false,
        hostedZoneInfo: undefined,
        regionalCert: undefined,
        usEast1Cert: undefined
      };
    }
    const { nameServersMatch, zone } = await this.#findMatchingHostedZone(lookupNameServers, domainName);
    // we will create certificates for stacktape only after we are sure, we have domain under aws control.
    if (nameServersMatch) {
      // check certificates for domain
      // get info about all available certificates - both current region and eu-east-1 region
      const certificatesInfo = await this.#getCertificatesRecordedInHostedZone(zone.HostedZone.Id, domainName);
      return {
        registered: true,
        ownershipVerified: true,
        regionalCert: certificatesInfo?.regionalCert,
        usEast1Cert: certificatesInfo?.usEast1Cert,
        hostedZoneInfo: zone
      };
    }
    return {
      registered: true,
      ownershipVerified: false,
      hostedZoneInfo: zone,
      regionalCert: undefined,
      usEast1Cert: undefined
    };
  };

  getCertificateForDomain = (fullDomainName: string, attachingTo: StpDomainAttachableResourceType) => {
    // this.validateDomainUsability(fullDomainName);
    const cert = this.getCorrectCertForDomainAndResource(fullDomainName, attachingTo);
    const region = attachingTo === 'cdn' ? 'us-east-1' : globalStateManager.region;
    if (!cert) {
      throw stpErrors.e39({ fullDomainName, attachingTo, region });
    }
    if (cert.Status !== CertificateStatus.ISSUED) {
      throw stpErrors.e40({ fullDomainName, certificateStatus: cert.Status });
    }
    return cert.CertificateArn;
  };

  getCorrectCertForDomainAndResource = (
    fullDomainName: string,
    attachingTo: StpDomainAttachableResourceType
  ): CertificateDetail => {
    const domainStatus = this.getDomainStatus(fullDomainName);
    const domainLevelSplit = fullDomainName.split('.');
    if (domainLevelSplit.length > 3) {
      throw stpErrors.e41({ fullDomainName, region: globalStateManager.region, attachingTo });
    }
    return (
      (attachingTo !== 'cdn' && domainStatus?.regionalCert) || (attachingTo === 'cdn' && domainStatus?.usEast1Cert)
    );
  };

  validateDomainUsability = (fullDomainName: string) => {
    const domainStatus = this.getDomainStatus(fullDomainName);
    if (!domainStatus) {
      throw stpErrors.e88({ domainName: fullDomainName });
    }
    if (!domainStatus.registered) {
      throw stpErrors.e48({ domainName: fullDomainName });
    }
    if (!domainStatus?.ownershipVerified) {
      throw stpErrors.e49({
        domainName: fullDomainName,
        desiredNameServers: domainStatus.hostedZoneInfo?.DelegationSet?.NameServers
      });
    }
  };

  resolveCurrentNameServersForDomain = async (domainName: string, useWhois = false): Promise<string[] | undefined> => {
    let nameServers: string[];
    if (useWhois) {
      const domainNameTld = tldtsParse(domainName).publicSuffix;
      const dnsRegistrationBootstrapJson: { services: string[][] } = await jsonFetch(
        'https://data.iana.org/rdap/dns.json'
      );

      const ianaBootstrapFileEntry = dnsRegistrationBootstrapJson.services.find(([tlds]) =>
        tlds.includes(domainNameTld)
      );

      if (ianaBootstrapFileEntry) {
        const [, availableWhoisUrls] = ianaBootstrapFileEntry || [];

        const domainInfo = await jsonFetch(`${availableWhoisUrls[0]}domain/${domainName}`);

        nameServers = domainInfo.nameservers.map(({ ldhName }) => ldhName);
      }
      if (!nameServers) {
        const whoisResponse = await whoiser(domainName, { follow: 1 });
        // response may contain multiple search results from different WHOIS servers
        // we will take first one which contains nameservers
        nameServers = Object.values(whoisResponse).find(
          (serverResponse: WhoisSearchResult) => serverResponse?.['Name Server']
        )['Name Server'];
      }
      if (!nameServers) {
        nameServers = await this.dnsResolver.resolveNs(domainName);
      }
    } else {
      nameServers = await this.dnsResolver.resolveNs(domainName);
    }
    return nameServers.map((nameServer: string) => nameServer.toLowerCase());
  };

  #listAllPublicHostedZones = async () => {
    return (await awsSdkManager.listAllHostedZones()).filter(({ Config: { PrivateZone } }) => !PrivateZone);
  };

  #findMatchingHostedZone = async (lookupNameServers: string[], domainName: string) => {
    const relevantPublicHostedZones = await Promise.all(
      this.publicHostedZones
        .filter(({ Name }) => Name.startsWith(domainName))
        .map(async ({ Id }) => awsSdkManager.getInfoForHostedZone(Id))
    );

    const fullMatch = relevantPublicHostedZones.find(({ DelegationSet: { NameServers } }) => {
      return areStringArraysContentsEqual(NameServers, lookupNameServers);
    });

    if (fullMatch) {
      return { nameServersMatch: true, zone: fullMatch };
    }
    return {
      nameServersMatch: false,
      zone: relevantPublicHostedZones.find(
        ({
          HostedZone: {
            Config: { Comment }
          }
        }) => Comment.includes(COMMENT_FOR_STACKTAPE_ZONE)
      )
    };
  };

  // returns object StacktapeCertInfo
  // if object contains information about certificate, it means suitable certificate was found which also has record within hostedZone
  #getCertificatesRecordedInHostedZone = async (
    hostedZoneId: string,
    domainName: string
  ): Promise<StacktapeCertInfo> => {
    const [certsForDomain, usEast1CertsForDomain] = await Promise.all([
      Promise.all(
        (
          await awsSdkManager.listCertificatesForAccount(
            [CertificateStatus.ISSUED, CertificateStatus.PENDING_VALIDATION],
            false
          )
        )
          .filter(({ DomainName }) => DomainName === domainName)
          .map(({ CertificateArn }) => awsSdkManager.getCertificateInfo(CertificateArn))
      ),
      Promise.all(
        (
          await awsSdkManager.listCertificatesForAccount(
            [CertificateStatus.ISSUED, CertificateStatus.PENDING_VALIDATION],
            true
          )
        )
          .filter(({ DomainName }) => DomainName === domainName)
          .map(({ CertificateArn }) => awsSdkManager.getCertificateInfo(CertificateArn, true))
      )
    ]).then((certificateLists) =>
      certificateLists.map((certList) =>
        certList
          .filter(({ SubjectAlternativeNames }) =>
            SubjectAlternativeNames.find((alternativeDomainName) => alternativeDomainName === `*.${domainName}`)
          )
          .sort(({ CertificateArn: certArn1 }, { CertificateArn: certArn2 }) => certArn1.localeCompare(certArn2))
      )
    );

    if (!certsForDomain?.length) {
      return {};
    }
    const recordsForHostedZone = await awsSdkManager.getRecordsForHostedZone(hostedZoneId);

    const regionalCert = certsForDomain.find((certInfo) => {
      const { ResourceRecord } = certInfo.DomainValidationOptions[0];
      const validationRecord = recordsForHostedZone.find(({ Name }) => Name === ResourceRecord.Name);
      return validationRecord;
    });
    const usEast1Cert = usEast1CertsForDomain.find((certInfo) => {
      const { ResourceRecord } = certInfo.DomainValidationOptions[0];
      const validationRecord = recordsForHostedZone.find(({ Name }) => Name === ResourceRecord.Name);
      return validationRecord;
    });
    return { regionalCert, usEast1Cert };
  };
}

export const domainManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new DomainManager());
