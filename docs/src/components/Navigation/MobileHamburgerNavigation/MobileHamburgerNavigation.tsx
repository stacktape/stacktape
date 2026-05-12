import { onMaxW795 } from '@/styles/responsive';
import { colors } from '@/styles/variables';
import { DocSearch } from '../../Search/DocSearch';
import { SidebarNavigation } from '../SidebarNavigation/Sidebar';

export function MobileHamburgerNavigation({
  isOpen,
  allDocPages
}: {
  isOpen: boolean;
  allDocPages: MdxPageDataForNavigation[];
}) {
  const mobileDividerStyle = {
    border: 'none',
    borderTop: `1px solid ${colors.borderColorLight}`,
    marginLeft: '26px',
    marginRight: '26px'
  };

  return (
    <div
      css={{
        display: 'none',
        [onMaxW795]: {
          display: isOpen ? 'flex !important' : 'none !important'
        },
        flexBasis: '100%',
        flexDirection: 'column'
      }}
    >
      <hr css={mobileDividerStyle} />
      <DocSearch />
      <hr css={mobileDividerStyle} />
      <SidebarNavigation allDocPages={allDocPages} showOnSm />
    </div>
  );
}
