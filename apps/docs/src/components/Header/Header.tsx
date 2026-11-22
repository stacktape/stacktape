import { useStore } from '@nanostores/react';
import { Menu, X } from 'react-feather';
import { BiLogoGithub } from 'react-icons/bi';
import { LuArrowUpRight } from 'react-icons/lu';
import { ANALYTICS_EVENTS } from '@stacktape/analytics/events';
import { trackMarketingAnalyticsEvent } from '@/utils/analytics';
import { $mobileNavOpen, toggleMobileNav } from '@/stores/mobile-nav';
import { Img as Image } from '@/components/Img';
import StacktapeFullLogo from '@/assets/logo-full-dark.svg';
import StacktapeLogo from '@/assets/logo.svg';
import { DocSearch } from '@/components/Search/DocSearch';

/**
 * The docs header: the brand (to the docs home), search on every screen size, and two quiet links. The Console is a
 * secondary destination here: new readers start with the CLI and are offered the Console after their first deploy.
 */
export function Header() {
  const isNavOpen = useStore($mobileNavOpen);

  return (
    <header className="docs-header">
      <div className="docs-header-inner">
        <a href="/" className="docs-brand" aria-label="Stacktape docs home">
          <Image className="docs-brand-full" width={124} height={22} src={StacktapeFullLogo} alt="Stacktape" />
          <Image className="docs-brand-mark" width={26} height={26} src={StacktapeLogo} alt="Stacktape" />
          <span className="docs-brand-label">Docs</span>
        </a>

        <div className="docs-header-search">
          <DocSearch />
        </div>

        <div className="docs-header-actions">
          <a
            className="docs-header-link"
            href="https://console.stacktape.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackMarketingAnalyticsEvent(ANALYTICS_EVENTS.marketingCtaClicked, {
                cta: 'sign_up',
                placement: 'docs_header'
              })
            }
          >
            Console
            <LuArrowUpRight size={14} aria-hidden />
          </a>
          <a
            className="docs-header-link"
            href="https://github.com/stacktape/stacktape"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackMarketingAnalyticsEvent(ANALYTICS_EVENTS.marketingCtaClicked, {
                cta: 'github',
                placement: 'docs_header'
              })
            }
          >
            <BiLogoGithub size={17} aria-hidden />
            GitHub
          </a>
          <button
            id="docs-nav-toggle"
            type="button"
            className="docs-header-icon-button"
            aria-label={isNavOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={isNavOpen}
            aria-controls="docs-drawer"
            onClick={() => toggleMobileNav()}
          >
            {isNavOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
      </div>
    </header>
  );
}
