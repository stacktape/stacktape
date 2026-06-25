import type { ReactNode } from 'react';
import {
  BiBookContent,
  BiBookOpen,
  BiChevronRight,
  BiCode,
  BiCog,
  BiHive,
  BiLaptop,
  BiLogoGit,
  BiTerminal
} from 'react-icons/bi';
import clsx from 'clsx';
import { colors } from '../../styles/variables';
import { Box } from '../Box/Box';
import { Link } from './Link';

function Grid({ children, minItemWidth, className }: { children: ReactNode; minItemWidth: string; className?: string }) {
  return (
    <div
      className={clsx('grid w-full gap-[10px] [&>div]:w-full', className)}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minItemWidth}, 1fr))` }}
    >
      {children}
    </div>
  );
}

export function NavBox({
  icon,
  text,
  url,
  description
}: {
  icon?: ReactNode;
  text: ReactNode;
  url: string;
  description?: string;
}) {
  return (
    <Link href={url}>
      <Box
        interactive
        className={clsx(
          'flex h-full items-center justify-between',
          description ? 'pt-[14px] pr-[18px] pb-[16px] pl-[18px]' : 'pt-[10px] pr-[18px] pb-[12px] pl-[18px]',
          'max-[650px]:mb-[10px] max-[650px]:w-full'
        )}
      >
        <div className="flex flex-1 items-center gap-[14px]">
          {icon}
          <div>
            <h4 className="m-0 text-[1rem]">{text}</h4>
            {description && (
              <p className="mt-[4px] mr-0 mb-0 ml-0 text-[0.85rem] leading-[1.4] text-fc-ternary">{description}</p>
            )}
          </div>
        </div>
        <BiChevronRight className="w-[24px] shrink-0" color={colors.fontColorPrimary} size={24} />
      </Box>
    </Link>
  );
}

export function NavBoxGrid({ children, columns = 2 }: { children: ReactNode; columns?: number }) {
  const minWidth = columns === 3 ? '280px' : columns === 2 ? '320px' : '100%';
  return (
    <Grid minItemWidth={minWidth} className="mt-[20px] mb-[20px] gap-[12px] max-[650px]:block max-[650px]:w-full">
      {children}
    </Grid>
  );
}

export function GettingStartedOptions() {
  return (
    <Grid minItemWidth="422px" className="mt-[20px] max-[650px]:block max-[650px]:w-full">
      <NavBox
        url="/getting-started/basics/"
        icon={<BiBookOpen color={colors.fontColorPrimary} size={30} />}
        text="1. Basics"
      />
      <NavBox
        url="/getting-started/configuring-stack/"
        icon={<BiCode color={colors.fontColorPrimary} size={30} />}
        text="2. Configuring stack"
      />
      <NavBox
        url="/getting-started/using-config-editor/"
        icon={<BiBookContent color={colors.fontColorPrimary} size={30} />}
        text="3. Interactive config editor"
      />
      <NavBox
        url="/getting-started/under-the-hood/"
        icon={<BiCog color={colors.fontColorPrimary} size={30} />}
        text="4. Under the hood"
      />
    </Grid>
  );
}

export function DeploymentOptions() {
  return (
    <Grid minItemWidth="422px" className="mt-[20px] max-[650px]:block max-[650px]:w-full">
      <NavBox
        url="/getting-started/deploying-using-console/"
        icon={<BiLaptop color={colors.fontColorPrimary} size={30} />}
        text="5. Deploying using Console"
      />
      <NavBox
        url="/getting-started/deploying-using-CLI/"
        icon={<BiTerminal color={colors.fontColorPrimary} size={30} />}
        text="6. Deploying using CLI"
      />
      <NavBox
        url="/getting-started/deploying-using-GitOps/"
        icon={<BiLogoGit color={colors.fontColorPrimary} size={30} />}
        text="7. Deploying using GitOps"
      />
      <NavBox
        url="/getting-started/deploying-using-3rd-party-CI/"
        icon={<BiHive color={colors.fontColorPrimary} size={30} />}
        text="8. Deploying using 3rd party CI"
      />
    </Grid>
  );
}
