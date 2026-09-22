import { ThemeConfig } from 'types/ThemeConfig';
import { ErrorInfo } from 'types/ErrorInfo';
import { useEpayQuery } from '../providers/EpayQueryProvider';
import { useEpayLoading } from '../providers/EpayLoadingProvider';

export const EpayThemeConfigurationService = {
  useGetThemeConfiguration(): () => Promise<ThemeConfig[]> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async () => {
      try {
        increment();
        const resp = await ctx.getThemeConfig();
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

  useGetThemeForUrl(): (url: string) => Promise<ThemeConfig> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (url) => {
      try {
        increment();
        const resp = await ctx.getThemeForUrl(url);
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

  useUpdatedThemeConfiguration(): (
    request: ThemeConfig[],
  ) => Promise<ThemeConfig[]> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: ThemeConfig[]) => {
      try {
        increment();
        const resp = await ctx.updateThemeConfig(request, 'en');
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

  useDeleteThemeConfiguration(): (
    request: ThemeConfig[],
  ) => Promise<ThemeConfig[]> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: ThemeConfig[]) => {
      try {
        increment();
        const resp = await ctx.deleteThemeConfig(request, 'en');
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
};
