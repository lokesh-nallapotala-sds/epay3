import { useMemo } from 'react';

import { Navigate, useLocation } from 'react-router';

import { useAppSelector } from 'redux/hooks';
import { useEffectiveAccount } from 'hooks/usePaymentHelpers';
import { selectCompanyCodes } from 'redux/selectors/configSelectors';

import Deposits from './Deposits';

const RequireDepositEnabled = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const selectedAccount = useEffectiveAccount();

  const configLoaded = useAppSelector((state) => state.config.configLoaded);
  const companyCodes = useAppSelector(selectCompanyCodes);

  const companyCodeDetail = useMemo(() => {
    return companyCodes?.find(
      (code) => code.companyCode === selectedAccount?.companyCode,
    );
  }, [companyCodes, selectedAccount?.companyCode]);

  if (!configLoaded) {
    return null; // Or a loader
  }

  if (!companyCodeDetail?.isDepositEnabled) {
    return <Navigate to="/not-found" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

const DepositsWithRequiredDepositEnabled = () => (
  <RequireDepositEnabled>
    <Deposits />
  </RequireDepositEnabled>
);

export default DepositsWithRequiredDepositEnabled;
