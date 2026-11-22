import { useStore } from '@nanostores/react';
import { useEffect, useRef } from 'react';
import { $mobileNavOpen, toggleMobileNav } from '@/stores/mobile-nav';
import { ContentTree } from '../SidebarNavigation/ContentTree';
import type { DocsVersion } from '@/site-config';
import type { DocPage } from '@/utils/docs-data';

/**
 * The phone navigation: a panel under the header with its own scroll, opened from the header's menu button. It opens
 * with the current page in view, closes on Escape or after navigating, and returns focus to the menu button.
 * Search stays in the header, so it is available whether the panel is open or not.
 */
export function MobileHamburgerNavigation({
  allDocPages,
  pathname,
  version = 'v4'
}: {
  allDocPages: DocPage[];
  pathname?: string;
  version?: DocsVersion;
}) {
  const isOpen = useStore($mobileNavOpen);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (!isOpen) return;
    const active = panel.querySelector<HTMLElement>('[aria-current="page"]');
    const activeTop = active ? active.getBoundingClientRect().top - panel.getBoundingClientRect().top : 0;
    panel.scrollTop = Math.max(0, panel.scrollTop + activeTop - panel.clientHeight / 3);
    panel.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      toggleMobileNav(false);
      document.getElementById('docs-nav-toggle')?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <div
      id="docs-drawer"
      ref={panelRef}
      tabIndex={-1}
      className={isOpen ? 'docs-drawer is-open' : 'docs-drawer'}
      inert={!isOpen}
    >
      <nav aria-label="Documentation" className="docs-sidebar-scroller">
        <ContentTree allDocPages={allDocPages} pathname={pathname} version={version} />
      </nav>
    </div>
  );
}
