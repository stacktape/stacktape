type Connection = { id: string; name: string; awsAccountId?: string | null; state: string };

/**
 * Connection names are unique in an organization. Each AWS account gets its own, `aws-<account ID>`, and a number
 * when an earlier attempt that never activated still holds the name.
 */
export const connectionNameFor = ({ awsAccountId, takenNames }: { awsAccountId: string; takenNames: string[] }) => {
  const base = `aws-${awsAccountId}`;
  if (!takenNames.includes(base)) return base;
  for (let attempt = 2; ; attempt++) {
    const candidate = `${base}-${attempt}`;
    if (!takenNames.includes(candidate)) return candidate;
  }
};

/** Connections an earlier `stacktape connect` of this account started that were not active when the CLI last read them. */
export const earlierAttemptsFor = ({
  awsAccountId,
  connections
}: {
  awsAccountId: string;
  connections: Connection[];
}) => {
  const base = `aws-${awsAccountId}`;
  return connections.filter(
    ({ name, state }) => state !== 'ACTIVE' && (name === base || new RegExp(`^${base}-\\d+$`).test(name))
  );
};
