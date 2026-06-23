// Dev content hot-reload is handled natively by Astro's dev server + content collections, so the
// old polling-based `useHotReload` (which depended on next/router) is no longer needed. Kept as a
// no-op export in case anything still imports it.
export function useHotReload() {}
