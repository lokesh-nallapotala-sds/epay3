import { ErrorInfo } from 'types/ErrorInfo';
import { SmtpConfig } from 'types/SmtpConfig';
import { EmailConfig, EmailTemplateCheckResponse } from 'types/EmailConfig';
import { SystemConfig } from 'types/SystemConfig';
import { SapConfig } from 'types/SapConfig/SapConfig';
import {
  ApplicationConfigRequest,
  EmailConfigRequest,
  HelpConfigRequest,
  MaintenanceConfigRequest,
} from 'types/AppConfigRequest';

import { useEpayQuery } from '../providers/EpayQueryProvider';
import { useEpayLoading } from '../providers/EpayLoadingProvider';

export const EpayApplicationService = {
  useGetApplicationConfig(): (
    isRefresh?: boolean,
  ) => Promise<ApplicationConfigRequest> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (isRefresh: boolean = false) => {
      try {
        increment();
        const resp = await ctx.getAppConfig(isRefresh);
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
  useGetSystemConfig(): () => Promise<SystemConfig> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async () => {
      try {
        increment();
        const resp = await ctx.getAppConfig();
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

  useGetCustomConfig(): (isRefresh?: boolean) => Promise<SapConfig> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (isRefresh?: boolean) => {
      try {
        increment();
        const resp = await ctx.getCustomConfig(isRefresh);
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

  usePaymentCardTypeConfig(): () => Promise<string> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async () => {
      try {
        increment();
        const resp = await ctx.getPaymentCardType();
        if (resp?.ok) {
          return await resp.text();
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

  //TODO: create a type eg ApplicationConfigResponse and return that here
  useUpdateApplicationConfig(): (
    request: ApplicationConfigRequest,
    language: string,
  ) => Promise<any> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      request: ApplicationConfigRequest,
      language: string,
    ) => {
      try {
        increment();
        const resp = await ctx.updateAppConfig(request, language);
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

  useGetEmailConfig(): (key: string) => Promise<EmailConfig> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (key: string) => {
      try {
        increment();
        const resp = await ctx.getEmailConfig(key);
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

  useCheckAllEmailTemplates(): (
    key: string,
  ) => Promise<EmailTemplateCheckResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (key: string) => {
      try {
        increment();
        const resp = await ctx.getCheckAllEmailTemplates(key);
        if (resp?.ok) {
          return (await resp.json()) as EmailTemplateCheckResponse;
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

  useGetDefaultEmailTemplate(): (
    key: string,
    language: string,
  ) => Promise<{ html: string }> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (key: string, language: string) => {
      try {
        increment();
        const resp = await ctx.getDefaultEmailTemplate(key, language);
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

  useUpdateEmailConfig(): (
    request: EmailConfigRequest,
    language: string,
  ) => Promise<EmailConfigRequest> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: EmailConfigRequest, language: string) => {
      try {
        increment();
        const resp = await ctx.updateEmailConfig(request, language);
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

  useUpdateEmailTemplateConfig(): (
    key: string,
    request: EmailConfig,
    language: string,
  ) => Promise<boolean> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      key: string,
      request: EmailConfig,
      language: string,
    ) => {
      try {
        increment();
        const resp = await ctx.updateEmailTemplateConfig(
          key,
          request,
          language,
        );
        if (resp?.ok) {
          const text = await resp.text();
          if (!text) return true;
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

  useUpdateThemeConfig(): (
    request: ApplicationConfigRequest,
    language: string,
  ) => Promise<any> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      request: ApplicationConfigRequest,
      language: string,
    ) => {
      try {
        increment();
        const resp = await ctx.updateAppConfig(request, language);
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

  useUpdateMaintenanceConfig(): (
    request: MaintenanceConfigRequest,
    language: string,
  ) => Promise<any> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      request: MaintenanceConfigRequest,
      language: string,
    ) => {
      try {
        increment();
        const resp = await ctx.updateMaintenanceConfig(request, language);
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

  useUpdateSystemConfig(): (
    request: ApplicationConfigRequest,
    language: string,
  ) => Promise<any> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      request: ApplicationConfigRequest,
      language: string,
    ) => {
      try {
        increment();
        const resp = await ctx.updateAppConfig(request, language);
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

  useSmtpTest(): (request: SmtpConfig) => Promise<any> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: SmtpConfig) => {
      try {
        increment();
        const resp = await ctx.smtpTest(request);
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

  useGetMaintenanceConfig(): () => Promise<MaintenanceConfigRequest> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async () => {
      try {
        increment();
        const resp = await ctx.getMaintenanceConfig();
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

  useGetHelpConfig(): () => Promise<HelpConfigRequest> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async () => {
      try {
        increment();
        const resp = await ctx.getHelpConfig();
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

  useUpdateHelpConfig(): (request: HelpConfigRequest) => Promise<any> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: HelpConfigRequest) => {
      try {
        increment();
        const resp = await ctx.updateHelpConfig(request);
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
