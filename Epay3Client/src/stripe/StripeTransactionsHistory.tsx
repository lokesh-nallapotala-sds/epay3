import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReceiptIcon from '@mui/icons-material/Receipt';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';

export interface StripeTransactionItem {
  id: string;
  status: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  amountFormatted: string;
  paymentMethod: string;
  description: string;
  customer: string;
  createdDisplay: string;
  refundedDate: string;
  declineReason: string;
  receiptUrl: string;
}

export interface StripeTransactionsHistoryHandle {
  fetchData: () => Promise<void>;
}

export interface StripeTransactionsHistoryProps {
  accountId?: string;
  customerId?: string;
}

const StripeTransactionsHistory = forwardRef<
  StripeTransactionsHistoryHandle,
  StripeTransactionsHistoryProps
>(function StripeTransactionsHistory({ accountId, customerId }, ref) {
  const [transactions, setTransactions] = useState<StripeTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let resolvedCustomerId = customerId;

      // Resolve Stripe customer ID if accountId is passed from the top-most account selector
      if (accountId && !resolvedCustomerId) {
        try {
          const custRes = await fetch(
            `/api/stripe/customer-payment-methods/${encodeURIComponent(accountId)}`,
            { credentials: 'include' },
          );
          if (custRes.ok) {
            const custData = await custRes.json();
            const cid =
              custData?.customer?.id ||
              custData?.customerId ||
              (typeof custData?.customer === 'string' ? custData.customer : null);
            if (cid && typeof cid === 'string' && cid.startsWith('cus_')) {
              resolvedCustomerId = cid;
            }
          }
        } catch (custErr) {
          console.warn('Could not resolve Stripe customer for account:', custErr);
        }
      }

      // Build query URL based on resolved Stripe Customer ID or Salesforce Account ID
      let url = '/api/stripe/charges?limit=100';
      if (resolvedCustomerId && resolvedCustomerId.startsWith('cus_')) {
        url += `&customerId=${encodeURIComponent(resolvedCustomerId)}`;
      } else if (accountId) {
        url += `&accountId=${encodeURIComponent(accountId)}`;
      }

      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`Failed to load transactions (Status: ${res.status})`);
      }

      const raw = await res.json();
      const data = raw?.data || [];

      const parsed: StripeTransactionItem[] = data.map((tx: any) => {
        const amountVal = tx.amount != null ? tx.amount / 100 : 0;
        const created = tx.created ? new Date(tx.created * 1000) : null;

        // Payment method display
        let pmDisplay = '-';
        const pmd = tx.paymentMethodDetails || tx.payment_method_details;
        if (pmd?.card) {
          const card = pmd.card;
          const brand = card.brand
            ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1)
            : 'Card';
          pmDisplay = `${brand} ${card.last4 ? '•••• ' + card.last4 : ''}`;
        } else if (pmd?.usBankAccount || pmd?.us_bank_account) {
          const bank = pmd.usBankAccount || pmd.us_bank_account;
          pmDisplay = `${bank.bankName || bank.bank_name || 'Bank'} ${bank.last4 ? '•••• ' + bank.last4 : ''}`;
        } else if (pmd?.type) {
          pmDisplay = pmd.type.charAt(0).toUpperCase() + pmd.type.slice(1);
        } else if (tx.source?.brand) {
          const brand =
            tx.source.brand.charAt(0).toUpperCase() + tx.source.brand.slice(1);
          pmDisplay = `${brand} ${tx.source.last4 ? '•••• ' + tx.source.last4 : ''}`;
        }

        // Customer display
        let custDisplay = '-';
        const bd = tx.billingDetails || tx.billing_details;
        if (bd?.name) {
          custDisplay = bd.name;
        } else if (bd?.email) {
          custDisplay = bd.email;
        } else if (tx.receiptEmail || tx.receipt_email) {
          custDisplay = tx.receiptEmail || tx.receipt_email;
        } else if (tx.customer) {
          custDisplay =
            typeof tx.customer === 'string' ? tx.customer : tx.customer.id;
        }

        // Created date
        const createdDisplay = created
          ? created.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          : '-';

        // Refund date
        let refundedDateDisplay = '-';
        const refundsList = tx.refunds?.data || [];
        if (refundsList.length > 0) {
          const refDate = refundsList[0].created
            ? new Date(refundsList[0].created * 1000)
            : null;
          refundedDateDisplay = refDate
            ? refDate.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
            : 'Refunded';
        } else if (tx.refunded) {
          refundedDateDisplay = 'Refunded';
        }

        // Decline reason
        let declineReasonDisplay = '-';
        if (tx.failureMessage || tx.failure_message) {
          declineReasonDisplay = tx.failureMessage || tx.failure_message;
        } else if (
          tx.outcome?.sellerMessage ||
          tx.outcome?.seller_message ||
          tx.outcome?.reason
        ) {
          declineReasonDisplay =
            tx.outcome?.sellerMessage ||
            tx.outcome?.seller_message ||
            tx.outcome?.reason;
        } else if (tx.status === 'failed') {
          declineReasonDisplay = 'Declined';
        }

        const currencyStr = (tx.currency || 'usd').toUpperCase();
        const currencySymbol =
          currencyStr === 'USD'
            ? '$'
            : currencyStr === 'EUR'
              ? '€'
              : currencyStr === 'GBP'
                ? '£'
                : `${currencyStr} `;

        const statusVal = tx.status || (tx.paid ? 'succeeded' : 'failed');

        return {
          id: tx.id,
          status: statusVal,
          amount: amountVal,
          currency: currencyStr,
          currencySymbol,
          amountFormatted: `${currencySymbol}${amountVal.toFixed(2)}`,
          paymentMethod: pmDisplay,
          description:
            tx.description ||
            tx.statementDescriptor ||
            tx.statement_descriptor ||
            '-',
          customer: custDisplay,
          createdDisplay,
          refundedDate: refundedDateDisplay,
          declineReason: declineReasonDisplay,
          receiptUrl: tx.receiptUrl || tx.receipt_url || '',
        };
      });

      setTransactions(parsed);
      setPage(1);
    } catch (err: any) {
      console.error('Failed to fetch Stripe charges:', err);
      setErrorMessage(err.message || 'Could not load Stripe charges.');
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, customerId]);

  useImperativeHandle(ref, () => ({
    fetchData: fetchTransactions,
  }));

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filtered = transactions.filter((tx) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      tx.id.toLowerCase().includes(term) ||
      tx.description.toLowerCase().includes(term) ||
      tx.customer.toLowerCase().includes(term) ||
      tx.paymentMethod.toLowerCase().includes(term) ||
      tx.status.toLowerCase().includes(term)
    );
  });

  const pageCount = Math.ceil(filtered.length / pageSize) || 1;
  const pagedTransactions = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const renderStatusChip = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'paid':
        return (
          <Chip
            size="small"
            label="Succeeded"
            color="success"
            sx={{ fontWeight: 600 }}
          />
        );
      case 'failed':
        return (
          <Chip
            size="small"
            label="Declined"
            color="error"
            sx={{ fontWeight: 600 }}
          />
        );
      case 'refunded':
        return (
          <Chip
            size="small"
            label="Refunded"
            color="info"
            sx={{ fontWeight: 600 }}
          />
        );
      default:
        return (
          <Chip
            size="small"
            label={status}
            color="default"
            sx={{ fontWeight: 600 }}
          />
        );
    }
  };

  return (
    <Card elevation={1} sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header bar */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            gap: 2,
          }}
        >
          <div>
            <Typography variant="h6" fontWeight={700}>
              Transaction History
            </Typography>
            {/* <Typography variant="body2" color="text.secondary">
              ChronarPay Stripe charges and settlement history
            </Typography> */}
          </div>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              InputProps={{
                startAdornment: (
                  <SearchIcon
                    fontSize="small"
                    sx={{ mr: 1, color: 'text.secondary' }}
                  />
                ),
              }}
              sx={{ minWidth: 220 }}
            />
            <IconButton
              onClick={fetchTransactions}
              title="Refresh"
              color="primary"
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {errorMessage && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            onClose={() => setErrorMessage(null)}
          >
            {errorMessage}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={36} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <ReceiptIcon
              sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}
            />
            <Typography variant="body1" color="text.secondary">
              No transactions found.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}
            >
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>
                      Description
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      Payment Method
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    {/* <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell> */}
                    <TableCell sx={{ fontWeight: 700 }}>
                      Decline Reason
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      Receipt
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedTransactions.map((tx) => (
                    <TableRow key={tx.id} hover>
                      <TableCell
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Tooltip title={tx.description}>
                          <span>{tx.description}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {tx.amountFormatted} {tx.currency}
                      </TableCell>
                      <TableCell>{tx.createdDisplay}</TableCell>
                      <TableCell>{tx.paymentMethod}</TableCell>
                      <TableCell>{renderStatusChip(tx.status)}</TableCell>
                      {/* <TableCell>{tx.customer}</TableCell> */}
                      <TableCell
                        sx={{
                          color:
                            tx.declineReason !== '-'
                              ? 'error.main'
                              : 'text.secondary',
                        }}
                      >
                        {tx.declineReason}
                      </TableCell>
                      <TableCell align="center">
                        {tx.receiptUrl ? (
                          <IconButton
                            size="small"
                            color="primary"
                            component="a"
                            href={tx.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Stripe Receipt"
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            -
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {pageCount > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_, val) => setPage(val)}
                  color="primary"
                  shape="rounded"
                />
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

export default StripeTransactionsHistory;
