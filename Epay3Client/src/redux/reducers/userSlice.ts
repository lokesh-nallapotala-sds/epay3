import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { LoggedInUser } from 'types/LoggedInUser';
import { UserView } from 'types/User';
import { safeJsonParse } from 'utilities/utilities';
import { RootState } from '../EpayStore';

export const UserDatum = {
  ImpersonatedUser: 'impersonatedUser',
} as const;

const LegacyUserDatum = {
  ImpersonatedUser: 'user.impersonatedUser',
} as const;

export interface UserSliceState {
  loggedIn: boolean;
  sessionLoaded: boolean;
  user: LoggedInUser | null;
  impersonatedUser: UserView | null;
  regionalFormat: string;
}

const readSessionJsonWithMigration = <T>(
  key: string,
  legacyKeys: string[],
  fallback: T,
): T => {
  const value = sessionStorage.getItem(key);
  if (value) {
    return safeJsonParse<T>(value, fallback);
  }

  for (const legacyKey of legacyKeys) {
    const legacyValue = sessionStorage.getItem(legacyKey);
    if (legacyValue) {
      sessionStorage.setItem(key, legacyValue);
      sessionStorage.removeItem(legacyKey);
      return safeJsonParse<T>(legacyValue, fallback);
    }
  }

  return fallback;
};

export const userSliceInitialState: UserSliceState = {
  loggedIn: false,
  sessionLoaded: false,
  user: null,
  impersonatedUser: readSessionJsonWithMigration<UserView | null>(
    UserDatum.ImpersonatedUser,
    [LegacyUserDatum.ImpersonatedUser],
    null,
  ),
  regionalFormat: '',
};

function clearSliceSessionStorage() {
  sessionStorage.removeItem(UserDatum.ImpersonatedUser);
  sessionStorage.removeItem(LegacyUserDatum.ImpersonatedUser);
}

function _userHasAbility(user: LoggedInUser | null, ability: string) {
  if (!user) return false;
  return (user.abilities ?? []).indexOf(ability) >= 0;
}

export const userSlice = createSlice({
  name: 'user',
  initialState: userSliceInitialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{
        user?: LoggedInUser | null;
        regionalFormat?: string;
      }>,
    ) => {
      state.loggedIn = true;
      state.sessionLoaded = true;
      state.user = action.payload.user ?? null;
      const format =
        action.payload.regionalFormat ?? state.user?.regionalFormat ?? '';
      state.regionalFormat = format;
    },
    loginFailed: (state) => {
      clearSliceSessionStorage();
      state.impersonatedUser = null;
      state.loggedIn = false;
      state.sessionLoaded = true;
      state.user = null;
    },
    logout: (state) => {
      clearSliceSessionStorage();
      state.impersonatedUser = null;
      state.loggedIn = false;
      state.sessionLoaded = true;
      state.user = null;
      state.regionalFormat = '';
    },
    impersonateUser: (state, action: PayloadAction<UserView>) => {
      state.impersonatedUser = action.payload;
      sessionStorage.setItem(
        UserDatum.ImpersonatedUser,
        JSON.stringify(action.payload),
      );
    },
    unimpersonateUser: (state) => {
      state.impersonatedUser = null;
      sessionStorage.removeItem(UserDatum.ImpersonatedUser);
    },
    setRegionalFormat: (state, action: PayloadAction<string>) => {
      state.regionalFormat = action.payload;
    },
  },
});

export const {
  loginSuccess,
  loginFailed,
  logout,
  impersonateUser,
  unimpersonateUser,
  setRegionalFormat,
} = userSlice.actions;

export const userSelector = (state: RootState) => state.user.user;
export const userHasAbility = (user: LoggedInUser | null, ability: string) =>
  _userHasAbility(user, ability);
export const impersonatedUserSelector = (state: RootState) =>
  state.user.impersonatedUser;
export const impersonatedUserIdSelector = (state: RootState) =>
  state.user.impersonatedUser?.userId;
export const regionalFormatSelector = (state: RootState) =>
  state.user.regionalFormat || '';

export default userSlice.reducer;
