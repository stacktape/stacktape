type DomainMap = {
  [apexDomain: string]: { needUsEast1Certs?: boolean; needCurrentRegionCerts?: boolean };
};

type CertificateDetail = import('@aws-sdk/client-acm').CertificateDetail;

type HostedZoneInfo = import('@aws-sdk/client-route-53').GetHostedZoneResponse;

type StacktapeCertInfo = {
  regionalCert?: CertificateDetail;
  usEast1Cert?: CertificateDetail;
};
