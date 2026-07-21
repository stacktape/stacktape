import type { CSSProperties } from 'react';
import clsx from 'clsx';
import { Menu } from 'react-feather';
import { BiLogoGithub, BiRightArrowAlt } from 'react-icons/bi';
import { trackAnalyticsEvent } from '@/utils/analytics';
import { toggleMobileNav } from '@/stores/mobile-nav';
import { Img as Image } from '@/components/Img';
import { Anchor as Link } from '@/components/Anchor';
import StacktapeFullLogo from '../../assets/logo-full-dark.svg';
import StacktapeLogo from '../../assets/logo.svg';
import { Button } from '../Button/Button';
import { IconButton } from '../Button/IconButton';
import { DocSearch } from '../Search/DocSearch';

function SignUpButton() {
  return (
    <Button
      visualType="primary"
      linkTo="https://console.stacktape.com/sign-up"
      width={150}
      height="35px"
      onClick={() => trackAnalyticsEvent('sign-up', { source: 'header' })}
      text={
        <div className="mx-auto">
          <span className="flex items-center justify-center gap-[10px]">
            <span className="pl-[4px]">Sign up</span>
            <BiRightArrowAlt size={22} />
          </span>
        </div>
      }
      // width/height come from props (Button applies them inline). The mobile overrides need `!` so
      // they beat that inline style.
      rootClassName="text-[0.95rem] max-[650px]:w-full! max-[650px]:h-[34px]! max-[650px]:pt-0 max-[650px]:pr-[13px] max-[650px]:pb-0 max-[650px]:pl-[18px]"
    />
  );
}

function StarOnGithubButton({ buttonWidth, style }: { buttonWidth?: number; style?: CSSProperties }) {
  return (
    <div className="flex items-center" style={{ width: buttonWidth || '100%', ...style }}>
      <Button
        visualType="secondary"
        height="38px"
        width="100%"
        linkTo="https://github.com/stacktape/stacktape"
        onClick={() => trackAnalyticsEvent('star-github', { source: 'header' })}
        icon={<BiLogoGithub size={20} />}
        text={<span style={{ paddingRight: '11px' }}>Github</span>}
      />
    </div>
  );
}

function DesktopNavigationItems() {
  return (
    <div className="mx-auto flex items-center justify-between max-w-[1580px] max-[795px]:hidden">
      <Link href="https://stacktape.com">
        <Image width={205} className="mb-[-3px] ml-[-3px] max-[795px]:hidden" src={StacktapeFullLogo} alt="Stacktape" />
      </Link>
      <div className="flex items-center gap-[10px]">
        <DocSearch />
        <SignUpButton />
        <StarOnGithubButton buttonWidth={210} />
      </div>
    </div>
  );
}

function MobileNavItems() {
  return (
    <div className="hidden w-full max-[795px]:flex max-[795px]:justify-between">
      <Link href="https://stacktape.com">
        <Image width={52} height={52} src={StacktapeLogo} alt="Stacktape" />
      </Link>
      <div className="flex items-center gap-[15px]">
        <SignUpButton />
        <IconButton
          rootClassName="hidden max-[795px]:flex"
          icon={<Menu size={27} />}
          onClick={() => toggleMobileNav()}
        />
      </div>
    </div>
  );
}

export function Header() {
  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 h-[54px] w-full px-[20px] max-[795px]:px-[15px]',
        'bg-bg backdrop-blur-[10px]',
        'shadow-[0_2px_8px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.04),inset_0_-1px_0_rgba(255,255,255,0.04)]'
      )}
    >
      <DesktopNavigationItems />
      <MobileNavItems />
    </header>
  );
}
