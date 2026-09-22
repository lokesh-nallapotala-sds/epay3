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

interface AddScreenProps {
  onClose: () => void;
  handleAddScreenData: (name: string, path: string) => void;
}

export const AddScreen = ({ onClose, handleAddScreenData }: AddScreenProps) => {
  const intl = useIntl();
  const theme = useTheme();
  const f = (id: string) => intl.formatMessage({ id, defaultMessage: id });
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const { showToastMessage } = useEpayToast();

  const closeModal = (): void => {
    onClose();
  };

  const addScreen = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (name.trim() === '') {
      showToastMessage('error', f('configuration.help.add_screen_name_empty'));
      return;
    }

    if (path.trim() === '') {
      showToastMessage('error', f('configuration.help.add_screen_route_empty'));
      return;
    }

    if (!path.trim().startsWith('/')) {
      showToastMessage(
        'error',
        f('configuration.help.add_screen_route_invalid'),
      );
      return;
    }

    handleAddScreenData(name.trim(), path.trim());
    onClose();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPath(e.target.value);
  };

  return (
    <Grid container>
      <Grid item xs={12}>
        <EpayModalHeader heading={f('configuration.help.header_add_screen')} />
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
                {f('configuration.help.screen')}
              </Typography>
            </Grid>
            <Grid item lg={8} container direction="row">
              <TextField
                type="text"
                fullWidth
                placeholder={f('configuration.help.screen_name_placeholder')}
                value={name}
                onChange={handleNameChange}
              />
            </Grid>

            <Grid item xs={4}>
              <Typography variant="h6">
                {f('configuration.help.route')}
              </Typography>
            </Grid>
            <Grid item lg={8} container direction="row">
              <TextField
                type="text"
                fullWidth
                placeholder={f('configuration.help.add_screen_placeholder')}
                value={path}
                onChange={handlePathChange}
              />
            </Grid>
          </Grid>
        </EpayModalBody>
      </Grid>
      <Grid item xs={12}>
        <EpayModalFooter>
          <Button variant="outlined" color="secondary" onClick={closeModal}>
            {f('configuration.help.cancel_button')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={addScreen}
            sx={{
              border: `1px solid ${theme.palette.buttonBorder.buttonBorderColor}`,
              '&:hover': {
                border: `1px solid ${theme.palette.buttonBorder.buttonBorderHoverColor}`,
              },
            }}
          >
            {f('configuration.help.add_screen_button')}
          </Button>
        </EpayModalFooter>
      </Grid>
    </Grid>
  );
};
