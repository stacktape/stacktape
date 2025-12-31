import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { CertificateStatus } from '@aws-sdk/client-acm';
import { domainManager } from '@domain-services/domain-manager';
import { sesManager } from '@domain-services/ses-manager';
import { stpErrors } from '@errors';
import { consoleLinks } from '@shared/naming/console-links';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { parse as tldtsParse } from 'tldts';
import { loadUserCredentials } from '../_utils/initialization';

export const commandDomainAdd = async () => {
  const { domainName } = await tuiManager.prompt({
    type: 'text',
    name: 'domainName',
    message: 'Domain name (example: mydomain.com)'
  });
  const isRootDomain = !tldtsParse(domainName).subdomain;
  if (!isRootDomain) {
    throw stpErrors.e38({ domainName });
  }
  await loadUserCredentials();

  await domainManager.init({
    domains: [domainName]
  });
  const domainStatus = domainManager.getDomainStatus(domainName);
  if (!domainStatus.registered) {
    tuiManager.warn(`Domain ${tuiManager.makeBold(domainName)} is not registered. Register it first.`);
    tuiManager.hint(
      'Register via Route 53: https://us-east-1.console.aws.amazon.com/route53/home#DomainRegistration\n'
        .concat(`Prices start at $3/year for ${tuiManager.colorize('gray', '.click')}.\n`)
        .concat(`After purchase, re-run \`${tuiManager.prettyCommand('domain:add')}\`.`)
    );
    return;
  }
  let zoneInfo = domainStatus.hostedZoneInfo;
  if (!domainStatus.ownershipVerified) {
    // if there is NO hosted zone for our domain we will ask user if he wants to create it
    // he can than use this hosted zone to migrate his domain.
    console.info(`\n${tuiManager.colorize('gray', '-'.repeat(19))}\n`);
    tuiManager.info(
      [
        `DNS for ${tuiManager.makeBold(domainName)} is managed outside AWS.`,
        'To let Stacktape manage DNS/certs, move DNS to Route 53.',
        `${tuiManager.colorize('yellow', 'NOTE:')} Options: ${tuiManager.terminalLink(
          'https://docs.stacktape.com/other-resources/domains-and-certificates/',
          'docs'
        )}\n`
      ].join('\n')
    );
    const { controlDomainDnsWithAws } = await tuiManager.prompt({
      type: 'confirm',
      name: 'controlDomainDnsWithAws',
      message:
        "Do you wish to manage your domain's DNS records in your AWS account? (if unsure, read the docs (link above))."
    });
    if (!controlDomainDnsWithAws) {
      tuiManager.warn('Domain add canceled.');
      return;
    }

    console.info(
      `\n${tuiManager.colorize('gray', `${'-'.repeat(8)} ${tuiManager.colorize('green', '✓')} ${'-'.repeat(8)}`)}\n`
    );
    tuiManager.info('Route 53 hosted zones store DNS records.');

    if (!zoneInfo) {
      tuiManager.warn(
        [
          `No Route 53 hosted zone for ${tuiManager.makeBold(domainName)}.`,
          "Create one to manage the domain's DNS in AWS.",
          `${tuiManager.colorize('gray', 'Your registrar still controls the domain after creation.\n')}`
        ].join('\n')
      );

      const { createHostedZone } = await tuiManager.prompt({
        type: 'confirm',
        name: 'createHostedZone',
        message: `Proceed with creating hosted zone for the domain ${tuiManager.makeBold(domainName)} in your AWS account?`
      });
      if (!createHostedZone) {
        tuiManager.warn('Domain add canceled.');
        return;
      }
      zoneInfo = await awsSdkManager.createHostedZone(domainName);
      console.info(
        `\n${tuiManager.colorize('gray', `${'-'.repeat(8)} ${tuiManager.colorize('green', '✓')} ${'-'.repeat(8)}`)}\n`
      );
    }
    tuiManager.success(
      `Hosted zone created. Update your registrar to use these name servers:\n${tuiManager.colorize(
        'cyan',
        zoneInfo.DelegationSet.NameServers.map((ns) => `- ${ns}`).join('\n')
      )}`
    );
    console.info(
      `\n${tuiManager.colorize('gray', `${'-'.repeat(8)} ${tuiManager.colorize('green', '✓')} ${'-'.repeat(8)}`)}\n`
    );
    tuiManager.info(
      [
        'Next: set your registrar name servers to the values above.',
        "This tells your registrar to use Route 53 for your domain's DNS.\n"
      ].join('\n')
    );
    tuiManager.warn(
      `If the domain is already in use, copy existing DNS records into the hosted zone first: ${consoleLinks.route53HostedZone(
        zoneInfo.HostedZone.Id.split('/')[2]
      )}\n`
    );
    tuiManager.info(
      [
        'Update name servers at your registrar. Guides:',
        '- GoDaddy: https://www.godaddy.com/en-ph/help/edit-my-domain-nameservers-664',
        '- NameCheap: https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/',
        '- Hostinger: https://support.hostinger.com/en/articles/1696789-how-to-change-nameservers-at-hostinger',
        `${tuiManager.colorize('yellow', 'NOTE:')} Propagation can take hours to days.\n`
      ].join('\n')
    );
    tuiManager.hint(
      [
        `Re-run \`${tuiManager.prettyCommand('domain:add')}\` to verify DNS ownership.`,
        'If valid, you will get the next steps for TLS certs.\n'
      ].join('\n')
    );

    domainStatus.hostedZoneInfo = zoneInfo;
    await domainManager.storeDomainStatusIntoParameterStore({ domainName, status: domainStatus });
    return;
  }
  tuiManager.success('Domain ownership verified.');
  let regionalCert = domainStatus.regionalCert;
  let usEast1Cert = domainStatus.usEast1Cert;
  if (!regionalCert || !usEast1Cert) {
    tuiManager.warn(`Stacktape can create free TLS certs for ${tuiManager.makeBold(domainName)} in your AWS account.`);
    const { generateCerts } = await tuiManager.prompt({
      type: 'confirm',
      name: 'generateCerts',
      message: `Do you wish to generate certificates for ${tuiManager.makeBold(domainName)} in your AWS account?`
    });
    if (!generateCerts) {
      tuiManager.warn('Domain add canceled.');
      await domainManager.storeDomainStatusIntoParameterStore({ domainName, status: domainStatus });
      return;
    }
    [regionalCert, usEast1Cert] = await Promise.all(
      [awsSdkManager.requestCertificateForDomainName(domainName, false)].concat(
        globalStateManager.region !== 'us-east-1' ? awsSdkManager.requestCertificateForDomainName(domainName, true) : []
      )
    );
  }
  tuiManager.success(`TLS certificate requests created for ${domainName}.`);
  if (regionalCert.Status !== CertificateStatus.ISSUED) {
    await awsSdkManager.createCertificateValidationRecordInHostedZone(
      zoneInfo.HostedZone.Id,
      regionalCert.DomainValidationOptions.find((domainValOpt) => domainValOpt.ResourceRecord).ResourceRecord
    );
    tuiManager.success('Added DNS validation record(s) to the hosted zone.');
    tuiManager.info('Certificate validation can take a few minutes.');
    tuiManager.hint(
      `Re-run \`${tuiManager.prettyCommand('domain:add')}\` in a few minutes to check status.`
    );
    domainStatus.regionalCert = regionalCert;
    domainStatus.usEast1Cert = usEast1Cert;
    await domainManager.storeDomainStatusIntoParameterStore({ domainName, status: domainStatus });
    return;
  }
  tuiManager.success('TLS certificates validated.');
  await sesManager.init({ identities: [domainName] });
  if (!sesManager.isIdentityVerified({ identity: domainName })) {
    tuiManager.info('Optional: verify domain for AWS SES to send email. Free.');
    const { prepareForSES } = await tuiManager.prompt({
      type: 'confirm',
      name: 'prepareForSES',
      message: 'Do you wish to verify your domain for using with AWS SES?'
    });
    if (prepareForSES) {
      const dkimTokens = await awsSdkManager.verifyDomainForSesUsingDkim({ domainName });
      await awsSdkManager.createDkimAuthenticationRecordInHostedZone({
        hostedZoneId: zoneInfo.HostedZone.Id,
        domainName,
        dkimTokens
      });
      tuiManager.success('SES verification records added.');
      tuiManager.info('SES verification can take a few minutes.');
    }
  } else {
    tuiManager.success('Domain verified for AWS SES.');
  }
  domainStatus.regionalCert = regionalCert;
  domainStatus.usEast1Cert = usEast1Cert;
  await domainManager.storeDomainStatusIntoParameterStore({ domainName, status: domainStatus });
  tuiManager.success(`Domain ready to use in ${globalStateManager.region}.`);
};
