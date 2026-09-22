import { ReactNode, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from 'redux/hooks';
import { EpayApplicationService } from 'services/EpayApplicationService';
import {
  clearPaymentConfig,
  setApplicationConfig,
  setConfigError,
  setConfigLoaded,
  setCustomConfig,
  setPaymentConfig,
} from 'redux/reducers/configSlice';
import { languageSelector } from 'redux/reducers';
import { ePayApi, useGetPaymentConfigQuery } from 'redux/api/ePayApi';

interface Props {
  children: ReactNode;
}

const getPaymentConfigErrorMessage = (paymentConfigError: unknown): string => {
  if (
    paymentConfigError &&
    typeof paymentConfigError === 'object' &&
    'status' in paymentConfigError
  ) {
    const errorWithStatus = paymentConfigError as {
      status: unknown;
      data?: unknown;
    };

    if (
      typeof errorWithStatus.data === 'string' &&
      errorWithStatus.data.trim()
    ) {
      return errorWithStatus.data;
    }

    return `Failed to load payment config (${String(errorWithStatus.status)})`;
  }

  if (
    paymentConfigError &&
    typeof paymentConfigError === 'object' &&
    'message' in paymentConfigError &&
    typeof paymentConfigError.message === 'string'
  ) {
    return paymentConfigError.message;
  }

  return 'Failed to load payment config';
};

export default function EpayConfigProvider(props: Props) {
  const dispatch = useAppDispatch();
  const getApplicationConfig = EpayApplicationService.useGetApplicationConfig();
  const getCustomConfig = EpayApplicationService.useGetCustomConfig();
  const refreshTrigger = useAppSelector(
    (state) => state.config.configRefreshTrigger,
  );
  const selectedLanguage = useAppSelector(languageSelector);
  const baseConfigLoaded = useAppSelector((state) => state.config.configLoaded);

  // RTK Query manages paymentConfig fetching, caching, and refresh
  const {
    data: paymentConfig,
    error: paymentConfigError,
    isError: isPaymentConfigError,
  } = useGetPaymentConfigQuery();

  // Sync paymentConfig to Redux so existing selectors continue to work
  useEffect(() => {
    if (paymentConfig) {
      dispatch(setPaymentConfig(paymentConfig));
      if (baseConfigLoaded) {
        dispatch(setConfigError(null));
      }
      return;
    }

    if (isPaymentConfigError) {
      dispatch(clearPaymentConfig());
      dispatch(
        setConfigError(getPaymentConfigErrorMessage(paymentConfigError)),
      );
    }
  }, [
    baseConfigLoaded,
    dispatch,
    isPaymentConfigError,
    paymentConfig,
    paymentConfigError,
  ]);

  // When admin triggers a config refresh, invalidate the RTK Query cache
  useEffect(() => {
    if (refreshTrigger > 0) {
      dispatch(ePayApi.util.invalidateTags(['PaymentConfig', 'HelpConfig']));
    }
  }, [refreshTrigger, dispatch]);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const [applicationConfig, customConfig] = await Promise.all([
          getApplicationConfig(true),
          getCustomConfig(true),
        ]);

        dispatch(setApplicationConfig(applicationConfig));
        dispatch(setCustomConfig(customConfig));
        dispatch(setConfigLoaded(true));
        dispatch(setConfigError(null));
      } catch (error) {
        dispatch(
          setConfigError(
            error instanceof Error
              ? error.message
              : 'Unknown error loading configs',
          ),
        );
        dispatch(setConfigLoaded(false));
      }
    };

    // getApplicationConfig/getCustomConfig are intentionally excluded because
    // the service hooks return unstable function references.
    fetchConfigs();
  }, [dispatch, refreshTrigger, selectedLanguage]);

  return <>{props.children}</>;
}
