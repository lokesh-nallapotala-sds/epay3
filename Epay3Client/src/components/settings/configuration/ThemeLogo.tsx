import { useEffect, useState } from 'react';

import { Box } from '@mui/system';
import {
  Alert,
  Button,
  Card,
  CardMedia,
  Grid,
  Typography,
} from '@mui/material';

import { useTheme } from '@mui/material/styles';
import { getCsrfHeaders } from 'utilities/csrf';
import { useFormat } from 'hooks/useFormat';

interface ThemeLogoProps {
  logo: string | null;
  handleLogoDataChange: (base64: string) => void;
}

const ThemeLogo = (props: ThemeLogoProps) => {
  const [logo, setLogo] = useState<string | null>(props.logo);
  const [logoError, setLogoError] = useState<string | null>(null);
  const f = useFormat();
  const theme = useTheme();
  const handleLogoChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const isPng =
        file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
      if (!isPng) {
        setLogoError('Only PNG files are allowed.');
        setTimeout(() => {
          setLogoError('');
        }, 5000);
        event.currentTarget.value = '';
        return;
      }
      if (file.size > 51200) {
        setLogoError(f('configuration.theme.filesize.error'));
        setTimeout(() => {
          setLogoError('');
        }, 5000);
        event.currentTarget.value = '';
        return;
      }
    }
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Replace with your API endpoint for file upload
      const response = await fetch('/api/Config/upload', {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...(await getCsrfHeaders()),
          'Accept-Language': localStorage.getItem('language') ?? 'en',
          'X-Country': localStorage.getItem('country') ?? 'us',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const { url } = await response.json(); // Assume the server returns a public URL
      setLogo(url); // Set the image URL returned from the server
      const base64String = await convertFileToBase64(file);
      props.handleLogoDataChange(base64String);
      setLogoError(null);
      return;
    } catch {
      setLogoError('Error uploading image.');
    }
    return;
  };
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };
  useEffect(() => {
    setLogo(props.logo);
  }, [props.logo]);
  return (
    <>
      <Grid container direction="row" alignItems="center">
        <Grid
          item
          xs={12}
          container
          direction="row"
          alignItems="flex-start"
          marginBottom="0.5rem"
        >
          <Grid item xs={8}>
            <Box
              sx={{
                display: 'inline-block',
                verticalAlign: 'top',
              }}
            >
              <Card
                sx={{
                  height: '100%',
                  width: 'fit-content',
                  minHeight: '7rem',
                  minWidth: '7rem',
                  border: !logo
                    ? `2px solid ${theme.palette.error.main}`
                    : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {logo && (
                  <CardMedia
                    component="img"
                    image={logo}
                    alt={f('configuration.theme.logo.alt')}
                    sx={{
                      width: 'auto',
                      height: '7rem',
                      // objectFit: 'contain',
                    }}
                  />
                )}
              </Card>
              {!logo && (
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.error.main,
                    mt: '0.25rem',
                    display: 'block',
                  }}
                >
                  {f('configuration.theme.logo_required')}
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Grid
              container
              direction="column"
              alignItems="flex-end"
              justifyContent="center"
              rowGap="1rem"
              sx={{ minHeight: '7rem' }}
            >
              <Grid item>
                <Button
                  variant="contained"
                  size="small"
                  component="label"
                  sx={{
                    minWidth: '11rem',
                    border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
                    '&:hover': {
                      border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
                    },
                  }}
                >
                  {f('configuration.theme.upload_logo')}
                  <input
                    type="file"
                    accept="image/png,.png"
                    hidden
                    onChange={handleLogoChange}
                  />
                </Button>
              </Grid>
              {logoError && (
                <Grid item sx={{ width: '100%' }}>
                  <Alert
                    severity="error"
                    sx={{
                      width: '100%',
                      boxSizing: 'border-box',
                      '& .MuiAlert-message': {
                        whiteSpace: 'normal',
                        overflowWrap: 'break-word',
                      },
                    }}
                  >
                    {logoError}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Grid item xs={8}>
            <Typography variant="subheader">
              {f('configuration.theme.logo_info')}
            </Typography>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default ThemeLogo;
