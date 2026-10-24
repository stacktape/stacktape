/**
 * Where a dev stack's functions run in the dev network, decided by `stacktape dev` before it synthesizes the stack.
 * Synthesis reads it from the config manager's deployment context; it is part of the dev stack fingerprint, so a
 * changed lease, password or network redeploys the stack.
 */
export type DevNetworkPlacement = {
  subnetIds: string[];
  securityGroupId: string;
  /** Functions placed in the network, with the locally emulated resources each one reaches through the relay. */
  functions: Record<string, string[]>;
  /**
   * Each relayed local resource as deployed functions see it: its referenceable parameters with the box's private IP
   * and the leased port, and environment variables its clients need besides them.
   */
  localResources: Record<string, { params: Record<string, string>; environment: Record<string, string> }>;
};
