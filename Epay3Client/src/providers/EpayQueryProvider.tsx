import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { useFetchWithLang } from 'hooks/useFetchWithLang';
import { DotNetService } from '../services/DotNetService';
import { useAppDispatch } from 'redux/hooks';
import { clearUserStore, logout } from 'redux/reducers';
import { clearSelectedAccountId } from 'utilities/accountPersistence';

export const EpayQueryContext = createContext<DotNetService | null>(null);

export function EpayQueryProvider({ children }: { children: ReactNode }) {
  const fetchWithLang = useFetchWithLang();
  const dispatch = useAppDispatch();

  const onUnauthorized = useCallback(() => {
    sessionStorage.clear();
    clearSelectedAccountId();
    dispatch(clearUserStore());
    dispatch(logout());
    window.location.href = '/';
  }, [dispatch]);

  const api = useMemo(
    () => new DotNetService(fetchWithLang, onUnauthorized),
    [fetchWithLang, onUnauthorized],
  );

  return (
    <EpayQueryContext.Provider value={api}>
      {children}
    </EpayQueryContext.Provider>
  );
}

export function useEpayQuery() {
  const ctx = useContext(EpayQueryContext);
  if (!ctx) {
    throw new Error('useEpayQuery must be used within an EpayQueryProvider');
  }
  return ctx;
}
