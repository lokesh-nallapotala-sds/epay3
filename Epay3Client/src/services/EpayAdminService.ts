import { ErrorInfo } from 'types/ErrorInfo';
import { useEpayQuery } from '../providers/EpayQueryProvider';
import { useEpayLoading } from '../providers/EpayLoadingProvider';

export const EpayAdminService = {
  useStartAdminRecovery(): (
    adminAccessKey: string,
    recoveryKey: string,
    user: string,
  ) => Promise<{ resetToken: string }> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      adminAccessKey: string,
      recoveryKey: string,
      user: string,
    ): Promise<{ resetToken: string }> => {
      try {
        increment();
        const resp = await ctx.startAdminRecovery(
          adminAccessKey,
          recoveryKey,
          user,
        );
        if (resp?.ok) {
          return await resp.json();
        } else {
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

  usePostAdminRecovery(): (
    adminAccessKey: string,
    recoveryKey: string,
    user: string,
    mode: string,
    password: string,
    firstname: string,
    lastname: string,
    company: string,
    email: string,
    accountType: string,
    role: string,
  ) => Promise<any> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      adminAccessKey: string,
      recoveryKey: string,
      user: string,
      mode: string,
      password: string,
      firstname: string,
      lastname: string,
      company: string,
      email: string,
      accountType: string,
      role: string,
    ): Promise<any> => {
      try {
        increment();
        const resp = await ctx.adminRecovery(
          adminAccessKey,
          recoveryKey,
          user,
          mode,
          password,
          firstname,
          lastname,
          company,
          email,
          accountType,
          role,
        );
        if (resp?.ok) {
          return {
            status: resp.status,
            text: resp.statusText,
          };
        } else {
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
