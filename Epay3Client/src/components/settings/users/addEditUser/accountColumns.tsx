import { MouseEvent } from 'react';

import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import { Account } from 'types/Account';
import { EpayDataTableColumnDefinition } from 'shared/components/EpayDataTable';

interface PrimaryAcctNrHelperProps {
  account: Account;
  canManageAccounts: boolean;
  handleSelectAccount: (e: MouseEvent<HTMLButtonElement>) => void;
}
const getPrimaryAccountNrCellContent = (props: PrimaryAcctNrHelperProps) => {
  const { account, canManageAccounts, handleSelectAccount } = props;
  return (
    <Button
      variant="link"
      data-id={account?.accountId}
      onClick={(e) => handleSelectAccount(e)}
      disabled={!canManageAccounts}
    >
      {account?.primaryAcct}
    </Button>
  );
};

interface DeleteAccountHelperProps {
  account: Account;
  handleDeleteAccount: (accountId: string) => void;
}
const getDeleteAccountCellContent = (props: DeleteAccountHelperProps) => {
  const { account, handleDeleteAccount } = props;
  return (
    <Button onClick={() => handleDeleteAccount(account.accountId!)}>
      <DeleteIcon />
    </Button>
  );
};

interface BuildAccountColumnsParams {
  f: (id: string) => string;
  canManageLinkedAccounts: boolean;
  handleSelectAccount: (e: MouseEvent<HTMLButtonElement>) => void;
  handleDeleteAccount: (accountId: string) => void;
}

export function buildAccountColumns({
  f,
  canManageLinkedAccounts,
  handleSelectAccount,
  handleDeleteAccount,
}: BuildAccountColumnsParams): EpayDataTableColumnDefinition<Account>[] {
  return [
    {
      header: f('user.account'),
      field: null,
      sortable: false,
      alignment: 'center',
      width: '18%',
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
      renderer: (account) =>
        getPrimaryAccountNrCellContent({
          account,
          canManageAccounts: canManageLinkedAccounts,
          handleSelectAccount,
        }),
    },
    {
      header: f('user.account.companycode'),
      field: 'companyCode',
      sortable: false,
      alignment: 'center',
      width: '18.5%',
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
    },
    {
      header: f('user.account.salesorg'),
      field: 'salesOrganization',
      sortable: false,
      alignment: 'center',
      width: '18.5%',
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
    },
    {
      header: f('user.account.channel'),
      field: 'distributionChannel',
      sortable: false,
      alignment: 'center',
      width: '18.5%',
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
    },
    {
      header: f('user.account.division'),
      field: 'division',
      sortable: false,
      alignment: 'center',
      width: '18.5%',
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
    },
    {
      header: '',
      field: null,
      sortable: false,
      alignment: 'center',
      width: '7.5%',
      display: { xs: 'none', sm: 'none', md: 'none', lg: 'table-cell' },
      renderer: (account) =>
        getDeleteAccountCellContent({ account, handleDeleteAccount }),
    },
  ];
}
