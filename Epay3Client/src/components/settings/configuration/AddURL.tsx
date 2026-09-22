import { useState } from 'react';

import { useIntl } from 'react-intl';
import { useTheme } from '@mui/material/styles';
import { Button, Grid, TextField, Typography } from '@mui/material';
import { useEpayToast } from 'providers/EpayToastProvider';
import {
  EpayModalBody,
  EpayModalFooter,
  EpayModalHeader,
} from 'shared/components/EpayModalLayout';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';

interface inputProps {
  onClose: () => void;
  handleAddURLData: (data: string) => void;
}

//Modal for Add url
export const AddURL = ({ onClose, handleAddURLData }: inputProps) => {
  const intl = useIntl();
  const theme = useTheme();
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });
  const [URL, setURL] = useState('');
  const { showToastMessage } = useEpayToast();
  const closeModal = (): void => {
    onClose();
  };

  const addURL = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (URL === '') {
      showToastMessage('error', f('configuration.theme.add_url_empty'));
      return;
    }

    const urlPattern = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,6}(\/[^\s]*)?$/i;

    if (URL && !urlPattern.test(URL)) {
      showToastMessage('error', f('configuration.theme.URL_Error'));
      return;
    }

    handleAddURLData(URL);
    onClose();
  };

  const handleURLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setURL(e.target.value);
  };

  return (
    <Grid container>
      <Grid item xs={12}>
        <EpayModalHeader heading={f('configuration.theme.header_add_url')} />
      </Grid>

      <Grid item xs={12}>
        <EpayModalBody>
          <Grid
            container
            direction="row"
            alignItems="center"
            marginTop="2rem"
            marginBottom="2rem"
          >
            <Grid item xs={4}>
              <Typography variant="h6">
                {f('configuration.theme.url_match')}
              </Typography>
            </Grid>
            <Grid item lg={8} container direction="row">
              <TextField
                type="text"
                fullWidth
                placeholder={f('configuration.theme.url_match')}
                value={URL}
                onChange={handleURLChange}
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
              />
            </Grid>
          </Grid>
        </EpayModalBody>
      </Grid>
      <Grid item xs={12}>
        <EpayModalFooter>
          <Button variant="outlined" color="secondary" onClick={closeModal}>
            {f('configuration.theme.cancel_button')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={addURL}
            sx={{
              border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
              '&:hover': {
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
              },
            }}
          >
            {f('configuration.theme.add_url_button')}
          </Button>
        </EpayModalFooter>
      </Grid>
    </Grid>
  );
};
