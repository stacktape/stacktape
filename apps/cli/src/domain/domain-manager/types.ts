export type DomainMap = {
  [apexDomain: string]: { needUsEast1Certs?: boolean; needCurrentRegionCerts?: boolean };
};

export type CertificateDetail = import('@aws-sdk/client-acm').CertificateDetail;

export type HostedZoneInfo = import('@aws-sdk/client-route-53').GetHostedZoneResponse;

export type StacktapeCertInfo = {
  regionalCert?: CertificateDetail;
  usEast1Cert?: CertificateDetail;
  regionalCerts?: CertificateDetail[];
  usEast1Certs?: CertificateDetail[];
};

export type StpDomainStatus = {
  registered: boolean;
  ownershipVerified: boolean;
  regionalCert: CertificateDetail;
  usEast1Cert: CertificateDetail;
  regionalCerts?: CertificateDetail[];
  usEast1Certs?: CertificateDetail[];
  hostedZoneInfo: HostedZoneInfo;
};
