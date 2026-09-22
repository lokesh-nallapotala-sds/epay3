import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';

interface LoadingContextType {
  increment: () => void;
  decrement: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export function EpayLoadingProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);

  return (
    <LoadingContext.Provider
      value={{ increment, decrement, isLoading: count > 0 }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useEpayLoading(): LoadingContextType {
  const ctx = useContext(LoadingContext);
  if (!ctx)
    throw new Error('useEpayLoading must be used within EpayLoadingProvider');
  return ctx;
}
