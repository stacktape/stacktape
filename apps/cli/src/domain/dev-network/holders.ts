import { getDevNetworkHolderParameterPrefix } from '@stacktape/naming/shared-stacks';
import { awsSdkManager } from '@utils/aws-sdk-manager';

/**
 * Which `stacktape dev` session holds a stage. The relay on the dev box decides who holds a stage; this record lets a
 * start refuse a stage that runs elsewhere with one SSM read, before it loads the stack or prepares the dev network.
 * A session writes it once it holds the stage and refreshes it while it runs, so a record that stopped changing belongs
 * to a session that ended without removing it.
 */
export type StageHolder = {
  /** The holder as other sessions see it (`RelayOwner`). */
  owner: string;
  label: string;
  session: string;
  /** Seconds since the epoch: when the holder took the stage. */
  since: number;
};

export type StageHolderStore = {
  read: (name: string) => Promise<{ value: string; modifiedAt?: Date } | undefined>;
  write: (name: string, value: string) => Promise<void>;
  delete: (name: string) => Promise<void>;
};

export const createStageHolderStore = (): StageHolderStore => ({
  read: async (name) => {
    const [parameter] = await awsSdkManager.parameterStore.getMany({ names: [name] });
    return parameter?.Value === undefined
      ? undefined
      : { value: parameter.Value, modifiedAt: parameter.LastModifiedDate };
  },
  write: async (name, value) => {
    await awsSdkManager.parameterStore.put({ name, value });
  },
  delete: async (name) => {
    await awsSdkManager.parameterStore.delete({ name });
  }
});

/** How often a running session refreshes its record. */
export const STAGE_HOLDER_REFRESH_MS = 60_000;
/** A record older than this belongs to a session that has ended; the relay check decides then. */
export const STAGE_HOLDER_FRESH_MS = 3 * STAGE_HOLDER_REFRESH_MS;

export const getStageHolderParameterName = ({ networkName, stackName }: { networkName: string; stackName: string }) =>
  `${getDevNetworkHolderParameterPrefix(networkName)}/${stackName}`;

const parseHolder = (value: string): StageHolder | undefined => {
  try {
    const holder = JSON.parse(value) as Partial<StageHolder>;
    return typeof holder.owner === 'string' &&
      typeof holder.label === 'string' &&
      typeof holder.session === 'string' &&
      typeof holder.since === 'number'
      ? (holder as StageHolder)
      : undefined;
  } catch {
    return undefined;
  }
};

/** The session the record names, unless the record is older than `STAGE_HOLDER_FRESH_MS` or unreadable. */
export const readStageHolder = async ({
  store,
  name,
  now = Date.now()
}: {
  store: StageHolderStore;
  name: string;
  now?: number;
}): Promise<StageHolder | undefined> => {
  const record = await store.read(name);
  if (!record?.modifiedAt || now - record.modifiedAt.getTime() > STAGE_HOLDER_FRESH_MS) return undefined;
  return parseHolder(record.value);
};

/**
 * Records `holder` as the session of the stage and refreshes the record until `release`, which deletes it. Once
 * another session took the stage over, the record is theirs: it is neither refreshed nor deleted any more.
 */
export const holdStage = async ({
  store,
  name,
  holder,
  refreshMs = STAGE_HOLDER_REFRESH_MS
}: {
  store: StageHolderStore;
  name: string;
  holder: StageHolder;
  refreshMs?: number;
}) => {
  // Each refresh writes a new value, so the parameter's modification time moves.
  const value = () => JSON.stringify({ ...holder, refreshedAt: Math.floor(Date.now() / 1000) });
  const isOurs = async () => {
    const record = await store.read(name);
    return record !== undefined && parseHolder(record.value)?.session === holder.session;
  };
  await store.write(name, value());
  let lost = false;
  const timer = setInterval(async () => {
    try {
      if (lost || !(await isOurs())) {
        lost = true;
        return;
      }
      await store.write(name, value());
    } catch {
      // A failed refresh is retried with the next one; the relay stays the authority meanwhile.
    }
  }, refreshMs);
  timer.unref();
  return {
    release: async () => {
      clearInterval(timer);
      if (!lost && (await isOurs())) await store.delete(name);
    }
  };
};
