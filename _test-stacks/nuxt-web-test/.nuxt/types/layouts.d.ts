import type { ComputedRef, MaybeRef } from 'vue'
declare module 'nuxt/app' {
  interface NuxtLayouts {
}
  export type LayoutKey = keyof NuxtLayouts extends never ? string : keyof NuxtLayouts
  interface PageMeta {
    layout?: MaybeRef<LayoutKey | false> | ComputedRef<LayoutKey | false>
  }
}