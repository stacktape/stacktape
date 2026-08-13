import { createHash } from 'node:crypto';

type EmailSenderBinding = {
  configurationSetName?: string;
  identity: string;
  manageIdentity?: boolean;
  name: string;
};

type ResourceBinding = {
  connectTo?: string[];
  name: string;
  nameChain?: string[];
};

const FINGERPRINT_VERSION = 1;
const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

export const getEmailSenderBindingsFingerprint = ({
  resources,
  senders
}: {
  resources: ResourceBinding[];
  senders: EmailSenderBinding[];
}) => {
  const senderNames = new Set(senders.map(({ name }) => name));
  const edges = new Map<string, { resource: string; sender: string }>();
  for (const { connectTo, name, nameChain } of resources) {
    const resource = nameChain?.join('.') || name;
    for (const target of connectTo ?? []) {
      if (typeof target === 'string' && senderNames.has(target)) {
        edges.set(`${resource}\0${target}`, { resource, sender: target });
      }
    }
  }
  const bindings = {
    senders: senders
      .map(({ configurationSetName, identity, manageIdentity, name }) => ({
        configurationSetName: manageIdentity === false ? (configurationSetName ?? null) : null,
        identity,
        mode: manageIdentity === false ? ('external' as const) : ('managed' as const),
        name
      }))
      .sort((left, right) => compareText(left.name, right.name) || compareText(left.identity, right.identity)),
    edges: [...edges.values()].sort(
      (left, right) => compareText(left.resource, right.resource) || compareText(left.sender, right.sender)
    )
  };
  const digest = createHash('sha256').update(JSON.stringify(bindings), 'utf8').digest('hex').slice(0, 24);
  return `v${FINGERPRINT_VERSION}:${digest}`;
};

export const emailSenderBindingsNeedDevStackUpdate = ({
  deployedFingerprint,
  desiredFingerprint,
  hasEmailSenders
}: {
  deployedFingerprint: unknown;
  desiredFingerprint: string;
  hasEmailSenders: boolean;
}) => {
  if (typeof deployedFingerprint !== 'string') return hasEmailSenders;
  return deployedFingerprint !== desiredFingerprint;
};
