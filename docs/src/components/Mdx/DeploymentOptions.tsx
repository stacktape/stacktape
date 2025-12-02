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

export function NavBox({ icon, text, url }: { icon: ReactNode; text: ReactNode; url: string }) {
  return (
    <Link href={url}>
      <Box
        interactive
        rootCss={{
          height: '100%',
          padding: '10px 18px 12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          [onMaxW650]: {
            width: '100%',
            marginBottom: '10px'
          },
          '&:hover': {
            boxShadow: '0 1px 2px 2.5px rgba(19, 24, 24, 0.9)'
          }
        }}
      >
        <div css={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {icon}
          <h3 css={{ fontSize: '1.025rem' }}>{text}</h3>
        </div>
        <BiChevronRight color={colors.fontColorPrimary} css={{ width: 30 }} size={30} />
      </Box>
    </Link>
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
