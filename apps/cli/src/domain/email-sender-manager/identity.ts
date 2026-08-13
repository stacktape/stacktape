import { domainToASCII } from 'node:url';

const canonicalizeDomain = (domain: string) => {
  const withoutTrailingDot = domain.trim().replace(/\.$/, '');
  const ascii = domainToASCII(withoutTrailingDot).toLowerCase();
  const labels = ascii.split('.');
  if (
    !ascii ||
    ascii.length > 253 ||
    !ascii.includes('.') ||
    labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))
  ) {
    throw new TypeError(`Invalid email sender identity domain: ${domain}`);
  }
  return ascii;
};

export const canonicalizeEmailIdentity = (identity: string) => {
  const trimmed = identity.trim();
  const at = trimmed.lastIndexOf('@');
  if (at === -1) return canonicalizeDomain(trimmed);
  const localPart = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (
    !localPart ||
    localPart.length > 64 ||
    localPart.includes('@') ||
    !/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(localPart)
  ) {
    throw new TypeError(`Invalid email sender identity: ${identity}`);
  }
  const canonical = `${localPart}@${canonicalizeDomain(domain)}`;
  if (canonical.length > 254) throw new TypeError(`Invalid email sender identity: ${identity}`);
  return canonical;
};

export const isEmailAddressIdentity = (identity: string) => identity.includes('@');

export const getEmailIdentityDomain = (identity: string) => identity.slice(identity.lastIndexOf('@') + 1);
