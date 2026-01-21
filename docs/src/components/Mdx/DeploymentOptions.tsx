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
import { onMaxW650 } from '../../styles/responsive';
import { colors } from '../../styles/variables';
import { Box } from '../Box/Box';
import { GridList } from '../Misc/GridList';
import { Link } from './Link';

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
        rootCss={{
          height: '100%',
          padding: description ? '14px 18px 16px 18px' : '10px 18px 12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          [onMaxW650]: {
            width: '100%',
            marginBottom: '10px'
          }
        }}
      >
        <div css={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
          {icon}
          <div>
            <h4 css={{ fontSize: '1rem', margin: 0 }}>{text}</h4>
            {description && (
              <p css={{ fontSize: '0.85rem', color: colors.fontColorTernary, margin: '4px 0 0 0', lineHeight: 1.4 }}>
                {description}
              </p>
            )}
          </div>
        </div>
        <BiChevronRight color={colors.fontColorPrimary} css={{ width: 24, flexShrink: 0 }} size={24} />
      </Box>
    </Link>
  );
}

export function NavBoxGrid({ children, columns = 2 }: { children: ReactNode; columns?: number }) {
  const minWidth = columns === 3 ? '280px' : columns === 2 ? '320px' : '100%';
  return (
    <GridList
      minItemWidth={minWidth}
      rootCss={{
        marginTop: '20px',
        marginBottom: '20px',
        gap: '12px',
        [onMaxW650]: {
          display: 'block',
          width: '100%'
        }
      }}
    >
      {children}
    </GridList>
  );
}

export function GettingStartedOptions() {
  return (
    <GridList
      minItemWidth="422px"
      rootCss={{
        marginTop: '20px',
        [onMaxW650]: {
          display: 'block',
          width: '100%'
        }
      }}
    >
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
    </GridList>
  );
}

export function DeploymentOptions() {
  return (
    <GridList
      minItemWidth="422px"
      rootCss={{
        marginTop: '20px',
        [onMaxW650]: {
          display: 'block',
          width: '100%'
        }
      }}
    >
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
    </GridList>
  );
}
