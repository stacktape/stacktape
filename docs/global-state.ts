import { create } from 'zustand';

type GlobalState = {
  isMobileNavigationOpen: boolean;
  toggleMobileNavigation: (open?: boolean) => void;
};

export const useGlobalStore = create<GlobalState>((set) => ({
  isMobileNavigationOpen: false,
  toggleMobileNavigation: (open) => {
    set((state) => ({
      isMobileNavigationOpen: open !== undefined ? open : !state.isMobileNavigationOpen
    }));
  }
}));
