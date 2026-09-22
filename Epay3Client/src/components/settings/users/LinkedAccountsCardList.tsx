import { ReactNode } from 'react';

import { Box } from '@mui/system';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTheme } from '@mui/material/styles';
import { Account } from 'types/Account';
import { MobileCardHeader } from 'shared/components/common/MobileCardPrimitives';
import { mobileCardStyles } from 'shared/components/common/mobileCardStyles';
import { useFormat } from 'hooks/useFormat';

interface LinkedAccountsCardListProps {
  accounts: Account[];
  header: ReactNode;
  noDataMessage: string;
  canManageAccounts: boolean;
  onAccountSelect: (account: Account) => void;
  onAccountDelete: (accountId: string) => void;
}

const detailRows: { labelId: string; field: keyof Account }[] = [
  { labelId: 'user.account.companycode', field: 'companyCode' },
  { labelId: 'user.account.salesorg', field: 'salesOrganization' },
  { labelId: 'user.account.channel', field: 'distributionChannel' },
  { labelId: 'user.account.division', field: 'division' },
];

export default function LinkedAccountsCardList({
  accounts,
  header,
  noDataMessage,
  canManageAccounts,
  onAccountSelect,
  onAccountDelete,
}: LinkedAccountsCardListProps) {
  const theme = useTheme();
  const f = useFormat();
  const deleteText = f('user.action.delete');

  return (
    <Paper sx={{ width: '100%' }}>
      <Box padding="12px 16px">{header}</Box>
      <Box sx={{ display: 'grid', paddingBottom: '.8rem' }}>
        {accounts.map((account) => (
          <Box
            key={account.accountId ?? account.primaryAcct}
            onClick={() => canManageAccounts && onAccountSelect(account)}
            sx={{
              border: `1px solid ${theme.mixins.border.color}`,
              borderRadius: mobileCardStyles.shell.borderRadius,
              padding: mobileCardStyles.shell.padding,
              marginBottom: mobileCardStyles.shell.marginBottom,
              width: '89%',
              justifySelf: 'center',
              cursor: canManageAccounts ? 'pointer' : 'default',
              '&:active': canManageAccounts
                ? { backgroundColor: theme.palette.highlight.main }
                : undefined,
            }}
          >
            <MobileCardHeader
              content={
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    minWidth: 0,
                    overflow: 'hidden',
                  }}
                >
                  <Typography
                    noWrap
                    sx={{
                      fontSize: mobileCardStyles.typography.titleFontSize,
                      fontWeight: mobileCardStyles.typography.valueFontWeight,
                      lineHeight: 1.2,
                      color: theme.palette.info.main,
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px',
                    }}
                  >
                    {account.primaryAcct}
                  </Typography>
                </Box>
              }
              action={
                <IconButton
                  color="primary"
                  title={deleteText}
                  aria-label={deleteText}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccountDelete(account.accountId ?? '');
                  }}
                  sx={{ padding: 0 }}
                >
                  <DeleteIcon sx={{ fontSize: '1.5rem' }} />
                </IconButton>
              }
            />
            {detailRows.map((row) => (
              <Grid
                key={row.labelId}
                container
                paddingTop=".55rem"
                justifyContent="space-between"
                alignItems="center"
                wrap="nowrap"
                columnGap="12px"
              >
                <Grid item flexShrink={0}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: mobileCardStyles.typography.labelFontSize,
                      fontWeight: mobileCardStyles.typography.labelFontWeight,
                      fontStyle: mobileCardStyles.typography.labelFontStyle,
                      color: mobileCardStyles.typography.labelColor,
                      lineHeight: 1.25,
                    }}
                  >
                    {f(row.labelId)}
                  </Typography>
                </Grid>
                <Grid item minWidth={0} overflow="hidden" textAlign="right">
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      fontSize: mobileCardStyles.typography.valueFontSize,
                      fontWeight: mobileCardStyles.typography.valueFontWeight,
                      fontStyle: mobileCardStyles.typography.valueFontStyle,
                      color: mobileCardStyles.typography.valueColor,
                      lineHeight: 1.25,
                    }}
                  >
                    {(account[row.field] as string) ?? ''}
                  </Typography>
                </Grid>
              </Grid>
            ))}
          </Box>
        ))}
        {accounts.length === 0 && (
          <Typography
            variant="body2"
            color={theme.palette.text.main}
            textAlign="center"
            paddingX="16px"
            paddingY="1.25rem"
            component="div"
          >
            {noDataMessage}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
