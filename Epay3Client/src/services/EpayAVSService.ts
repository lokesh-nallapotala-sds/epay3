import { ErrorInfo } from 'types/ErrorInfo';
import { ITransactionHeader } from 'types/ITransactionHeader';
import { AvsVerificationResult } from 'types/AccountResponse';
import { useEpayQuery } from '../providers/EpayQueryProvider';
import { useEpayLoading } from '../providers/EpayLoadingProvider';

export const EpayAVSService = {
  useWorldpayVerifyAddress(): (
    transactionHeader: ITransactionHeader,
  ) => Promise<AvsVerificationResult> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (transactionHeader: ITransactionHeader) => {
      try {
        increment();
        const response = await ctx.worldpayVerifyAddress(transactionHeader);
        if (!response.ok) {
          const message = (await response.text()) || response.statusText;
          throw new ErrorInfo(message, response.statusText, response.status);
        }
        return await response.json();
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },
  useGuestWorldpayVerifyAddress(): (
    transactionHeader: ITransactionHeader,
  ) => Promise<AvsVerificationResult> {
    const ctx = useEpayQuery();
    const { increment, decrement } = useEpayLoading();

    const execute = async (transactionHeader: ITransactionHeader) => {
      try {
        increment();
        const response =
          await ctx.guestWorldpayVerifyAddress(transactionHeader);
        if (!response.ok) {
          const message = (await response.text()) || response.statusText;
          throw new ErrorInfo(message, response.statusText, response.status);
        }
        return await response.json();
      } catch (error) {
        return Promise.reject(error);
      } finally {
        decrement();
      }
    };

    return execute;
  },
};
