import { useRouter } from 'next/router';
import { Fragment, useSyncExternalStore } from 'react';
import { ChevronDown, ChevronRight } from 'react-feather';
import { Link } from '@/components/Mdx/Link';
import { colors } from '@/styles/variables';
import config from '../../../../config';

const COMING_SOON_PAGES = ['/resources/kubernetes-clusters', '/resources/opensearch', '/resources/nextjs-website'];

const Badge = () => (
  <div
    css={{
      position: 'absolute',
      height: '20px',
      top: '5px',
      display: 'flex',
      alignItems: 'center',
      right: '30px',
      borderRadius: '4px',
      border: '1px solid gray',
      padding: '0px 8px'
    }}
  >
    <span css={{ fontSize: '12px' }}>Soon</span>
  </div>
);

const NodeContent = ({
  text,
  link,
  onClick,
  isCollapseSwitchButton,
  isExpanded,
  isNested,
  isActive
}: {
  text: string;
  link: string;
  onClick: () => void;
  isCollapseSwitchButton: boolean;
  isExpanded: boolean;
  isNested: boolean;
  isActive: boolean;
}) => {
  // Only show activeNodeCss after client mount to avoid hydration issues
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const shouldShowActiveNodeCss = isClient && isActive;

  const activeNodeCss: Css = {
    borderRight: 'none',
    '*': {
      backgroundColor: '#4c4c4c'
    }
  };

  const linkCss: Css = {
    color: colors.fontColorPrimary,
    position: 'relative',
    textDecoration: 'none',
    lineHeight: 1.1,
    width: isCollapseSwitchButton ? 'calc(100% - 85px)' : '100%',
    margin: isNested ? '0 10px 0 6px' : isCollapseSwitchButton ? '0 10px 0 0px' : '-1px 10px -1px 9px',
    borderRadius: '4px',
    letterSpacing: isNested ? 'initial' : '0.025em !important',
    padding: isNested ? '8px 15px 8px 7px' : isCollapseSwitchButton ? '7px 18px 7px 5px' : '7.5px 18px 7px 15px',
    ...(shouldShowActiveNodeCss && { paddingLeft: '12.5px' }),
    ...(shouldShowActiveNodeCss && {
      borderLeft: `2.5px solid ${colors.fontColorPrimary}`,
      boxShadow: '2px 2px 4px rgb(20,20,20,1), -2px -2px 9px rgb(22,26,26)'
    }),
    borderTopLeftRadius: '2px',
    borderBottomLeftRadius: '2px',
    fontWeight: 400
  };

  const isComingSoon = COMING_SOON_PAGES.includes(link);

  return (
    <li
      onClick={onClick}
      css={{
        listStyle: 'none',
        padding: '0',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        cursor: 'pointer',
        letterSpacing: '0.05em',
        '&:hover': {
          '> *': {
            color: colors.navigationHover
          }
        },
        ...(shouldShowActiveNodeCss ? activeNodeCss : {})
      }}
    >
      {isCollapseSwitchButton && <NodeCollapseButton isExpanded={isExpanded} />}
      {link ? (
        <Link href={link} rootCss={linkCss}>
          <span css={{ padding: '1px 0px', position: 'relative' }}>{text}</span>
          {isComingSoon && <Badge />}
        </Link>
      ) : (
        <a css={linkCss}>
          <span css={{ position: 'relative' }}>{text}</span>
          {isComingSoon && <Badge />}
        </a>
      )}
    </li>
  );
};

function NestedContentTreeNode({
  children,
  toggle,
  expandedNavItems,
  setExpandedNavItems
}: {
  children: any[];
  toggle?: () => void;
  expandedNavItems: Record<string, boolean>;
  setExpandedNavItems: (items: Record<string, boolean>) => void;
}) {
  return (
    <ul
      style={{ paddingTop: '3px', paddingBottom: '3px' }}
      css={{
        flex: '100%',
        li: {
          marginLeft: '30px',
          borderLeft: `1px solid ${colors.fontColorPrimary}`
        }
      }}
    >
      {children.map((item) => (
        <ContentTreeNode
          isNested
          isActive={false}
          key={item.url}
          toggle={toggle}
          expandedNavItems={expandedNavItems}
          setExpandedNavItems={setExpandedNavItems}
          {...item}
        />
      ))}
    </ul>
  );
}

const NodeCollapseButton = ({ isExpanded }: { isExpanded: boolean }) => {
  const css: Css = {
    border: 'none',
    outline: 'none',
    zIndex: 10,
    cursor: 'pointer',
    margin: '0px 0px 0px 21px',
    boxShadow: 'none',
    color: colors.fontColorPrimary
  };

  return isExpanded ? <ChevronDown css={css} size={18} /> : <ChevronRight css={css} size={18} />;
};

export function ContentTreeNode({
  url,
  title,
  children,
  expandedNavItems,
  setExpandedNavItems,
  isNested
}: {
  url: string;
  title: string;
  children: any[];
  expandedNavItems: Record<string, boolean>;
  setExpandedNavItems: (items: Record<string, boolean>) => void;
  isNested: boolean;
}) {
  const router = useRouter();
  const hasChildren = children?.length > 0;

  // Normalize paths for comparison - remove trailing slashes and query params
  const normalizedPath = (router.asPath || '/').split('?')[0].replace(/\/$/, '') || '/';
  const normalizedUrl = (url || '/').replace(/\/$/, '') || '/';

  const isActive = normalizedPath === normalizedUrl || normalizedPath === config.metadata.pathPrefix + normalizedUrl;

  const isExpanded = expandedNavItems[url] ?? false;
  const toggle = () => {
    setExpandedNavItems({ ...expandedNavItems, [url]: !isExpanded });
  };

  return (
    <Fragment>
      <NodeContent
        text={title}
        isActive={isActive}
        isNested={isNested || false}
        link={hasChildren ? null : url}
        onClick={toggle}
        isCollapseSwitchButton={title && hasChildren}
        isExpanded={isExpanded}
      />
      {isExpanded && hasChildren && (
        <NestedContentTreeNode expandedNavItems={expandedNavItems} setExpandedNavItems={setExpandedNavItems}>
          {children}
        </NestedContentTreeNode>
      )}
    </Fragment>
  );
}
