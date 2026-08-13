/**
 * #### Verified Amazon SES sender identity shared safely across projects and stages.
 *
 * ---
 *
 * Stacktape creates and protects the domain or email identity once per AWS account and region. Connecting a workload
 * grants only email-sending permissions and injects the identity, identity ARN, region, and configuration-set name.
 */
export interface EmailSender {
  type: 'email-sender';
  properties: EmailSenderProps;
}

export interface EmailSenderProps {
  /**
   * #### Domain or email address to verify as an SES sending identity.
   *
   * ---
   *
   * Use a domain such as `example.com` to send from any address on that domain, or an exact address such as
   * `billing@example.com` when you only control that mailbox.
   */
  identity: string;
  /**
   * #### Whether Stacktape owns the SES identity.
   *
   * ---
   *
   * Keep the default for the simplest setup and automatic reuse between projects and stages. Set this to `false`
   * only when the identity is managed outside Stacktape.
   *
   * @default true
   */
  manageIdentity?: boolean;
  /**
   * #### Existing SES configuration-set name.
   *
   * ---
   *
   * Only applies when `manageIdentity` is `false`. Omit it when applications send without a configuration set.
   */
  configurationSetName?: string;
}
