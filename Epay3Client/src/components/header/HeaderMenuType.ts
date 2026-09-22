import { ReactNode } from 'react';

import { NavIdentifierType } from 'types/NavIdentifier';

export interface HeaderMenuType {
  label: string;
  action?(): void;
  icon?: ReactNode;
  children?: HeaderMenuType[];
  id?: NavIdentifierType;
}
