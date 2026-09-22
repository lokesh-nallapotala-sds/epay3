import { Box, Typography } from '@mui/material';

interface BannerContentProps {
  text1?: string;
  text2?: string;
  bannerColor?: string;
}

const BannerContent = ({
  text1,
  text2,
  bannerColor = '#001644',
}: BannerContentProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        backgroundColor: bannerColor || '#001644',
      }}
    >
      <Box sx={{ color: 'white', padding: '20px' }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 'bold',
            marginBottom: 2,
          }}
        >
          {text1 || "Let's empower your customers today."}
        </Typography>
        <Typography variant="body2">
          {text2 ||
            'With ChronarPay, you can view and pay your invoices conveniently from anywhere.'}
        </Typography>
      </Box>
    </Box>
  );
};

export default BannerContent;
