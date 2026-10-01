export type CertificateDetail = import('@aws-sdk/client-acm').CertificateDetail;

type HostedZoneInfo = import('@aws-sdk/client-route-53').GetHostedZoneResponse;

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
