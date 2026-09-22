import { Location, NavigateFunction } from 'react-router';

export interface EpayNavigatorType {
  navigate: NavigateFunction | null;
  location: Location | null;
  goTo: (path: string) => void;
}
const EpayNavigator: EpayNavigatorType = {
  navigate: null,
  location: null,
  goTo: (path: string) => {
    // Fallback for RouterProvider setup
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  },
};

export default EpayNavigator;
