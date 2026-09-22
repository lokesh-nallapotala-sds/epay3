import { Box, Typography } from '@mui/material';
import EpayBox from '../EpayBox';

export interface PaymentReceiptDetailRow {
  label: string;
  value: string;
}

interface PaymentReceiptDetailsCardProps {
  title: string;
  rows: PaymentReceiptDetailRow[];
  printFullWidth?: boolean;
}

export default function PaymentReceiptDetailsCard({
  title,
  rows,
  printFullWidth = false,
}: PaymentReceiptDetailsCardProps) {
  const formatLabel = (label: string) =>
    label.endsWith(':') ? label : `${label}:`;

  return (
    <EpayBox
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        height: '100%',
        boxSizing: 'border-box',
        padding: '0px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...(printFullWidth && {
          '@media print': {
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          },
        }),
      }}
    >
      <Box
        sx={{
          padding: '16px 20px',
          borderBottom: '1px solid',
          borderBottomColor: '#E6E8ED',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Box>

      <Box sx={{ padding: '16px 20px 20px' }}>
        {rows.map((item, index) => (
          <Box
            key={item.label}
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(112px, 42%) minmax(0, 1fr)',
                sm: '165px minmax(0, 1fr)',
              },
              columnGap: '1rem',
              rowGap: '0.35rem',
              alignItems: 'start',
              minWidth: 0,
              marginBottom: index === rows.length - 1 ? 0 : '12px',
            }}
          >
            <Typography variant="body2" sx={{ color: '#8B93A5' }}>
              {formatLabel(item.label)}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#0D0D12',
                minWidth: 0,
                overflowWrap: 'anywhere',
              }}
            >
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </EpayBox>
  );
}
