import { ErrorInfo } from 'types/ErrorInfo';
import { LoginResponse } from 'types/LoginResponse';
import { useEpayQuery } from '../providers/EpayQueryProvider';
import { useEpayLoading } from '../providers/EpayLoadingProvider';

export const EpayLoginService = {
  usePostLogin(): (
    user: string,
    password: string,
    isAdminLogin?: boolean,
  ) => Promise<LoginResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      user: string,
      password: string,
      isAdminLogin: boolean = false,
    ): Promise<LoginResponse> => {
      try {
        increment();
        const resp = await ctx.login(user, password, isAdminLogin);
        if (resp?.ok) {
          return await resp.json();
        } else {
          const contentType = resp.headers.get('content-type') ?? '';
          if (contentType.includes('application/json')) {
            const payload = await resp.json();
            // 'error' covers the rate-limiter body ({ error: "System is busy..." }).
            const message =
              payload?.message ??
              payload?.error ??
              payload?.code ??
              resp.statusText;
            throw new ErrorInfo(message, resp.statusText, resp.status, payload);
          }

          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },
};
