import debounce from 'lodash/debounce';
import clsx from 'clsx';
import { ContentTree } from './ContentTree';

const SCROLL_STORAGE_KEY = '_stp-sidebar-scroll-pos';

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
if (typeof window !== 'undefined' && !(window as Window & { __stpSidebarScrollInit?: boolean }).__stpSidebarScrollInit) {
  (window as Window & { __stpSidebarScrollInit?: boolean }).__stpSidebarScrollInit = true;

  let saved = 0;
  let muteSavesUntil = 0;
  // Of the two sidebars (desktop + mobile drawer) pick the one actually on screen.
  const getScroller = (): HTMLElement | null =>
    ([...document.querySelectorAll<HTMLElement>('[data-stp-sidebar-scroller]')].find((el) => el.offsetParent !== null) ??
      null);

  const applySaved = () => {
    const el = getScroller();
    if (el && saved > 0 && Math.abs(el.scrollTop - saved) > 1) el.scrollTop = saved;
  };

  const saveDebounced = debounce((value: number) => {
    saved = value;
    writeSavedScroll(value);
  }, 120);

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
    requestAnimationFrame(applySaved);
  });
}

export function SidebarNavigation({
  showOnSm,
  allDocPages,
  pathname
}: {
  showOnSm: boolean;
  allDocPages: MdxPageDataForNavigation[];
  pathname?: string;
}) {
  return (
    <nav
      className={clsx(
        'flex flex-col sticky top-[54px] left-0 right-0 h-[calc(100vh-54px)] w-[295px] min-w-[295px] overflow-x-hidden',
        'max-[795px]:top-[unset] max-[795px]:w-full max-[795px]:h-auto max-[795px]:border-r-0 max-[795px]:relative',
        showOnSm ? 'max-[795px]:block' : 'max-[795px]:hidden'
      )}
    >
      {/* `auto` reserves no space when content fits; `scroll` always reserved a track even when
          there was nothing to scroll, and the legacy `overlay`-on-hover swap caused the scrollbar
          to disappear when you tried to grab it. `data-stp-sidebar-scroller` is the hook the
          module-level scroll-persistence listeners above use to save/restore this offset. */}
      <div
        data-stp-sidebar-scroller
        className="stp-pretty-scrollbar block self-end w-full m-0 pt-5 overflow-y-auto border-r border-r-border-light [align-content:right] [-webkit-overflow-scrolling:touch] max-[795px]:w-full max-[795px]:bg-[unset] max-[795px]:px-3 max-[795px]:animate-grow-down"
      >
        <ContentTree allDocPages={allDocPages} pathname={pathname} />
        <div className="h-[25px]" />
      </div>
    </nav>
  );
}
