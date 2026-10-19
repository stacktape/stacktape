/** BusyBox 1.37.0, linux platform manifests. Pin each architecture so task definitions never follow a mutable tag. */
export const CLOUD_MAP_DRAIN_IMAGES = {
  amd64: 'sha256:66a6306db78bf2dbf3487f293aa8d6990d8e506fdffab9cc43fe422becf886e4',
  arm64: 'sha256:d82c2ab94640ded77cf76514ce6a84870761105058a4a9e51b05a8a79be97a6c'
} as const;

// Keep these tagged across release retention and ECR's untagged-image lifecycle policy, including for rollback.
export const cloudMapDrainImageTag = (digest: string) => `stp-cloudmap-drain-${digest.replace(':', '-')}`;
