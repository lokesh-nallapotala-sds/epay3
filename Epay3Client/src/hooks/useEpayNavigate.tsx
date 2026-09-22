import { useLocation, useNavigate } from 'react-router';

import EpayNavigator from 'contexts/EpayNavigator';
const useEpayNavigate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  EpayNavigator.navigate = navigate;
  EpayNavigator.location = location;

  return { navigate, location };
};
export default useEpayNavigate;
