import { EmailConfigRequest } from 'types/AppConfigRequest';
import { useEpayQuery } from '../providers/EpayQueryProvider';
import { useEpayLoading } from '../providers/EpayLoadingProvider';

export const EpayConfigService = {
  useGetApplicationConfig(): () => Promise<any> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async () => {
      try {
        increment();
        const resp = await ctx.getPaymentConfig();
        if (resp?.ok) {
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw { message, text: resp.statusText, code: resp.status };
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useGetSmtpConfig(): () => Promise<EmailConfigRequest> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async () => {
      try {
        increment();
        const resp = await ctx.getSmtpConfig();
        if (resp?.ok) {
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw { message, text: resp.statusText, code: resp.status };
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useGetConfigParameter(): () => Promise<any> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async () => {
      try {
        increment();
        const resp = await ctx.getConfigParameter();
        if (resp?.ok) {
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw { message, text: resp.statusText, code: resp.status };
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
