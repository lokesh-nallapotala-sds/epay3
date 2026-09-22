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
import { normalizeApplicationLinkUrl } from 'utilities/applicationLinks';
import { urlRegex } from './urlRegex';

interface AddApplicationLinkProps {
  onClose: () => void;
  onAddLink: (label: string, url: string) => void;
}

export const AddApplicationLink = ({
  onClose,
  onAddLink,
}: AddApplicationLinkProps) => {
  const intl = useIntl();
  const theme = useTheme();
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const { showToastMessage } = useEpayToast();

  const addLink = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (label.trim() === '') {
      showToastMessage('error', f('configuration.application.link.required'));
      return;
    }

    if (url.trim() === '') {
      showToastMessage('error', f('configuration.application.url.required'));
      return;
    }

    const normalizedUrl = normalizeApplicationLinkUrl(url.trim());

    if (!normalizedUrl || !urlRegex.test(normalizedUrl)) {
      showToastMessage('error', f('configuration.application.url.invalid'));
      return;
    }

    onAddLink(label.trim(), normalizedUrl);
    onClose();
  };

  return (
    <Grid container>
      <Grid item xs={12}>
        <EpayModalHeader
          heading={f('configuration.application.add_link_title')}
        />
      </Grid>

      <Grid item xs={12}>
        <EpayModalBody>
          <Grid
            container
            direction="row"
            alignItems="center"
            marginTop="2rem"
            rowGap="1.5rem"
          >
            <Grid item xs={4}>
              <Typography variant="h6">
                {f('configuration.help.text_link')}
              </Typography>
            </Grid>
            <Grid item lg={8} container direction="row">
              <TextField
                type="text"
                fullWidth
                placeholder={f('configuration.help.text_link')}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                sx={(muiTheme) => ({
                  ...getCompactFilterFieldSx(muiTheme),
                })}
              />
            </Grid>

            <Grid item xs={4}>
              <Typography variant="h6">
                {f('configuration.system_maintenance_URL')}
              </Typography>
            </Grid>
            <Grid item lg={8} container direction="row">
              <TextField
                type="text"
                fullWidth
                placeholder={f('configuration.system_maintenance_URL')}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
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
          <Button variant="outlined" color="secondary" onClick={onClose}>
            {f('app.common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={addLink}
            sx={{
              border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
              '&:hover': {
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
              },
            }}
          >
            {f('configuration.application.add_link_button')}
          </Button>
        </EpayModalFooter>
      </Grid>
    </Grid>
  );
};
