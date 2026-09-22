import { useEffect, useState } from 'react';

import { useIntl } from 'react-intl';

import { Invoice } from 'types/InvoicesSearchRequest';
import { removeLeadingZeros, toFormattedDateString } from 'utilities/utilities';
import { EpayDocumentType } from 'types/EpayDocumentType';
import {
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import { useEpayToast } from 'providers/EpayToastProvider';
import { useAppSelector } from 'redux/hooks';
import {
  regionalFormatSelector,
  validatedAccountsSelector,
} from 'redux/reducers';
import { InvoiceDetailRequest } from 'types/InvoiceDetailRequest';
import { InvoiceItemData } from 'types/Invoice';
import { EpayInvoicesService } from 'services/EpayInvoicesService';
import { usePayerDetails } from 'providers/PayerDetailsProvider';
import {
  toCurrencyString,
  toCurrencyStringPartsAligned,
} from 'utilities/utilities';
import {
  epayModalTableBodyCellSx,
  epayModalTableContainerSx,
  epayModalTableHeaderCellSx,
  epayModalTableSx,
} from 'shared/components/EpayModalLayout';

type CurrencyAlignedTextProps = {
  currency: string;
  amount: number;
  returnEmptyForNullNumber?: boolean;
  regionalFormat?: string | null;
};

interface InvoiceDetailPageProps {
  invoiceData: Invoice;
  billingDocumentNumber?: string;
}

export default function InvoiceDetailPage(props: InvoiceDetailPageProps) {
  const theme = useTheme();
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });

  //TODO: we should be checking abilities (claims) rather than roles
  //-- but unfortunately the `User` object doesn't currently include these
  const { effectivePayer: payer, payerDetails } = usePayerDetails();
  const regionalFormat = useAppSelector(regionalFormatSelector);
  const validatedAccounts = useAppSelector(validatedAccountsSelector);

  const [invoice, setInvoice] = useState<Invoice>();
  const [payerAddress, setPayerAddress] = useState<any>();
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const getInvoiceDetail = EpayInvoicesService.useGetInvoiceDetails();
  const { showToastMessage } = useEpayToast();
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceItemData[]>([]);
  const [invoiceHeaderData, setinvoiceHeaderData] = useState<any>({
    billingDocumentNumber: removeLeadingZeros(
      props.billingDocumentNumber ?? '',
    ),
    documentDate: '',
    dueDate: '',
    totalAmount: '',
    currencyKey: '',
    customerAddress: {
      region: '',
      city: '',
      postal_code_city: '',
      name: '',
      street: '',
    },
    invoiceRecipientAddress: {
      region: '',
      city: '',
      postal_code_city: '',
      name: '',
      street: '',
    },
    backPage: '/invoices',
    billingDocumentType: '',
    poNumber: '',
    documentStatus: '',
    salesOrganization: '',
    soldtoNumber: '',
    sumTotalAmount: 0,
    openAmount: 0,
    paidAmount: 0,
  });

  const getInvoiceDetails = () => {
    const data = props.invoiceData;
    //NOTE: the billingDocumentType (SAP) is *not* the same as the invoice detail request document type (epay)
    // -- although there should be a 1:1 mapping between these
    // (eg for a regular/main invoice the SAP billing document type is "L2", the epay doc type is "01").
    // bottom line, we can't just use the billing doc type, we'd have to perform a lookup.
    // hard-coding to '01' for now -- this is how it's handled in epay 2.x
    // (except confusingly the hard-coding is done in the .net layer).
    const request: InvoiceDetailRequest = {
      documentType: EpayDocumentType.Invoice, //TODO: look up epay doc type based on SAP billing doc type (see above)
      customerNumber: data?.soldtoNumber,
      documentNumber: data?.billingDocumentNumber ?? '',
      validatedAccounts,
    };

    getInvoiceDetail(request).then(
      (resp) => {
        const tempState = {
          billingDocumentNumber: data.billingDocumentNumber,
          documentDate: '',
          dueDate: '',
          totalAmount: '',
          currencyKey: '',
          customerAddress: {
            region: '',
            city: '',
            postal_code_city: '',
            name: '',
            street: '',
          },
          invoiceRecipientAddress: {
            region: '',
            city: '',
            postal_code_city: '',
            name: '',
            street: '',
          },
          backPage: '/invoices',
          billingDocumentType: '',
          poNumber: '',
          documentStatus: '',
          salesOrganization: '',
          soldtoNumber: '',
          sumTotalAmount: 0,
          openAmount: 0,
          paidAmount: 0,
        };
        if (resp.detail.headerData) {
          tempState.billingDocumentNumber = resp.detail.headerData
            .billingDocumentNumber
            ? resp.detail.headerData.billingDocumentNumber
            : '';
          tempState.billingDocumentType = resp.detail.headerData
            .billingDocumentType
            ? resp.detail.headerData.billingDocumentType
            : '';
          tempState.documentDate = resp.detail.headerData.documentDate
            ? resp.detail.headerData.documentDate
            : '';
          tempState.totalAmount =
            resp.detail.headerData.totalAmount != null
              ? String(resp.detail.headerData.totalAmount)
              : '';
          tempState.currencyKey = resp.detail.headerData.currencyKey
            ? resp.detail.headerData.currencyKey
            : '';
          tempState.documentStatus = resp.detail.headerData.documentStatus
            ? resp.detail.headerData.documentStatus
            : '';
          tempState.salesOrganization = resp.detail.headerData.salesOrganization
            ? resp.detail.headerData.salesOrganization
            : '';
          tempState.soldtoNumber = resp.detail.headerData.soldtoNumber
            ? resp.detail.headerData.soldtoNumber
            : '';
          tempState.openAmount = resp.detail.headerData.openAmount ?? 0;
          tempState.paidAmount = resp.detail.headerData.paidAmount ?? 0;
          tempState.dueDate = resp.detail.headerData.dueDate
            ? resp.detail.headerData.dueDate
            : '';
        }

        if (resp.detail.partnerData) {
          const customer = resp.detail.partnerData.filter(
            (obj) => obj.partnerFunction === 'WE',
          ); //TODO this should be configurable.
          const invoiceRecipient = resp.detail.partnerData.filter(
            (obj) => obj.partnerFunction === 'RG',
          );
          if (customer[0]?.addressData) {
            const addr = customer[0].addressData;
            tempState.customerAddress = {
              region: addr.region ?? '',
              city: addr.city ?? '',
              postal_code_city: addr.postalCodeCity ?? '',
              name: addr.name ?? '',
              street: addr.street ?? '',
            };
          }
          if (invoiceRecipient[0]?.addressData) {
            const addr = invoiceRecipient[0].addressData;
            tempState.invoiceRecipientAddress = {
              region: addr.region ?? '',
              city: addr.city ?? '',
              postal_code_city: addr.postalCodeCity ?? '',
              name: addr.name ?? '',
              street: addr.street ?? '',
            };
          }
        }

        resp?.detail?.itemData?.forEach((amount) => {
          tempState.sumTotalAmount += amount.totalAmount;
        });

        setInvoiceDetail(resp.detail.itemData);
        setinvoiceHeaderData(tempState);

        const total = resp.detail.itemData.reduce((amount, item) => {
          return amount + item.totalAmount;
        }, 0);
        setAmountToPay(total);
      },
      (error) => {
        showToastMessage('error', error.message || error);
      },
    );
  };

  useEffect(() => {
    setInvoice(props.invoiceData);
    setPayerAddress(payerDetails?.['addressData']);
    getInvoiceDetails();
  }, []);

  const CurrencyAlignedText = ({
    currency,
    amount,
    returnEmptyForNullNumber = false,
    regionalFormat: format,
  }: CurrencyAlignedTextProps) => {
    const { symbol, value } = toCurrencyStringPartsAligned(
      currency,
      amount,
      returnEmptyForNullNumber,
      format,
    );

    return (
      <Grid
        container
        sx={{
          minWidth: '120px', // Adjust as needed to match the "Total" column
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Grid item>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {symbol}
          </Typography>
        </Grid>
        <Grid item sx={{ marginRight: '25px' }}>
          {' '}
          {/* <-- Right margin here */}
          <Typography variant="h5" sx={{ fontWeight: 600, textAlign: 'right' }}>
            {value}
          </Typography>
        </Grid>
      </Grid>
    );
  };

  return (
    <Grid
      container
      sm={12}
      md={12}
      lg={12}
      sx={{ color: theme.palette.text.primary }}
    >
      <Grid
        item
        container
        sx={{ padding: '15px 0' }}
        sm={12}
        md={12}
        lg={12}
        spacing={2}
      >
        <Grid container item direction={'column'} spacing={1}>
          <Grid item>
            <Typography
              variant="textHeader"
              sx={{ color: theme.palette.text.primary }}
            >
              {f('invoice.detail.label.invoiceid')}
            </Typography>
          </Grid>
          <Grid item>
            <Typography variant="fieldValue" sx={{ letter: '2%' }}>
              {removeLeadingZeros(invoiceHeaderData.billingDocumentNumber)}
            </Typography>
          </Grid>
        </Grid>
        <Grid
          item
          container
          direction={'row'}
          spacing={4}
          sm={12}
          md={12}
          lg={12}
        >
          <Grid
            container
            item
            direction={'column'}
            xs={6}
            sm={6}
            md={6}
            lg={6}
            spacing={1}
          >
            <Grid item>
              <Typography
                variant="textHeader"
                sx={{ color: theme.palette.text.primary }}
              >
                {f('invoice.detail.label.date')}
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="fieldValue" sx={{ letter: '2%' }}>
                {invoice?.documentDate
                  ? toFormattedDateString(invoice.documentDate, regionalFormat)
                  : ''}
              </Typography>
            </Grid>
          </Grid>
          <Grid
            container
            item
            xs={6}
            sm={6}
            md={6}
            lg={6}
            direction={'column'}
            spacing={1}
          >
            <Grid item>
              <Typography
                variant="textHeader"
                sx={{ color: theme.palette.text.primary }}
              >
                {f('invoice.detail.label.due_date')}
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="fieldValue" sx={{ letter: '2%' }}>
                {invoiceHeaderData.dueDate
                  ? toFormattedDateString(
                      invoiceHeaderData.dueDate,
                      regionalFormat,
                    )
                  : ''}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid
          item
          container
          direction={'row'}
          spacing={4}
          sm={12}
          md={12}
          lg={12}
        >
          <Grid
            container
            item
            direction={'column'}
            xs={6}
            sm={6}
            md={6}
            lg={6}
            spacing={1}
          >
            <Grid item>
              <Typography
                variant="textHeader"
                sx={{ color: theme.palette.text.primary }}
              >
                {f('invoice.detail.label.customer')}
              </Typography>
            </Grid>
            <Grid item container flexDirection="column">
              <Typography variant="fieldValue">
                {removeLeadingZeros(invoiceHeaderData.soldtoNumber)}
              </Typography>
              <Typography variant="fieldValue">
                {invoiceHeaderData.customerAddress.name}
              </Typography>
              <Typography variant="fieldValue">
                {invoiceHeaderData.customerAddress.street}
              </Typography>
              <Typography variant="fieldValue">
                {invoiceHeaderData.customerAddress.customerCity}
              </Typography>
              <Typography variant="fieldValue">
                {invoiceHeaderData.customerAddress.customerRegion}
              </Typography>
              <Typography variant="fieldValue">
                {invoiceHeaderData.customerAddress.customerPostalCode}
              </Typography>
            </Grid>
          </Grid>
          <Grid
            container
            item
            xs={6}
            sm={6}
            md={6}
            lg={6}
            direction={'column'}
            spacing={1}
          >
            <Grid item>
              <Typography
                variant="textHeader"
                sx={{ color: theme.palette.text.primary }}
              >
                {f('invoice.detail.label.payer')}
              </Typography>
            </Grid>
            <Grid item container flexDirection="column">
              <Typography variant="fieldValue">
                {removeLeadingZeros(payer)}
              </Typography>
              <Typography variant="fieldValue">
                {payerAddress?.name ?? ''}
              </Typography>
              <Typography variant="fieldValue">
                {payerAddress?.street ?? ''}
              </Typography>
              <Typography variant="fieldValue">
                {payerAddress?.city ?? ''}
              </Typography>
              {/* <Typography variant="fieldValue">
                {payerAddress?.region ?? ''}
              </Typography> */}
              <Typography variant="fieldValue">
                {payerAddress?.country ?? ''}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Box
        sx={{
          ...epayModalTableContainerSx,
          width: { xs: 'auto', sm: '100%' },
          overflowX: 'auto',
          overflowY: 'hidden',
          marginBottom: '24px',
        }}
      >
        <TableContainer
          sx={{
            width: { xs: '500px', sm: '100%' },
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          <Table size="small" stickyHeader sx={epayModalTableSx}>
            <TableHead
              sx={{
                '& .MuiTableCell-head': {
                  borderBottom: (theme) =>
                    `1px solid ${theme.mixins.border.color}`,
                },
              }}
            >
              <TableRow>
                <TableCell
                  sx={{
                    width: '8%',
                    borderBottom: (theme) =>
                      `1px solid ${theme.mixins.border.color} !important`,
                  }}
                >
                  <Typography variant="body2" sx={epayModalTableHeaderCellSx}>
                    {f('invoice.detail.grid.headers.item')}
                  </Typography>
                </TableCell>
                <TableCell
                  sx={{
                    width: '14%',
                    borderBottom: (theme) =>
                      `1px solid ${theme.mixins.border.color} !important`,
                  }}
                >
                  <Typography variant="body2" sx={epayModalTableHeaderCellSx}>
                    {f('invoice.detail.grid.headers.qty')}
                  </Typography>
                </TableCell>
                <TableCell
                  sx={{
                    width: '18%',
                    borderBottom: (theme) =>
                      `1px solid ${theme.mixins.border.color} !important`,
                  }}
                >
                  <Typography variant="body2" sx={epayModalTableHeaderCellSx}>
                    {f('invoice.detail.grid.headers.article_num')}
                  </Typography>
                </TableCell>
                <TableCell
                  sx={{
                    width: '30%',
                    borderBottom: (theme) =>
                      `1px solid ${theme.mixins.border.color} !important`,
                  }}
                >
                  <Typography variant="body2" sx={epayModalTableHeaderCellSx}>
                    {f('invoice.detail.grid.headers.description')}
                  </Typography>
                </TableCell>
                <TableCell
                  sx={{
                    width: '15%',
                    borderBottom: (theme) =>
                      `1px solid ${theme.mixins.border.color} !important`,
                  }}
                >
                  <Typography variant="body2" sx={epayModalTableHeaderCellSx}>
                    {f('invoice.detail.grid.headers.unit_price')}
                  </Typography>
                </TableCell>
                <TableCell
                  sx={{
                    width: '15%',
                    borderBottom: (theme) =>
                      `1px solid ${theme.mixins.border.color} !important`,
                  }}
                >
                  <Typography variant="body2" sx={epayModalTableHeaderCellSx}>
                    {f('invoice.detail.grid.headers.total')}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoiceDetail.map((detail) => (
                <ItemData
                  key={detail.itemNumber}
                  detail={detail}
                  regionalFormat={regionalFormat}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Grid
        item
        container
        sx={{
          color: theme.palette.text.primary,
          fontSize: '14px',
          marginBottom: '24px',
        }}
        lg={12}
      >
        <Grid
          item
          container
          direction="column"
          spacing={1}
          alignItems="flex-end"
        >
          <Grid
            container
            item
            spacing={1}
            sx={{ marginLeft: '16px' }}
            justifyContent="flex-end"
            alignItems="center"
          >
            <Grid item>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 500,
                  textAlign: 'right',
                  color: theme.palette.text.primary,
                }}
              >
                {f('invoice.detail.invoice_total')}
              </Typography>
            </Grid>
            <Grid item sx={{ minWidth: '120px' }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  textAlign: 'left',
                }}
              >
                <Grid item sx={{ minWidth: '90px' }}>
                  <CurrencyAlignedText
                    currency={invoice?.currencyKey ?? 'USD'}
                    amount={amountToPay}
                    returnEmptyForNullNumber={true}
                    regionalFormat={regionalFormat}
                  />
                </Grid>
              </Typography>
            </Grid>
          </Grid>

          {/* Paid Amount */}
          {invoiceHeaderData.paidAmount != null &&
            invoiceHeaderData.paidAmount !== 0 && (
              <Grid
                container
                item
                spacing={1}
                justifyContent="flex-end"
                alignItems="center"
              >
                <Grid item>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 500,
                      textAlign: 'right',
                      color: theme.palette.text.primary,
                    }}
                  >
                    {f('invoice.detail.invoice_paid')}
                  </Typography>
                </Grid>
                <Grid item sx={{ minWidth: '120px' }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      textAlign: 'left',
                    }}
                  >
                    <Grid item sx={{ minWidth: '120px' }}>
                      <CurrencyAlignedText
                        currency={invoice?.currencyKey ?? 'USD'}
                        amount={invoiceHeaderData.paidAmount}
                        returnEmptyForNullNumber={true}
                        regionalFormat={regionalFormat}
                      />
                    </Grid>
                  </Typography>
                </Grid>
              </Grid>
            )}

          {/* Open Amount */}
          {invoiceHeaderData.openAmount != null &&
            invoiceHeaderData.openAmount !== 0 && (
              <Grid
                container
                item
                spacing={1}
                justifyContent="flex-end"
                alignItems="center"
              >
                <Grid item>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 500,
                      textAlign: 'right',
                      color: theme.palette.text.primary,
                    }}
                  >
                    {f('invoice.detail.invoice_open')}
                  </Typography>
                </Grid>
                <Grid item sx={{ minWidth: '120px' }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      textAlign: 'left',
                    }}
                  >
                    <Grid item sx={{ minWidth: '120px' }}>
                      <CurrencyAlignedText
                        currency={invoice?.currencyKey ?? 'USD'}
                        amount={invoiceHeaderData.openAmount}
                        returnEmptyForNullNumber={true}
                        regionalFormat={regionalFormat}
                      />
                    </Grid>
                  </Typography>
                </Grid>
              </Grid>
            )}
        </Grid>
      </Grid>
    </Grid>
  );
}

function ItemData({
  detail,
  regionalFormat,
}: {
  detail: InvoiceItemData;
  regionalFormat?: string | null;
}) {
  return (
    <TableRow>
      <TableCell>
        <Typography variant="fieldValue" sx={epayModalTableBodyCellSx}>
          {detail.itemNumber}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="fieldValue" sx={epayModalTableBodyCellSx}>
          {detail.billedQuantity || ''}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="fieldValue" sx={epayModalTableBodyCellSx}>
          {removeLeadingZeros(detail.materialNumber) || ''}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography
          variant="fieldValue"
          sx={{
            ...epayModalTableBodyCellSx,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}
        >
          {detail.description || ''}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="fieldValue" sx={epayModalTableBodyCellSx}>
          {toCurrencyString(
            detail?.currencyKey ?? '',
            detail?.totalAmount / detail?.billedQuantity,
            false,
            regionalFormat,
          )}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="fieldValue" sx={epayModalTableBodyCellSx}>
          {toCurrencyString(
            detail.currencyKey ?? '',
            detail.totalAmount,
            true,
            regionalFormat,
          )}
        </Typography>
      </TableCell>
    </TableRow>
  );
}
