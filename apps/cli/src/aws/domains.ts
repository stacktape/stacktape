import type { CertificateDetail, CertificateStatus, ResourceRecord } from '@aws-sdk/client-acm';
import {
  DescribeCertificateCommand,
  ListCertificatesCommand,
  RequestCertificateCommand,
  type ACMClient
} from '@aws-sdk/client-acm';
import {
  ChangeResourceRecordSetsCommand,
  CreateHostedZoneCommand,
  GetHostedZoneCommand,
  ListHostedZonesCommand,
  ListResourceRecordSetsCommand,
  type HostedZone,
  type ResourceRecordSet,
  type Route53Client
} from '@aws-sdk/client-route-53';
import { ListPricesCommand, type DomainPrice, type Route53DomainsClient } from '@aws-sdk/client-route-53-domains';
import { GetIdentityVerificationAttributesCommand, VerifyDomainDkimCommand, type SESClient } from '@aws-sdk/client-ses';
import { GetAccountCommand, type SESv2Client } from '@aws-sdk/client-sesv2';
import { COMMENT_FOR_STACKTAPE_ZONE } from 'src/config/constants';
import { wait } from '@utils/misc';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsDomains {
  readonly #createAcmClient: (useUsEast1?: boolean) => ACMClient;
  readonly #createRoute53Client: () => Route53Client;
  readonly #createRoute53DomainsClient: () => Route53DomainsClient;
  readonly #createSesClient: () => SESClient;
  readonly #createSesV2Client: () => SESv2Client;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createAcmClient,
    createRoute53Client,
    createRoute53DomainsClient,
    createSesClient,
    createSesV2Client,
    getErrorHandler
  }: {
    createAcmClient: (useUsEast1?: boolean) => ACMClient;
    createRoute53Client: () => Route53Client;
    createRoute53DomainsClient: () => Route53DomainsClient;
    createSesClient: () => SESClient;
    createSesV2Client: () => SESv2Client;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createAcmClient = createAcmClient;
    this.#createRoute53Client = createRoute53Client;
    this.#createRoute53DomainsClient = createRoute53DomainsClient;
    this.#createSesClient = createSesClient;
    this.#createSesV2Client = createSesV2Client;
    this.#getErrorHandler = getErrorHandler;
  }

  listHostedZones = async (): Promise<HostedZone[]> => {
    const handleError = this.#getErrorHandler('Failed to list hosted zones.');
    let { HostedZones: hostedZones, NextMarker: nextMarker } = await this.#createRoute53Client()
      .send(new ListHostedZonesCommand({ MaxItems: 100 }))
      .catch(handleError);
    while (nextMarker) {
      const { HostedZones: newZones, NextMarker: newMarker } = await this.#createRoute53Client()
        .send(new ListHostedZonesCommand({ MaxItems: 100, Marker: nextMarker }))
        .catch(handleError);
      hostedZones = hostedZones.concat(newZones);
      nextMarker = newMarker;
    }
    return hostedZones;
  };

  getHostedZone = (hostedZoneId: string) => {
    const handleError = this.#getErrorHandler('Failed to get hosted zone details.');
    return this.#createRoute53Client()
      .send(new GetHostedZoneCommand({ Id: hostedZoneId }))
      .catch(handleError);
  };

  upsertCertificateValidationRecord = (hostedZoneId: string, resourceRecord: ResourceRecord) => {
    const handleError = this.#getErrorHandler(
      `Failed to create certificate validation record for hosted zone ${hostedZoneId}.`
    );
    return this.#createRoute53Client()
      .send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId: hostedZoneId,
          ChangeBatch: {
            Changes: [
              {
                Action: 'UPSERT',
                ResourceRecordSet: {
                  Name: resourceRecord.Name,
                  Type: resourceRecord.Type,
                  TTL: 300,
                  ResourceRecords: [{ Value: resourceRecord.Value }]
                }
              }
            ]
          }
        })
      )
      .catch(handleError);
  };

  listHostedZoneRecords = async (hostedZoneId: string) => {
    const handleError = this.#getErrorHandler(`Failed to get records for hosted zone ${hostedZoneId}.`);
    const result: ResourceRecordSet[] = [];
    let { ResourceRecordSets, IsTruncated, NextRecordName, NextRecordType, NextRecordIdentifier } =
      await this.#createRoute53Client()
        .send(new ListResourceRecordSetsCommand({ HostedZoneId: hostedZoneId }))
        .catch(handleError);
    result.push(...ResourceRecordSets);
    while (IsTruncated) {
      ({ ResourceRecordSets, IsTruncated, NextRecordName, NextRecordType, NextRecordIdentifier } =
        await this.#createRoute53Client()
          .send(
            new ListResourceRecordSetsCommand({
              HostedZoneId: hostedZoneId,
              StartRecordName: NextRecordName,
              StartRecordType: NextRecordType,
              StartRecordIdentifier: NextRecordIdentifier
            })
          )
          .catch(handleError));
      result.push(...ResourceRecordSets);
    }
    return result;
  };

  createHostedZone = (domainName: string) => {
    const handleError = this.#getErrorHandler(`Failed to create hosted zone for domain ${domainName}.`);
    return this.#createRoute53Client()
      .send(
        new CreateHostedZoneCommand({
          Name: domainName,
          CallerReference: `${Date.now()}-${domainName}`,
          HostedZoneConfig: { Comment: COMMENT_FOR_STACKTAPE_ZONE }
        })
      )
      .catch(handleError);
  };

  requestCertificate = async (domainName: string, useUsEast1Acm?: boolean) => {
    const handleError = this.#getErrorHandler(`Failed to request certificate for domain ${domainName}.`);
    const { CertificateArn: certificateArn } = await this.#createAcmClient(useUsEast1Acm)
      .send(
        new RequestCertificateCommand({
          DomainName: domainName,
          ValidationMethod: 'DNS',
          SubjectAlternativeNames: domainName.split('.').length === 2 ? [`*.${domainName}`] : undefined
        })
      )
      .catch(handleError);
    await wait(5000);
    let certificate = await this.getCertificate(certificateArn, useUsEast1Acm);
    while (!certificate.DomainValidationOptions?.some((option) => option.ResourceRecord)) {
      await wait(3000);
      certificate = await this.getCertificate(certificateArn, useUsEast1Acm);
    }
    return certificate;
  };

  listCertificates = async (statuses?: CertificateStatus[], useUsEast1Acm?: boolean) => {
    const handleError = this.#getErrorHandler('Failed to list certificates.');
    const response = await this.#createAcmClient(useUsEast1Acm)
      .send(new ListCertificatesCommand({ CertificateStatuses: statuses }))
      .catch(handleError);
    return response.CertificateSummaryList;
  };

  getCertificate = async (certificateArn: string, useUsEast1Acm?: boolean) => {
    const handleError = this.#getErrorHandler('Failed to fetch certificate details.');
    const response = await this.#createAcmClient(useUsEast1Acm)
      .send(new DescribeCertificateCommand({ CertificateArn: certificateArn }))
      .catch(handleError);
    return response.Certificate as CertificateDetail;
  };

  listTopLevelDomainPrices = async () => {
    const handleError = this.#getErrorHandler('Failed to list Route53 domain TLDs.');
    let { Prices: prices, NextPageMarker: nextPageMarker } = await this.#createRoute53DomainsClient()
      .send(new ListPricesCommand({ MaxItems: 100 }))
      .catch(handleError);
    let result: DomainPrice[] = prices;
    while (nextPageMarker) {
      ({ Prices: prices, NextPageMarker: nextPageMarker } = await this.#createRoute53DomainsClient()
        .send(new ListPricesCommand({ MaxItems: 100, Marker: nextPageMarker }))
        .catch(handleError));
      result = result.concat(prices);
    }
    return result;
  };

  getSesIdentitiesStatus = async (identities: string[]) => {
    const handleError = this.#getErrorHandler('Failed to list AWS SES identity statuses.');
    const { VerificationAttributes } = await this.#createSesClient()
      .send(new GetIdentityVerificationAttributesCommand({ Identities: identities }))
      .catch(handleError);
    return VerificationAttributes;
  };

  verifyDomainForSesUsingDkim = async (domainName: string) => {
    const handleError = this.#getErrorHandler(`Failed to verify domain ${domainName} for SES using DKIM.`);
    const result = await this.#createSesClient()
      .send(new VerifyDomainDkimCommand({ Domain: domainName }))
      .catch(handleError);
    return result.DkimTokens;
  };

  getSesAccount = () => {
    const handleError = this.#getErrorHandler('Failed to get AWS SES account information.');
    return this.#createSesV2Client().send(new GetAccountCommand({})).catch(handleError);
  };

  upsertDkimRecords = ({
    hostedZoneId,
    domainName,
    dkimTokens
  }: {
    hostedZoneId: string;
    domainName: string;
    dkimTokens: string[];
  }) => {
    const handleError = this.#getErrorHandler(`Failed to create DKIM records in hosted zone ${hostedZoneId}.`);
    return this.#createRoute53Client()
      .send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId: hostedZoneId,
          ChangeBatch: {
            Changes: dkimTokens.map((token) => ({
              Action: 'UPSERT',
              ResourceRecordSet: {
                Name: `${token}._domainkey.${domainName}`,
                Type: 'CNAME',
                TTL: 1800,
                ResourceRecords: [{ Value: `${token}.dkim.amazonses.com` }]
              }
            }))
          }
        })
      )
      .catch(handleError);
  };
}
