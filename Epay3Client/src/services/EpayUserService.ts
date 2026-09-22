import { useCallback } from 'react';

import { User, UserView } from 'types/User';
import { UpdateProfileRequest } from 'types/UpdateProfileRequest';
import { ErrorInfo } from 'types/ErrorInfo';
import { Account, UserAccountsResponse } from 'types/Account';
import { AutoRegisterRequest } from 'types/AutoRegisterRequest';
import { tryParseJson } from 'utilities/utilities';

import { useEpayQuery } from '../providers/EpayQueryProvider';
import { useEpayLoading } from '../providers/EpayLoadingProvider';

type ServiceApiResponse<T = null> = {
  data: T;
  code: number;
  text: string;
  emailError?: { code: string; message?: string };
  message?: string;
};

async function parseOptionalJsonResponse<T>(resp: Response): Promise<T | null> {
  const text = await resp.text();
  if (!text) {
    return null;
  }

  const parsed = tryParseJson<T>(text);
  if (!parsed.success) {
    throw new ErrorInfo(
      'Invalid JSON response received from the server.',
      resp.statusText,
      resp.status,
    );
  }

  return parsed.value;
}

export const EpayUserService = {
  useGetUserAccount(): (
    userId?: string,
    forceRefresh?: boolean,
  ) => Promise<UserAccountsResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = useCallback(
      async (userId?: string, forceRefresh?: boolean) => {
        try {
          increment();
          const resp = await ctx.getCustomers(userId, forceRefresh);
          if (resp?.ok) {
            return (await resp.json()) as UserAccountsResponse;
          } else {
            const message = (await resp.text()) ?? resp.statusText;
            throw new ErrorInfo(message, resp.statusText, resp.status);
          }
        } catch (error) {
          return Promise.reject(error);
        } finally {
          decrement();
        }
      },
      [ctx, increment, decrement],
    );

    return execute;
  },

  useGetUsers(): () => Promise<UserView[]> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async () => {
      try {
        increment();

        const resp = await ctx.getUsers();
        if (resp?.ok) {
          return await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (err) {
        return Promise.reject(err);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useGetUserById(): (userId: string) => Promise<UserView> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (userId: string) => {
      try {
        let user: UserView = {} as UserView;
        increment();

        const resp = await ctx.getUserById(userId);
        if (resp?.ok) {
          user = await resp.json();
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }

        return user;
      } catch (err) {
        return Promise.reject(err);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useSaveUser(): (user: User) => Promise<User> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (user: User) => {
      try {
        let savedUser: User;
        increment();

        const resp = await ctx.saveUser(user);
        if (resp?.ok) {
          savedUser = await resp.json();
        } else {
          const message = (await resp.text()) || resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }

        return savedUser;
      } catch (err) {
        return Promise.reject(err);
      } finally {
        decrement();
      }
    };

    return execute;
  },
  useUpdateProfile(): (request: UpdateProfileRequest) => Promise<User> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: UpdateProfileRequest) => {
      try {
        increment();
        const resp = await ctx.updateProfile(request);
        if (resp?.ok) {
          return (await resp.json()) as User;
        } else {
          const message = (await resp.text()) || resp.statusText;
          throw new ErrorInfo(message, resp.statusText, resp.status);
        }
      } catch (err) {
        return Promise.reject(err);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useRequestEmailChange(): (
    newEmail: string,
    currentPassword: string,
  ) => Promise<void> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (newEmail: string, currentPassword: string) => {
      try {
        increment();
        const resp = await ctx.requestEmailChange(newEmail, currentPassword);
        if (!resp?.ok) {
          const message = (await resp.text()) || resp.statusText;
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

  useConfirmEmailChange(): (
    token: string,
  ) => Promise<ServiceApiResponse<string | null>> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (token: string) => {
      try {
        increment();
        const resp = await ctx.confirmEmailChange(token);
        if (resp?.ok) {
          return { data: null, code: resp.status, text: resp.statusText };
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          return { data: message, code: resp.status, text: resp.statusText };
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useAutoSaveUser(): (request: AutoRegisterRequest) => Promise<unknown> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (request: AutoRegisterRequest) => {
      try {
        increment();

        return await ctx.createAutoAccount(request);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useChangePassword(): (
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string,
  ) => Promise<ServiceApiResponse<User>> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      currentPassword: string,
      newPassword: string,
      newPasswordConfirmation: string,
    ) => {
      try {
        increment();
        const resp = await ctx.changePassword(
          currentPassword,
          newPassword,
          newPasswordConfirmation,
        );
        if (resp?.ok) {
          return {
            data: (await resp.json()) as User, // consider returning just the user object
            code: resp.status,
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

  useDeleteUser(): (userId: string) => Promise<void> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (userId: string) => {
      try {
        increment();
        const resp = await ctx.deleteUser(userId);
        if (resp?.ok) {
          return;
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

  useSaveAccountManual(): (
    userId: string,
    account: Account,
  ) => Promise<ServiceApiResponse<Account | null>> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (userId: string, account: Account) => {
      try {
        increment();
        const resp = account.accountId
          ? await ctx.updateAccount(userId, account)
          : await ctx.addAccountManual(userId, account);
        if (resp?.ok) {
          return {
            data: await parseOptionalJsonResponse<Account>(resp),
            code: resp.status,
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

  useSaveAccountByInvoice(): (
    userId: string,
    accountNr: string,
    invoiceNr: string,
    invoiceAmt: number,
  ) => Promise<ServiceApiResponse<Account | null>> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      userId: string,
      accountNr: string,
      invoiceNr: string,
      invoiceAmt: number,
    ) => {
      try {
        increment();
        const resp = await ctx.addAccountByInvoice(
          userId,
          accountNr,
          invoiceNr,
          invoiceAmt,
        );
        if (resp?.ok) {
          return {
            data: await parseOptionalJsonResponse<Account>(resp),
            code: resp.status,
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

  useDeleteAccount(): (
    userId: string,
    accountId: string,
  ) => Promise<ServiceApiResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (userId: string, accountId: string) => {
      try {
        increment();
        const resp = await ctx.deleteAccount(userId, accountId);
        if (resp?.ok) {
          return { data: null, code: resp.status, text: resp.statusText }; //return null b/c response from SAP won't contain any data
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

  useResendEmail(): (email: string) => Promise<ServiceApiResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (email: string) => {
      try {
        increment();
        const resp = await ctx.resendConfirmation(email);
        if (resp?.ok) {
          return { data: null, code: resp.status, text: resp.statusText }; //return null b/c response from SAP won't contain any data
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

  useResetPassword(): (email: string) => Promise<ServiceApiResponse<unknown>> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (email: string) => {
      try {
        increment();
        const resp = await ctx.resetPassword(email);
        const data = await resp.json();
        if (resp?.ok) {
          return {
            data: data,
            code: resp.status,
            text: resp.statusText,
          };
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          return { data: message, code: resp.status, text: resp.statusText };
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useConfirmAccount(): (
    token: string,
  ) => Promise<ServiceApiResponse<string | null>> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (token: string) => {
      try {
        increment();
        const resp = await ctx.confirmAccount(token);
        if (resp?.ok) {
          return { data: null, code: resp.status, text: resp.statusText };
        } else {
          const message = (await resp.text()) ?? resp.statusText;
          return { data: message, code: resp.status, text: resp.statusText };
        }
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },

  useCreatePassword(): (
    id: string,
    newPassword: string,
    newPasswordConfirmation: string,
  ) => Promise<ServiceApiResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      id: string,
      newPassword: string,
      newPasswordConfirmation: string,
    ) => {
      try {
        increment();
        const resp = await ctx.createPassword(
          id,
          newPassword,
          newPasswordConfirmation,
        );
        if (resp?.ok) {
          return {
            data: null,
            code: resp.status,
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

  useCompleteRegistration(): (
    id: string,
    newPassword: string,
    newPasswordConfirmation: string,
  ) => Promise<ServiceApiResponse> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (
      id: string,
      newPassword: string,
      newPasswordConfirmation: string,
    ) => {
      try {
        increment();
        const resp = await ctx.completeRegistration(
          id,
          newPassword,
          newPasswordConfirmation,
        );
        if (resp?.ok) {
          return {
            data: null,
            code: resp.status,
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
