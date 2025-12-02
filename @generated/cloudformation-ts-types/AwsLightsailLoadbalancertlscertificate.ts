// This file is auto-generated. Do not edit manually.
// Source: aws-lightsail-loadbalancertlscertificate.json

/** Resource Type definition for AWS::Lightsail::LoadBalancerTlsCertificate */
export type AwsLightsailLoadbalancertlscertificate = {
  /**
   * The name of your load balancer.
   * @pattern \w[\w\-]*\w
   */
  LoadBalancerName: string;
  /** The SSL/TLS certificate name. */
  CertificateName: string;
  /** The domain name (e.g., example.com ) for your SSL/TLS certificate. */
  CertificateDomainName: string;
  /**
   * An array of strings listing alternative domains and subdomains for your SSL/TLS certificate.
   * @uniqueItems true
   */
  CertificateAlternativeNames?: string[];
  LoadBalancerTlsCertificateArn?: string;
  /** When true, the SSL/TLS certificate is attached to the Lightsail load balancer. */
  IsAttached?: boolean;
  /** A Boolean value that indicates whether HTTPS redirection is enabled for the load balancer. */
  HttpsRedirectionEnabled?: boolean;
  /** The validation status of the SSL/TLS certificate. */
  Status?: string;
};
