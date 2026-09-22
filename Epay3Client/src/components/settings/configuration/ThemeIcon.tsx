import { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { getCsrfHeaders } from 'utilities/csrf';
import { Box } from '@mui/system';
import { useFormat } from 'hooks/useFormat';
import {
  Alert,
  Button,
  Card,
  CardMedia,
  Grid,
  Typography,
} from '@mui/material';

interface ThemeIconProps {
  icon: string | null;
  handleIconDataChange: (base64: string) => void;
}

const ThemeIcon = (props: ThemeIconProps) => {
  const [icon, setIcon] = useState<string | null>(props.icon);
  const [iconerror, setIconError] = useState<string | null>(null);
  const f = useFormat();
  const theme = useTheme();
  const handleIconChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'image/x-icon') {
        setIconError(f('configuration.theme.onlyico.error'));
        setTimeout(() => {
          setIconError(''); // Clear the error after 5 seconds
        }, 5000);
        return;
      }
      if (file.size > 51200) {
        setIconError(f('configuration.theme.filesize.error'));
        setTimeout(() => {
          setIconError(''); // Clear the error after 5 seconds
        }, 5000);
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

      const { url } = await response.json();
      setIcon(url);

      const base64String = await convertFileToBase64(file);
      props.handleIconDataChange(base64String);
      setIconError(null);
      return;
    } catch {
      setIconError('Error uploading image.');
    }
    return;
  };
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
      return;
    });
  };
  useEffect(() => {
    setIcon(props.icon);
  }, [props.icon]);
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
            <Box>
              <Card
                sx={{
                  height: 'fit-content',
                  width: 'fit-content',
                  minHeight: '4rem',
                  minWidth: '4rem',
                  borderRadius: '5px',
                  border: !icon
                    ? `2px solid ${theme.palette.error.main}`
                    : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {icon && (
                  <CardMedia
                    component="img"
                    image={icon}
                    alt={f('configuration.theme.icon.alt')}
                    sx={{ width: '4rem' }}
                  />
                )}
              </Card>
              {!icon && (
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.error.main,
                    mt: '0.25rem',
                    display: 'block',
                  }}
                >
                  {f('configuration.theme.icon_required')}
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
              sx={{ minHeight: '4rem' }}
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
                  {f('configuration.theme.upload_icon')}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleIconChange}
                  />
                </Button>
              </Grid>
              {iconerror && (
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
                    {iconerror}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Grid item xs={8}>
            <Typography variant="subheader">
              {f('configuration.theme.icon_info')}
            </Typography>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default ThemeIcon;
