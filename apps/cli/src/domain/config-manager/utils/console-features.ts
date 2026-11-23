import type { ConfigManager } from '../index';
import { CliError } from '@utils/errors';

/**
 * One configuration feature that only works with the Stacktape Console, and how to do without it. `feature` is the
 * start of a sentence, up to and including its verb.
 */
export type ConsoleOnlyFeature = { feature: string; remove: string };

const CONSOLE_OFFER = 'the Stacktape Console (free up to $200/month of AWS spend)';
const CONNECT = 'Run: stacktape connect — your stacks are added as they are, no redeploy.';

const names = (items: { name: string }[]) => items.map(({ name }) => `\`${name}\``).join(', ');

/**
 * A load balancer without its own domain or certificate is served on a `*.stacktape-app.com` default domain, which the
 * Console provides. HTTP APIs and CDNs fall back to their AWS URLs instead; a TLS listener has no such fallback.
 */
const loadBalancersNeedingDefaultDomain = (configManager: ConfigManager) => [
  ...configManager.allApplicationLoadBalancers.filter(
    ({ customDomains, listeners, cdn }) =>
      (!customDomains?.length && !listeners?.some(({ customCertificateArns }) => customCertificateArns?.length)) ||
      (cdn?.enabled && !cdn.customDomains?.length)
  ),
  ...configManager.allNetworkLoadBalancers.filter(
    ({ customDomains, listeners }) =>
      !customDomains?.length &&
      listeners.some(({ protocol, customCertificateArns }) => protocol === 'TLS' && !customCertificateArns?.length)
  ),
  // The dashboard needs a domain only while it is enabled; a dashboard domain is rejected when it is off.
  ...configManager.convexes.filter(
    ({ customDomains, dashboard }) =>
      !customDomains?.cloud || !customDomains?.site || (dashboard?.enabled !== false && !customDomains?.dashboard)
  )
];

/** The features of this configuration that the Console provides. Without an API key, each one fails validation. */
export const findConsoleOnlyFeatures = (configManager: ConfigManager): ConsoleOnlyFeature[] => {
  const features: ConsoleOnlyFeature[] = [];
  const uptimeChecks = configManager.uptimeChecks;
  if (uptimeChecks.length) {
    features.push({
      feature: `Uptime checks (${names(uptimeChecks)}) need`,
      remove: 'remove the uptime-check resources'
    });
  }
  const consoleChannelTypes = [
    ...new Set(
      configManager.allAlarmNotificationChannels
        .map(({ type }) => type)
        .filter((type) => type === 'console-channel' || type === 'slack-app')
    )
  ];
  if (consoleChannelTypes.length) {
    features.push({
      feature: `Alarm notification channels of type ${consoleChannelTypes.map((type) => `\`${type}\``).join(' and ')} need`,
      remove:
        'use a channel the stack delivers itself (slack, ms-teams, discord, email or webhook) or remove these channels'
    });
  }
  const errorTracking = configManager.config?.deploymentConfig?.errorTracking;
  if (errorTracking?.enabled === true || (errorTracking?.enabled !== false && errorTracking?.stages?.length)) {
    features.push({
      feature: 'Error tracking (`deploymentConfig.errorTracking`) needs',
      remove: 'remove deploymentConfig.errorTracking'
    });
  }
  const loadBalancers = loadBalancersNeedingDefaultDomain(configManager);
  if (loadBalancers.length) {
    features.push({
      feature: `The *.stacktape-app.com default domain of ${names(loadBalancers)} needs`,
      remove: 'add customDomains with your own domain'
    });
  }
  return features;
};

export const consoleOnlyFeaturesError = (features: ConsoleOnlyFeature[]) =>
  new CliError({
    category: 'CONFIG_VALIDATION',
    code: 'CONFIG_NEEDS_CONSOLE',
    message: features.map(({ feature, remove }) => `${feature} ${CONSOLE_OFFER}. ${CONNECT} Or ${remove}.`).join('\n'),
    hints:
      'Without a Stacktape API key the CLI works without the Console. Signing in with `stacktape login` also enables these features.'
  });
