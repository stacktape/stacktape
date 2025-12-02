import { merge } from 'lodash';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Menu } from 'react-feather';
import { BiRightArrowAlt } from 'react-icons/bi';
import { onMaxW650, onMaxW795 } from '@/styles/responsive';
import { colors, pageLayout } from '@/styles/variables';
import { trackAnalyticsEvent } from '@/utils/analytics';
import { useGlobalStore } from '../../../global-state';
import StacktapeFullLogo from '../../../static/assets/logo-full-dark.svg';
import StacktapeLogo from '../../../static/assets/logo.svg';
import { Button } from '../Button/Button';
import { IconButton } from '../Button/IconButton';
import { DocSearch } from '../Search/DocSearch';

function SignUpButton() {
  return (
    <Button
      visualType="primary"
      linkTo="https://console.stacktape.com/sign-up"
      onClick={() => trackAnalyticsEvent('sign-up', { source: 'header' })}
      text={
        <div css={{ margin: '0 auto' }}>
          <span css={{ alignItems: 'center', justifyContent: 'center', display: 'flex', gap: '10px' }}>
            <span css={{ paddingLeft: '4px' }}>Sign up</span>
            <BiRightArrowAlt css={{}} size={22} />
          </span>
        </div>
      }
      rootCss={{
        fontSize: '0.95rem',
        height: '35px',
        width: 150,
        [onMaxW650]: {
          width: '100%',
          padding: '0px 13px 0px 18px',
          height: '34px'
        }
      }}
    />
  );
}

function BookDemoButton({
  buttonWidth,
  rootCss,
  source = 'overview',
  text = 'Book a demo',
  visualType = 'secondary',
  dataCalLink = 'stacktape/30min'
}: {
  buttonWidth?: number;
  rootCss?: Css;
  source?: string;
  text?: string;
  visualType?: 'primary' | 'secondary';
  dataCalLink?: string;
}) {
  return (
    <div css={merge({ display: 'flex', alignItems: 'center', width: buttonWidth || '100%' }, rootCss)}>
      <Button
        visualType={visualType}
        height="38px"
        onClick={() => trackAnalyticsEvent('schedule-demo', { source })}
        dataCalLink={dataCalLink}
        data-cal-config={JSON.stringify({
          theme: 'dark'
        })}
        text={text}
      />
    </div>
  );
}

function DesktopNavigationItems() {
  return (
    <div
      css={{
        margin: '0px auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: pageLayout.maxPageWidth,
        [onMaxW795]: { display: 'none' }
      }}
    >
      <Link href="https://stacktape.com">
        <Image
          width={230}
          height={52}
          css={{
            marginBottom: '-3px',
            marginLeft: '-3px',
            [onMaxW795]: { display: 'none' }
          }}
          src={StacktapeFullLogo}
          alt="Stacktape"
        />
      </Link>
      <div css={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <DocSearch />
        <SignUpButton />
        <BookDemoButton source="header" buttonWidth={150} />
      </div>
    </div>
  );
}

function MobileNavItems() {
  const toggleMobileNavigation = useGlobalStore((store) => store.toggleMobileNavigation);
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = () => {
      toggleMobileNavigation(false);
    };
    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events, toggleMobileNavigation]);

  return (
    <div css={{ display: 'none', width: '100%', [onMaxW795]: { display: 'flex', justifyContent: 'space-between' } }}>
      <Link css={{}} href="https://stacktape.com">
        <Image width={52} height={52} src={StacktapeLogo} alt="Stacktape" />
      </Link>
      <div css={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <SignUpButton />
        <IconButton
          rootCss={{
            display: 'none',
            [onMaxW795]: {
              display: 'flex'
            }
          }}
          icon={<Menu size={27} />}
          onClick={() => toggleMobileNavigation()}
        />
      </div>
    </div>
  );
}

export function Header() {
  return (
    <header
      css={{
        height: pageLayout.headerHeight,
        backgroundColor: colors.backgroundColor,
        boxShadow: '1px 1px 4px #131313, -1px -1px 4px rgb(53 53 53 / 20%)',
        position: 'fixed',
        width: '100%',
        zIndex: 50,
        top: 0,
        left: 0,
        right: 0,
        padding: '0px 20px',
        [onMaxW795]: { padding: '0px 15px' }
      }}
    >
      <DesktopNavigationItems />
      <MobileNavItems />
    </header>
  );
}
