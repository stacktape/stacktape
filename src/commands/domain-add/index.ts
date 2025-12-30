import { globalStateManager } from '@application-services/global-state-manager';
import { CertificateStatus } from '@aws-sdk/client-acm';
import { domainManager } from '@domain-services/domain-manager';
import { sesManager } from '@domain-services/ses-manager';
import { stpErrors } from '@errors';
import { consoleLinks } from '@shared/naming/console-links';
import { userPrompt } from '@shared/utils/user-prompt';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { tuiManager } from '@utils/tui';
import { parse as tldtsParse } from 'tldts';
import { loadUserCredentials } from '../_utils/initialization';

export const commandDomainAdd = async () => {
  const { domainName } = await userPrompt({
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
    tuiManager.warn(`Domain ${tuiManager.makeBold(domainName)} is not registered.`);
    tuiManager.hint(
      'You can register/buy the domain through AWS console: https://us-east-1.console.aws.amazon.com/route53/home#DomainRegistration:\n'
        .concat(`Prices of domains start at $3/year for ${tuiManager.colorize('gray', '.click')} domains.\n`)
        .concat('After buying the domain run this command again to prepare the domain for using with Stacktape.')
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
        `DNS records of domain ${tuiManager.makeBold(
          domainName
        )} are currently managed by 3rd party domain registrar or DNS provider.`,
        'If you are the domain owner and wish to control the domain with Stacktape, DNS records for the domain must be managed in your AWS account.',
        "When your domain's DNS records are managed in your AWS account, Stacktape can generate required certificates and assign domains during deployment.",

        `${tuiManager.colorize('yellow', 'NOTE:')} To understand possible options for handling domains refer to our ${tuiManager.terminalLink('https://docs.stacktape.com/other-resources/domains-and-certificates/', 'docs')}.\n`
      ].join('\n')
    );
    const { controlDomainDnsWithAws } = await userPrompt({
      type: 'confirm',
      name: 'controlDomainDnsWithAws',
      message:
        "Do you wish to manage your domain's DNS records in your AWS account? (if unsure, read the docs (link above))."
    });
    if (!controlDomainDnsWithAws) {
      tuiManager.warn('Aborting adding domain...');
      return;
    }

    console.info(
      `\n${tuiManager.colorize('gray', `${'-'.repeat(8)} ${tuiManager.colorize('green', '✓')} ${'-'.repeat(8)}`)}\n`
    );
    tuiManager.info(
      'DNS records for domains are managed in hosted zones. (Hosted zone is a "container" for storing DNS records of your domain.)'
    );

    if (!zoneInfo) {
      tuiManager.warn(
        [
          `Currently, the domain ${tuiManager.makeBold(domainName)} has no hosted zone created in your AWS account.`,
          "If you wish to manage your domain's DNS records in your AWS account, free hosted zone must be created in your AWS account.",
          `${tuiManager.colorize('gray', 'After creating the hosted zone, your domain will still be under control of your 3rd party registrar.\n')}`
        ].join('\n')
      );

      const { createHostedZone } = await userPrompt({
        type: 'confirm',
        name: 'createHostedZone',
        message: `Proceed with creating hosted zone for the domain ${tuiManager.makeBold(domainName)} in your AWS account?`
      });
      if (!createHostedZone) {
        tuiManager.warn('Aborting adding domain...');
        return;
      }
      zoneInfo = await awsSdkManager.createHostedZone(domainName);
      console.info(
        `\n${tuiManager.colorize('gray', `${'-'.repeat(8)} ${tuiManager.colorize('green', '✓')} ${'-'.repeat(8)}`)}\n`
      );
    }
    tuiManager.success(
      `Hosted zone for domain ${tuiManager.makeBold(
        domainName
      )} is created in your AWS account but is not yet used by the domain.\nName servers of the AWS hosted zone are:\n${tuiManager.colorize(
        'cyan',
        zoneInfo.DelegationSet.NameServers.map((ns) => `- ${ns}`).join('\n')
      )}`
    );
    console.info(
      `\n${tuiManager.colorize('gray', `${'-'.repeat(8)} ${tuiManager.colorize('green', '✓')} ${'-'.repeat(8)}`)}\n`
    );
    tuiManager.info(
      [
        'Next step is to modify name server (NS) records of your domain to point to the name servers of the AWS hosted zone (listed above).',
        'By doing this you "inform" your domain registrar that your AWS hosted zone will be from now on managing your domain\'s DNS records.\n'
      ].join('\n')
    );
    tuiManager.warn(
      `If your domain is already in use: Before modifying name server records, you must copy existing DNS records from your current DNS provider (probably your registrar), into the AWS hosted zone: ${consoleLinks.route53HostedZone(
        zoneInfo.HostedZone.Id.split('/')[2]
      )}\n`
    );
    tuiManager.info(
      [
        'Name server records are managed at your domain registrar.',
        'To modify them, you need to log into your domain registrar and set them manually to the name servers listed above.',
        'See tutorials for most common registrars:',
        '- GoDaddy: https://www.godaddy.com/en-ph/help/edit-my-domain-nameservers-664',
        '- NameCheap: https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/',
        '- Hostinger: https://support.hostinger.com/en/articles/1696789-how-to-change-nameservers-at-hostinger',
        `${tuiManager.colorize('yellow', 'NOTE:')} After setting the name servers, it can take hours to days for this change to be propagated.\n`
      ].join('\n')
    );
    tuiManager.hint(
      [
        `You can validate if the domain's DNS records are in control of your AWS hosted zone by re-running ${tuiManager.prettyCommand('domain:add')} command.`,
        'If they are, the command will prompt you with next steps (creating and validating TLS certs).\n'
      ].join('\n')
    );

    domainStatus.hostedZoneInfo = zoneInfo;
    await domainManager.storeDomainStatusIntoParameterStore({ domainName, status: domainStatus });
    return;
  }
  tuiManager.success('Domain ownership validated successfully');
  let regionalCert = domainStatus.regionalCert;
  let usEast1Cert = domainStatus.usEast1Cert;
  if (!regionalCert || !usEast1Cert) {
    tuiManager.warn(
      `To use domain ${tuiManager.makeBold(
        domainName
      )} Stacktape wants to generate FREE TLS certificates in your AWS account`
    );
    const { generateCerts } = await userPrompt({
      type: 'confirm',
      name: 'generateCerts',
      message: `Do you wish to generate certificates for ${tuiManager.makeBold(domainName)} in your AWS account?`
    });
    if (!generateCerts) {
      tuiManager.warn('Aborting adding domain...');
      await domainManager.storeDomainStatusIntoParameterStore({ domainName, status: domainStatus });
      return;
    }
    [regionalCert, usEast1Cert] = await Promise.all(
      [awsSdkManager.requestCertificateForDomainName(domainName, false)].concat(
        globalStateManager.region !== 'us-east-1' ? awsSdkManager.requestCertificateForDomainName(domainName, true) : []
      )
    );
  }
  tuiManager.success(`Certificates for the domain ${domainName} are created.`);
  if (regionalCert.Status !== CertificateStatus.ISSUED) {
    await awsSdkManager.createCertificateValidationRecordInHostedZone(
      zoneInfo.HostedZone.Id,
      regionalCert.DomainValidationOptions.find((domainValOpt) => domainValOpt.ResourceRecord).ResourceRecord
    );
    tuiManager.success('Added validation DNS record for certificates into hosted zone.');
    tuiManager.info('It can take few minutes before certificates are validated and ready to be used.');
    tuiManager.hint(
      `Re-run command ${tuiManager.prettyCommand(
        'domain:add'
      )} in a few minutes to confirm that the domain and certificates are ready to be used.`
    );
    domainStatus.regionalCert = regionalCert;
    domainStatus.usEast1Cert = usEast1Cert;
    await domainManager.storeDomainStatusIntoParameterStore({ domainName, status: domainStatus });
    return;
  }
  tuiManager.success('Certificates validated successfully!');
  await sesManager.init({ identities: [domainName] });
  if (!sesManager.isIdentityVerified({ identity: domainName })) {
    tuiManager.info(
      'Your domain can be automatically verified for use with AWS SES (Simple Email Service). This will enable you to send automated emails from addresses under your domain.\n' +
        'Enabling this feature is FREE and can be useful i.e when sending alert email notifications.'
    );
    const { prepareForSES } = await userPrompt({
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
      tuiManager.success('Domain verification for AWS SES complete.');
      tuiManager.info('It can take few minutes before AWS SES verification is complete.');
    }
  } else {
    tuiManager.success('Domain is verified for using with AWS SES.');
  }
  domainStatus.regionalCert = regionalCert;
  domainStatus.usEast1Cert = usEast1Cert;
  await domainManager.storeDomainStatusIntoParameterStore({ domainName, status: domainStatus });
  tuiManager.success(`Domain "${domainName}" is prepared to be used in region ${globalStateManager.region}.`);
};
