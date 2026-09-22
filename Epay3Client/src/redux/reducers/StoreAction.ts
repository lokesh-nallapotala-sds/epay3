export const StoreAction = {
  ClearAll: 'CLEAR_ALL',
  ClearUser: 'CLEAR_USER',
} as const;
export type StoreActionType = (typeof StoreAction)[keyof typeof StoreAction];

export const clearStore = () => ({
  type: StoreAction.ClearAll,
});

export const clearUserStore = () => ({
  type: StoreAction.ClearUser,
});
