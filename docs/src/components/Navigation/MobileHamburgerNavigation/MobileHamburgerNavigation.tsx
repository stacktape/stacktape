import { useStore } from '@nanostores/react';
import clsx from 'clsx';
import { $mobileNavOpen } from '@/stores/mobile-nav';
import { DocSearch } from '../../Search/DocSearch';
import { SidebarNavigation } from '../SidebarNavigation/Sidebar';

export function MobileHamburgerNavigation({
  allDocPages,
  pathname
}: {
  allDocPages: MdxPageDataForNavigation[];
  pathname?: string;
}) {
  const isOpen = useStore($mobileNavOpen);

  const mobileDividerClassName = 'border-none border-t border-t-border-light ml-[26px] mr-[26px]';

  return (
    <div
      className={clsx(
        'hidden basis-full flex-col',
        isOpen ? 'max-[795px]:!flex' : 'max-[795px]:!hidden'
      )}
    >
      <hr className={mobileDividerClassName} />
      <DocSearch />
      <hr className={mobileDividerClassName} />
      <SidebarNavigation allDocPages={allDocPages} pathname={pathname} showOnSm />
    </div>
  );
}
