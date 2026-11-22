import { ContentTree } from './ContentTree';
import type { DocsVersion } from '@/site-config';
import type { DocPage } from '@/utils/docs-data';

const SCROLL_STORAGE_KEY = '_stp-sidebar-scroll-pos';

// Of the two sidebars (desktop + mobile drawer) pick the one actually on screen.
const getScroller = (): HTMLElement | null =>
  [...document.querySelectorAll<HTMLElement>('[data-stp-sidebar-scroller]')].find((el) => el.offsetParent !== null) ??
  null;

const readSavedScroll = (): number => {
  try {
    return parseInt(window.sessionStorage.getItem(SCROLL_STORAGE_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
};
const writeSavedScroll = (value: number) => {
  try {
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, String(value));
  } catch {
    /* sandbox / quota — ignore */
  }
};

// Sidebar scroll persistence across `<ClientRouter />` navigations, wired ONCE at module scope
// (not in a React effect). The sidebar island uses `transition:persist`, so its DOM node is kept,
// but Astro freezes the island's React effects during the swap — a per-component `astro:*` listener
// is unreliable. Module-level `document` listeners always fire. The scroller's `scrollTop` is still
// intact at `astro:before-swap` (verified) but Astro resets it during the swap, so we capture it
// there and re-apply it after. The node move also fires a spurious `scroll` with scrollTop 0; a
// short mute window after each swap stops that from poisoning the saved offset.
if (typeof window !== 'undefined' && !(window as Window & { stpSidebarScrollInit?: boolean }).stpSidebarScrollInit) {
  (window as Window & { stpSidebarScrollInit?: boolean }).stpSidebarScrollInit = true;

  let saved = 0;
  let muteSavesUntil = 0;

  // A page opened directly (from search or a link) can sit far below the sidebar's first screen: bring it into view
  // without moving the page itself.
  const revealActiveRow = () => {
    const el = getScroller();
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !active) return;
    const rowTop = active.getBoundingClientRect().top - el.getBoundingClientRect().top;
    if (rowTop < 0 || rowTop > el.clientHeight - 48) el.scrollTop += rowTop - el.clientHeight / 3;
  };

  const applySaved = () => {
    const el = getScroller();
    if (el && saved > 0 && Math.abs(el.scrollTop - saved) > 1) el.scrollTop = saved;
  };

  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const saveDebounced = (value: number) => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saved = value;
      writeSavedScroll(value);
    }, 120);
  };
  saveDebounced.cancel = () => clearTimeout(saveTimer);

  // Track user scrolling (for hard-reload persistence). scroll doesn't bubble → capture phase.
  document.addEventListener(
    'scroll',
    (e) => {
      if (Date.now() < muteSavesUntil) return; // ignore the swap's spurious scroll(0)
      const el = getScroller();
      if (el && e.target === el) saveDebounced(el.scrollTop);
    },
    true
  );

  document.addEventListener('astro:before-swap', () => {
    muteSavesUntil = Date.now() + 600;
    saveDebounced.cancel();
    const el = getScroller();
    if (el) {
      saved = el.scrollTop; // still the user's real offset at this point
      writeSavedScroll(saved);
    }
  });
  // Re-apply immediately (the node move reset scrollTop) and once more after the 220ms expansion
  // animation settles (it can transiently clamp scrollTop).
  const restore = () => {
    requestAnimationFrame(applySaved);
    setTimeout(applySaved, 300);
  };
  document.addEventListener('astro:after-swap', restore);
  // First load / hard reload: seed from sessionStorage and restore once laid out.
  document.addEventListener('astro:page-load', () => {
    if (saved === 0) saved = readSavedScroll();
    requestAnimationFrame(() => {
      applySaved();
      revealActiveRow();
    });
  });
}

export function SidebarNavigation({
  allDocPages,
  pathname,
  version = 'v4'
}: {
  allDocPages: DocPage[];
  pathname?: string;
  version?: DocsVersion;
}) {
  return (
    <aside className="docs-sidebar">
      {/* `data-stp-sidebar-scroller` is the hook the module-level scroll-persistence listeners above use. */}
      <nav aria-label="Documentation" data-stp-sidebar-scroller className="docs-sidebar-scroller">
        <ContentTree allDocPages={allDocPages} pathname={pathname} version={version} />
      </nav>
    </aside>
  );
}
