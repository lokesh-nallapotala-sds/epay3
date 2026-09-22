import { ReactNode } from 'react';
import { NavIdentifierType } from 'types/NavIdentifier';

export interface NavDrawerItemType {
  active?: string;
  label: string;
  action?(): void;
  setter?(): void;
  afterClick?(): void;
  icon?: ReactNode;
  children?: NavDrawerItemType[];
  path?: string;
  id?: NavIdentifierType;
}
