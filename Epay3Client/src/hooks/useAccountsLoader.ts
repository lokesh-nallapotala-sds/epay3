import { useCallback } from 'react';

import { Account } from 'types/Account';
import { useAppDispatch } from 'redux/hooks';
import { setAccounts as setAccountArr } from 'redux/reducers';
import { ePayApi } from 'redux/api/ePayApi';

export function useAccountsLoader() {
  const dispatch = useAppDispatch();

  const loadAccounts = useCallback(
    async (
      userId?: string,
      forceRefresh = false,
      syncGlobalState = true,
    ): Promise<Account[]> => {
      // RTK Query's dispatch return type isn't fully inferred with a custom
      // root reducer, so we cast to access .unwrap() on the action result.

      const action = dispatch(
        ePayApi.endpoints.getAccounts.initiate(
          { userId, forceRefresh },
          // forceRefetch bypasses RTK Query's cache so ?forceRefresh=true
          // also reaches the backend to bypass its SAP cache.
          { forceRefetch: forceRefresh },
        ) as any,
      ) as unknown as { unwrap: () => Promise<{ accounts?: Account[] }> };

      const response = await action.unwrap();
      const accounts = response?.accounts ?? [];
      if (syncGlobalState) {
        dispatch(setAccountArr(accounts));
      }
      return accounts;
    },
    [dispatch],
  );

  const refreshAccounts = useCallback(
    async (userId?: string): Promise<Account[]> => {
      return loadAccounts(userId, true);
    },
    [loadAccounts],
  );

  return {
    loadAccounts,
    refreshAccounts,
  };
}
