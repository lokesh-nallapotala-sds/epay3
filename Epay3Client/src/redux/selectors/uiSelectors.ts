import { RootState } from '../EpayStore';

export const selectAccountState = (state: RootState) =>
  state.account.selectedAccount;

export const selectImpersonatedAccountState = (state: RootState) =>
  state.account.impersonatedAccount;

export const selectUserState = (state: RootState) => state.user.user;

export const selectImpersonatedUserState = (state: RootState) =>
  state.user.impersonatedUser;
